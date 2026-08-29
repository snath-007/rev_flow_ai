import { Router } from "express";
import { receivePaymentSchema } from "@revflow/shared";

import { requireCapability } from "../../lib/authorization.js";
import { validateBody } from "../../lib/http.js";
import * as paymentsService from "./payments.service.js";

export const paymentsRouter = Router();

paymentsRouter.get("/", requireCapability("payments.read"), async (_req, res, next) => {
  try {
    const payments = await paymentsService.listPayments();
    res.status(200).json({ payments });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/", requireCapability("payments.write"), validateBody(receivePaymentSchema), async (req, res, next) => {
  try {
    const payment = await paymentsService.receivePayment(req.body);
    res.status(201).json({ payment });
  } catch (error) {
    next(error);
  }
});