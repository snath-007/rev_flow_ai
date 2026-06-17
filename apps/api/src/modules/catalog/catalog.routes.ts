import { Router } from "express";
import {
  createMeterSchema,
  createPlanSchema,
  createPriceRuleSchema,
  createProductSchema
} from "@revflow/shared";

import { ApiError, validateBody } from "../../lib/http.js";
import * as catalogService from "./catalog.service.js";

export const catalogRouter = Router();

catalogRouter.get("/products", async (_req, res, next) => {
  try {
    const products = await catalogService.listProducts();
    res.status(200).json({ products });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post("/products", validateBody(createProductSchema), async (req, res, next) => {
  try {
    const product = await catalogService.createProduct(req.body);
    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/products/:id", async (req, res, next) => {
  try {
    const product = await catalogService.getProductById(req.params.id);

    if (!product) {
      throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found");
    }

    res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/meters", async (_req, res, next) => {
  try {
    const meters = await catalogService.listMeters();
    res.status(200).json({ meters });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post("/meters", validateBody(createMeterSchema), async (req, res, next) => {
  try {
    const meter = await catalogService.createMeter(req.body);
    res.status(201).json({ meter });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/plans", async (_req, res, next) => {
  try {
    const plans = await catalogService.listPlans();
    res.status(200).json({ plans });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post("/plans", validateBody(createPlanSchema), async (req, res, next) => {
  try {
    const plan = await catalogService.createPlan(req.body);
    res.status(201).json({ plan });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/price-rules", async (_req, res, next) => {
  try {
    const priceRules = await catalogService.listPriceRules();
    res.status(200).json({ priceRules });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post("/price-rules", validateBody(createPriceRuleSchema), async (req, res, next) => {
  try {
    const priceRule = await catalogService.createPriceRule({
      ...req.body,
      currency: req.body.currency ?? "USD"
    });
    res.status(201).json({ priceRule });
  } catch (error) {
    next(error);
  }
});

