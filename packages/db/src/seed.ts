import { loadEnv } from "./env.js";

loadEnv();

import { createSqlClient } from "./client.js";

type IdRow = {
  id: string;
};

type ContractRow = IdRow & {
  status: "draft" | "active";
};

async function run() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Demo seeding is disabled in production");
  }

  const workspaceId = "00000000-0000-4000-8000-000000000001";
  const sql = createSqlClient();

  try {
    await sql.begin(async (tx) => {
      const existingSeedRows = await tx<{ id: string }[]>`
        select id
        from audit_logs
        where workspace_id = ${workspaceId}
          and action = 'seed.demo_data.created'
        limit 1
      `;

      if (existingSeedRows[0]) {
        return;
      }
      const acmeRows = await tx<IdRow[]>`
        insert into customers (workspace_id, name, email, billing_address)
        values (${workspaceId}, 'Acme Analytics', 'finance@acme.example', '100 Market Street, San Francisco, CA')
        on conflict (workspace_id, (lower(email))) do update
        set name = excluded.name,
            billing_address = excluded.billing_address,
            updated_at = now()
        returning id
      `;
      const orbitRows = await tx<IdRow[]>`
        insert into customers (workspace_id, name, email, billing_address)
        values (${workspaceId}, 'OrbitOps', 'billing@orbitops.example', '45 Mission Road, Austin, TX')
        on conflict (workspace_id, (lower(email))) do update
        set name = excluded.name,
            billing_address = excluded.billing_address,
            updated_at = now()
        returning id
      `;
      const acmeId = acmeRows[0]?.id;
      const orbitId = orbitRows[0]?.id;

      const revApiRows = await tx<IdRow[]>`
        insert into products (workspace_id, name, description, status)
        values (${workspaceId}, 'Revenue API', 'Metered API platform for revenue operations', 'active')
        on conflict (workspace_id, (lower(name))) do update
        set description = excluded.description,
            status = excluded.status,
            updated_at = now()
        returning id
      `;
      const workflowRows = await tx<IdRow[]>`
        insert into products (workspace_id, name, description, status)
        values (${workspaceId}, 'Workflow Seats', 'Seat-based operator workspace', 'active')
        on conflict (workspace_id, (lower(name))) do update
        set description = excluded.description,
            status = excluded.status,
            updated_at = now()
        returning id
      `;
      const revApiId = revApiRows[0]?.id;
      const workflowId = workflowRows[0]?.id;

      if (!acmeId || !orbitId || !revApiId || !workflowId) {
        throw new Error("Seed setup failed to create base records");
      }

      const usageMeterRows = await tx<IdRow[]>`
        insert into meters (workspace_id, product_id, name, event_name, aggregation_type, unit)
        values (${workspaceId}, ${revApiId}, 'API Calls', 'api.call', 'sum', 'call')
        on conflict (workspace_id, product_id, event_name) do update
        set name = excluded.name,
            aggregation_type = excluded.aggregation_type,
            unit = excluded.unit,
            updated_at = now()
        returning id
      `;
      const documentMeterRows = await tx<IdRow[]>`
        insert into meters (workspace_id, product_id, name, event_name, aggregation_type, unit)
        values (${workspaceId}, ${revApiId}, 'Documents Processed', 'document.processed', 'count', 'document')
        on conflict (workspace_id, product_id, event_name) do update
        set name = excluded.name,
            aggregation_type = excluded.aggregation_type,
            unit = excluded.unit,
            updated_at = now()
        returning id
      `;
      const usageMeterId = usageMeterRows[0]?.id;
      const documentMeterId = documentMeterRows[0]?.id;

      const growthPlanRows = await tx<IdRow[]>`
        insert into plans (workspace_id, product_id, name, billing_interval, status)
        values (${workspaceId}, ${revApiId}, 'Growth Usage Plan', 'monthly', 'active')
        on conflict (workspace_id, product_id, (lower(name)), billing_interval) do update
        set status = excluded.status,
            updated_at = now()
        returning id
      `;
      const seatPlanRows = await tx<IdRow[]>`
        insert into plans (workspace_id, product_id, name, billing_interval, status)
        values (${workspaceId}, ${workflowId}, 'Operator Seat Plan', 'monthly', 'active')
        on conflict (workspace_id, product_id, (lower(name)), billing_interval) do update
        set status = excluded.status,
            updated_at = now()
        returning id
      `;
      const growthPlanId = growthPlanRows[0]?.id;
      const seatPlanId = seatPlanRows[0]?.id;

      if (!usageMeterId || !documentMeterId || !growthPlanId || !seatPlanId) {
        throw new Error("Seed setup failed to create catalog records");
      }

      const flatRuleRows = await tx<IdRow[]>`
        insert into price_rules (workspace_id, plan_id, meter_id, pricing_model, unit_price, currency, config)
        values (${workspaceId}, ${growthPlanId}, null, 'flat', 500, 'USD', ${tx.json({ label: "Platform fee" } as never)})
        returning id
      `;
      const usageRuleRows = await tx<IdRow[]>`
        insert into price_rules (workspace_id, plan_id, meter_id, pricing_model, unit_price, currency, config)
        values (${workspaceId}, ${growthPlanId}, ${usageMeterId}, 'per_unit', 0.025, 'USD', ${tx.json({ includedUnits: 0 } as never)})
        returning id
      `;
      await tx`
        insert into price_rules (workspace_id, plan_id, meter_id, pricing_model, unit_price, currency, config)
        values (${workspaceId}, ${growthPlanId}, ${documentMeterId}, 'per_unit', 1.5, 'USD', ${tx.json({ includedUnits: 0 } as never)})
      `;
      await tx`
        insert into price_rules (workspace_id, plan_id, meter_id, pricing_model, unit_price, currency, config)
        values (${workspaceId}, ${seatPlanId}, null, 'flat', 1200, 'USD', ${tx.json({ seats: 10 } as never)})
      `;

      const activeContractRows = await tx<ContractRow[]>`
        insert into contracts (workspace_id, customer_id, status, start_date, end_date)
        values (${workspaceId}, ${acmeId}, 'active', '2026-06-01', '2026-06-30')
        returning id, status
      `;
      const draftContractRows = await tx<ContractRow[]>`
        insert into contracts (workspace_id, customer_id, status, start_date, end_date)
        values (${workspaceId}, ${orbitId}, 'draft', '2026-07-01', '2026-07-31')
        returning id, status
      `;
      const activeContractId = activeContractRows[0]?.id;
      const draftContractId = draftContractRows[0]?.id;
      const flatRuleId = flatRuleRows[0]?.id;
      const usageRuleId = usageRuleRows[0]?.id;

      if (!activeContractId || !draftContractId || !flatRuleId || !usageRuleId) {
        throw new Error("Seed setup failed to create contract records");
      }

      const activeVersionRows = await tx<IdRow[]>`
        insert into contract_versions (workspace_id, contract_id, version_number, effective_from, effective_to, terms_snapshot)
        values (${workspaceId}, ${activeContractId}, 1, '2026-06-01', '2026-06-30', ${tx.json({ seeded: true, approvedAt: new Date().toISOString() } as never)})
        returning id
      `;
      const draftVersionRows = await tx<IdRow[]>`
        insert into contract_versions (workspace_id, contract_id, version_number, effective_from, effective_to, terms_snapshot)
        values (${workspaceId}, ${draftContractId}, 1, '2026-07-01', '2026-07-31', ${tx.json({ seeded: true, status: "draft" } as never)})
        returning id
      `;
      const activeVersionId = activeVersionRows[0]?.id;
      const draftVersionId = draftVersionRows[0]?.id;

      if (!activeVersionId || !draftVersionId) {
        throw new Error("Seed setup failed to create contract versions");
      }

      await tx`
        insert into contract_line_items (workspace_id, contract_version_id, price_rule_id, name, override_config)
        values (${workspaceId}, ${activeVersionId}, ${flatRuleId}, 'Platform fee', ${tx.json({} as never)})
      `;
      await tx`
        insert into contract_line_items (workspace_id, contract_version_id, price_rule_id, name, override_config)
        values (${workspaceId}, ${activeVersionId}, ${usageRuleId}, 'API call usage', ${tx.json({} as never)})
      `;
      await tx`
        insert into contract_line_items (workspace_id, contract_version_id, price_rule_id, name, override_config)
        values (${workspaceId}, ${draftVersionId}, ${flatRuleId}, 'Draft platform fee', ${tx.json({} as never)})
      `;

      await tx`
        insert into usage_events (workspace_id, idempotency_key, contract_id, meter_id, quantity, occurred_at, properties)
        values (${workspaceId}, 'seed-acme-api-001', ${activeContractId}, ${usageMeterId}, 12000, '2026-06-10T12:00:00Z', ${tx.json({ source: "seed" } as never)})
        on conflict (workspace_id, idempotency_key) do nothing
      `;
      await tx`
        insert into usage_events (workspace_id, idempotency_key, contract_id, meter_id, quantity, occurred_at, properties)
        values (${workspaceId}, 'seed-acme-api-002', ${activeContractId}, ${usageMeterId}, 8000, '2026-06-20T12:00:00Z', ${tx.json({ source: "seed" } as never)})
        on conflict (workspace_id, idempotency_key) do nothing
      `;

      await tx`
        insert into audit_logs (workspace_id, entity_type, entity_id, action, after_state, actor, actor_type, auth_provider)
        values (${workspaceId}, 'seed', ${activeContractId}, 'seed.demo_data.created', ${tx.json({ activeContractId, draftContractId } as never)}, 'system', 'system', 'system')
      `;
    });

    console.log("Seed data complete");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

