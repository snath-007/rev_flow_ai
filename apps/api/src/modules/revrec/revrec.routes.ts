import { Router } from "express";
import { generateRevenueSchedulesSchema } from "@revflow/shared";

import { requireCapability } from "../../lib/authorization.js";
import { validateBody } from "../../lib/http.js";
import * as revrecService from "./revrec.service.js";

export const revrecRouter = Router();

revrecRouter.get("/schedules", requireCapability("revenue.read"), async (_req, res, next) => {
  try {
    const schedules = await revrecService.listRevenueSchedules();
    res.status(200).json({ schedules });
  } catch (error) {
    next(error);
  }
});

revrecRouter.post("/schedules/generate", requireCapability("revenue.generate"), validateBody(generateRevenueSchedulesSchema), async (req, res, next) => {
  try {
    const result = await revrecService.generateRevenueSchedulesForInvoice(req.body.invoiceId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

revrecRouter.get("/journal-entries", requireCapability("revenue.read"), async (_req, res, next) => {
  try {
    const journalEntries = await revrecService.listJournalEntries();
    res.status(200).json({ journalEntries });
  } catch (error) {
    next(error);
  }
});
