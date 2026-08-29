import { Router } from "express";
import { generateInvoiceSchema } from "@revflow/shared";

import { requireCapability } from "../../lib/authorization.js";
import { ApiError, validateBody } from "../../lib/http.js";
import * as invoicesService from "./invoices.service.js";

export const invoicesRouter = Router();

invoicesRouter.get("/", requireCapability("invoices.read"), async (_req, res, next) => {
  try {
    const invoices = await invoicesService.listInvoices();
    res.status(200).json({ invoices });
  } catch (error) {
    next(error);
  }
});

invoicesRouter.post("/generate", requireCapability("invoices.generate"), validateBody(generateInvoiceSchema), async (req, res, next) => {
  try {
    const invoice = await invoicesService.generateInvoice(req.body);
    res.status(201).json({ invoice });
  } catch (error) {
    next(error);
  }
});

invoicesRouter.get("/:id", requireCapability("invoices.read"), async (req, res, next) => {
  try {
    const invoice = await invoicesService.getInvoiceById((req.params as { id: string }).id);

    if (!invoice) {
      throw new ApiError(404, "INVOICE_NOT_FOUND", "Invoice not found");
    }

    res.status(200).json({ invoice });
  } catch (error) {
    next(error);
  }
});

invoicesRouter.post("/:id/approve", requireCapability("invoices.approve"), async (req, res, next) => {
  try {
    const invoice = await invoicesService.approveInvoice((req.params as { id: string }).id);
    res.status(200).json({ invoice });
  } catch (error) {
    next(error);
  }
});
