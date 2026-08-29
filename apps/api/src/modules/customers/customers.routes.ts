import { Router } from "express";
import { createCustomerSchema } from "@revflow/shared";

import { requireCapability } from "../../lib/authorization.js";
import { ApiError, validateBody } from "../../lib/http.js";
import * as customersService from "./customers.service.js";

export const customersRouter = Router();

customersRouter.get("/", requireCapability("customers.read"), async (_req, res, next) => {
  try {
    const customers = await customersService.listCustomers();
    res.status(200).json({ customers });
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/", requireCapability("customers.write"), validateBody(createCustomerSchema), async (req, res, next) => {
  try {
    const customer = await customersService.createCustomer(req.body);
    res.status(201).json({ customer });
  } catch (error) {
    next(error);
  }
});

customersRouter.get("/:id", requireCapability("customers.read"), async (req, res, next) => {
  try {
    const customer = await customersService.getCustomerById((req.params as { id: string }).id);

    if (!customer) {
      throw new ApiError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
    }

    res.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
});
