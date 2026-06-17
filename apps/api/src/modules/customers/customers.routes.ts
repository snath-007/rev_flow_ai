import { Router } from "express";
import { createCustomerSchema } from "@revflow/shared";

import { ApiError, validateBody } from "../../lib/http.js";
import * as customersService from "./customers.service.js";

export const customersRouter = Router();

customersRouter.get("/", async (_req, res, next) => {
  try {
    const customers = await customersService.listCustomers();
    res.status(200).json({ customers });
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/", validateBody(createCustomerSchema), async (req, res, next) => {
  try {
    const customer = await customersService.createCustomer(req.body);
    res.status(201).json({ customer });
  } catch (error) {
    next(error);
  }
});

customersRouter.get("/:id", async (req, res, next) => {
  try {
    const customer = await customersService.getCustomerById(req.params.id);

    if (!customer) {
      throw new ApiError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
    }

    res.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
});
