import { createSqlClient } from "@revflow/db";
import type { AddContractLineItemInput, CreateContractInput } from "@revflow/shared";

import { getRequiredWorkspaceId } from "../../lib/request-context.js";

type DateLike = Date | string;

type ContractRow = {
  id: string;
  customer_id: string;
  status: "draft" | "active";
  start_date: DateLike;
  end_date: DateLike | null;
  created_at: Date;
  updated_at: Date;
};

type ContractSummaryRow = ContractRow & {
  customer_name: string | null;
  line_item_count: string | number;
};

type ContractVersionRow = {
  id: string;
  contract_id: string;
  version_number: number;
  effective_from: DateLike;
  effective_to: DateLike | null;
  terms_snapshot: Record<string, unknown>;
  created_at: Date;
};

type ContractLineItemRow = {
  id: string;
  contract_version_id: string;
  price_rule_id: string;
  name: string;
  override_config: Record<string, unknown>;
  created_at: Date;
};

type ContractDetailRow = ContractRow & {
  customer_name: string | null;
};

function formatDate(value: DateLike) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function toContract(row: ContractRow) {
  return {
    id: row.id,
    customerId: row.customer_id,
    status: row.status,
    startDate: formatDate(row.start_date),
    endDate: row.end_date ? formatDate(row.end_date) : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function toContractSummary(row: ContractSummaryRow) {
  return {
    ...toContract(row),
    customerName: row.customer_name,
    lineItemCount: Number(row.line_item_count)
  };
}

function toContractVersion(row: ContractVersionRow) {
  return {
    id: row.id,
    contractId: row.contract_id,
    versionNumber: row.version_number,
    effectiveFrom: formatDate(row.effective_from),
    effectiveTo: row.effective_to ? formatDate(row.effective_to) : null,
    termsSnapshot: row.terms_snapshot,
    createdAt: row.created_at.toISOString()
  };
}

function toContractLineItem(row: ContractLineItemRow) {
  return {
    id: row.id,
    contractVersionId: row.contract_version_id,
    priceRuleId: row.price_rule_id,
    name: row.name,
    overrideConfig: row.override_config,
    createdAt: row.created_at.toISOString()
  };
}

export async function listContracts() {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();

  try {
    const rows = await sql<ContractSummaryRow[]>`
      select
        c.id,
        c.customer_id,
        c.status,
        c.start_date,
        c.end_date,
        c.created_at,
        c.updated_at,
        cu.name as customer_name,
        count(cli.id) as line_item_count
      from contracts c
      join customers cu on cu.id = c.customer_id
      left join contract_versions cv on cv.contract_id = c.id and cv.version_number = 1
      left join contract_line_items cli on cli.contract_version_id = cv.id
      where c.workspace_id = ${workspaceId}
      group by c.id, cu.name
      order by c.created_at desc
    `;

    return rows.map(toContractSummary);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function getContractById(id: string) {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();

  try {
    const contractRows = await sql<ContractDetailRow[]>`
      select
        c.id,
        c.customer_id,
        c.status,
        c.start_date,
        c.end_date,
        c.created_at,
        c.updated_at,
        cu.name as customer_name
      from contracts c
      join customers cu on cu.id = c.customer_id
      where c.workspace_id = ${workspaceId}
        and c.id = ${id}
      limit 1
    `;
    const contract = contractRows[0];

    if (!contract) {
      return null;
    }

    const versionRows = await sql<ContractVersionRow[]>`
      select id, contract_id, version_number, effective_from, effective_to, terms_snapshot, created_at
      from contract_versions
      where workspace_id = ${workspaceId}
        and contract_id = ${id}
      order by version_number desc
      limit 1
    `;
    const version = versionRows[0] ? toContractVersion(versionRows[0]) : null;

    const lineItemRows = version
      ? await sql<ContractLineItemRow[]>`
          select id, contract_version_id, price_rule_id, name, override_config, created_at
          from contract_line_items
          where workspace_id = ${workspaceId}
            and contract_version_id = ${version.id}
          order by created_at asc
        `
      : [];

    return {
      ...toContract(contract),
      customerName: contract.customer_name,
      currentVersion: version,
      lineItems: lineItemRows.map(toContractLineItem)
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function createContract(input: CreateContractInput) {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();

  try {
    return await sql.begin(async (tx) => {
      const contractRows = await tx<ContractRow[]>`
        insert into contracts (workspace_id, customer_id, status, start_date, end_date)
        values (${workspaceId}, ${input.customerId}, 'draft', ${input.startDate}, ${input.endDate ?? null})
        returning id, customer_id, status, start_date, end_date, created_at, updated_at
      `;
      const contract = contractRows[0];

      if (!contract) {
        throw new Error("Contract insert did not return a row");
      }

      const versionRows = await tx<ContractVersionRow[]>`
        insert into contract_versions (workspace_id, contract_id, version_number, effective_from, effective_to, terms_snapshot)
        values (${workspaceId}, ${contract.id}, 1, ${input.startDate}, ${input.endDate ?? null}, ${tx.json({ status: "draft" } as never)})
        returning id, contract_id, version_number, effective_from, effective_to, terms_snapshot, created_at
      `;
      const version = versionRows[0];

      if (!version) {
        throw new Error("Contract version insert did not return a row");
      }

      return {
        ...toContract(contract),
        customerName: null,
        currentVersion: toContractVersion(version),
        lineItems: []
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function addContractLineItem(contractId: string, input: AddContractLineItemInput) {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();

  try {
    return await sql.begin(async (tx) => {
      const contractRows = await tx<Pick<ContractRow, "status">[]>`
        select status
        from contracts
        where workspace_id = ${workspaceId}
          and id = ${contractId}
        limit 1
      `;
      const contract = contractRows[0];

      if (!contract) {
        return null;
      }

      if (contract.status !== "draft") {
        return "CONTRACT_NOT_DRAFT" as const;
      }

      const versionRows = await tx<Pick<ContractVersionRow, "id">[]>`
        select id
        from contract_versions
        where workspace_id = ${workspaceId}
          and contract_id = ${contractId}
        order by version_number desc
        limit 1
      `;
      const version = versionRows[0];

      if (!version) {
        throw new Error("Draft contract does not have a version");
      }

      const lineItemRows = await tx<ContractLineItemRow[]>`
        insert into contract_line_items (workspace_id, contract_version_id, price_rule_id, name, override_config)
        values (${workspaceId}, ${version.id}, ${input.priceRuleId}, ${input.name}, ${tx.json((input.overrideConfig ?? {}) as never)})
        returning id, contract_version_id, price_rule_id, name, override_config, created_at
      `;
      const lineItem = lineItemRows[0];

      if (!lineItem) {
        throw new Error("Contract line item insert did not return a row");
      }

      return toContractLineItem(lineItem);
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function approveContract(contractId: string) {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();

  try {
    return await sql.begin(async (tx) => {
      const contractRows = await tx<ContractRow[]>`
        select id, customer_id, status, start_date, end_date, created_at, updated_at
        from contracts
        where workspace_id = ${workspaceId}
          and id = ${contractId}
        limit 1
      `;
      const contract = contractRows[0];

      if (!contract) {
        return null;
      }

      if (contract.status !== "draft") {
        return "CONTRACT_NOT_DRAFT" as const;
      }

      const versionRows = await tx<ContractVersionRow[]>`
        select id, contract_id, version_number, effective_from, effective_to, terms_snapshot, created_at
        from contract_versions
        where workspace_id = ${workspaceId}
          and contract_id = ${contractId}
        order by version_number desc
        limit 1
      `;
      const version = versionRows[0];

      if (!version) {
        throw new Error("Draft contract does not have a version");
      }

      const lineItemRows = await tx<ContractLineItemRow[]>`
        select id, contract_version_id, price_rule_id, name, override_config, created_at
        from contract_line_items
        where workspace_id = ${workspaceId}
          and contract_version_id = ${version.id}
        order by created_at asc
      `;

      const termsSnapshot = {
        approvedAt: new Date().toISOString(),
        lineItems: lineItemRows.map(toContractLineItem)
      };

      await tx`
        update contract_versions
        set terms_snapshot = ${tx.json(termsSnapshot as never)}
        where workspace_id = ${workspaceId}
          and id = ${version.id}
      `;

      const updatedRows = await tx<ContractRow[]>`
        update contracts
        set status = 'active', updated_at = now()
        where workspace_id = ${workspaceId}
          and id = ${contractId}
        returning id, customer_id, status, start_date, end_date, created_at, updated_at
      `;
      const updatedContract = updatedRows[0];

      if (!updatedContract) {
        throw new Error("Contract approval did not return a row");
      }

      return {
        before: toContract(contract),
        after: toContract(updatedContract),
        lineItems: lineItemRows.map(toContractLineItem)
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
