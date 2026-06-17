import { Router } from "express";
import { generateInvoiceSchema } from "@revflow/shared";

import { ApiError, validateBody } from "../../lib/http.js";
import * as invoicesService from "./invoices.service.js";

export const invoicesRouter = Router();

invoicesRouter.get("/", async (_req, res, next) => {
  try {
    const invoices = await invoicesService.listInvoices();
    res.status(200).json({ invoices });
  } catch (error) {
    next(error);
  }
});

invoicesRouter.post("/generate", validateBody(generateInvoiceSchema), async (req, res, next) => {
  try {
    const invoice = await invoicesService.generateInvoice(req.body);
    res.status(201).json({ invoice });
  } catch (error) {
    next(error);
  }
});

invoicesRouter.get("/:id", async (req, res, next) => {
  try {
    const invoice = await invoicesService.getInvoiceById(req.params.id);

    if (!invoice) {
      throw new ApiError(404, "INVOICE_NOT_FOUND", "Invoice not found");
    }

    res.status(200).json({ invoice });
  } catch (error) {
    next(error);
  }
});

invoicesRouter.post("/:id/approve", async (req, res, next) => {
  try {
    const invoice = await invoicesService.approveInvoice(req.params.id);
    res.status(200).json({ invoice });
  } catch (error) {
    next(error);
  }
});
