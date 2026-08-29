import type { AddContractLineItemInput, CreateContractInput } from "@revflow/shared";

import { ApiError } from "../../lib/http.js";
import { createAuditLog } from "../audit/audit.service.js";
import * as contractsRepository from "./contracts.repository.js";

export async function listContracts() {
  return contractsRepository.listContracts();
}

export async function getContractById(id: string) {
  return contractsRepository.getContractById(id);
}

export async function createContract(input: CreateContractInput) {
  const contract = await contractsRepository.createContract(input);

  await createAuditLog({
    entityType: "contract",
    entityId: contract.id,
    action: "contract.created",
    afterState: contract
  });

  return contract;
}

export async function addContractLineItem(contractId: string, input: AddContractLineItemInput) {
  const lineItem = await contractsRepository.addContractLineItem(contractId, input);

  if (!lineItem) {
    throw new ApiError(404, "CONTRACT_NOT_FOUND", "Contract not found");
  }

  if (lineItem === "CONTRACT_NOT_DRAFT") {
    throw new ApiError(409, "CONTRACT_NOT_DRAFT", "Only draft contracts can be changed");
  }

  await createAuditLog({
    entityType: "contract",
    entityId: contractId,
    action: "contract_line_item.created",
    afterState: lineItem
  });

  return lineItem;
}

export async function approveContract(contractId: string) {
  const approval = await contractsRepository.approveContract(contractId);

  if (!approval) {
    throw new ApiError(404, "CONTRACT_NOT_FOUND", "Contract not found");
  }

  if (approval === "CONTRACT_NOT_DRAFT") {
    throw new ApiError(409, "CONTRACT_NOT_DRAFT", "Only draft contracts can be approved");
  }

  await createAuditLog({
    entityType: "contract",
    entityId: contractId,
    action: "contract.approved",
    beforeState: approval.before,
    afterState: {
      ...approval.after,
      lineItems: approval.lineItems
    }
  });

  return approval.after;
}
