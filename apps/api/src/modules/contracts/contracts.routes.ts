import { Router } from "express";
import { addContractLineItemSchema, createContractSchema } from "@revflow/shared";

import { ApiError, validateBody } from "../../lib/http.js";
import * as contractsService from "./contracts.service.js";

export const contractsRouter = Router();

contractsRouter.get("/", async (_req, res, next) => {
  try {
    const contracts = await contractsService.listContracts();
    res.status(200).json({ contracts });
  } catch (error) {
    next(error);
  }
});

contractsRouter.post("/", validateBody(createContractSchema), async (req, res, next) => {
  try {
    const contract = await contractsService.createContract(req.body);
    res.status(201).json({ contract });
  } catch (error) {
    next(error);
  }
});

contractsRouter.get("/:id", async (req, res, next) => {
  try {
    const contract = await contractsService.getContractById(req.params.id);

    if (!contract) {
      throw new ApiError(404, "CONTRACT_NOT_FOUND", "Contract not found");
    }

    res.status(200).json({ contract });
  } catch (error) {
    next(error);
  }
});

contractsRouter.post("/:id/line-items", validateBody(addContractLineItemSchema), async (req, res, next) => {
  try {
    const contractId = (req.params as { id: string }).id;
    const lineItem = await contractsService.addContractLineItem(contractId, req.body);
    res.status(201).json({ lineItem });
  } catch (error) {
    next(error);
  }
});

contractsRouter.post("/:id/approve", async (req, res, next) => {
  try {
    const contract = await contractsService.approveContract(req.params.id);
    res.status(200).json({ contract });
  } catch (error) {
    next(error);
  }
});

