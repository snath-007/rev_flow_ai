import { Router } from "express";
import {
  createMeterSchema,
  createPlanSchema,
  createPriceRuleSchema,
  createProductSchema
} from "@revflow/shared";

import { requireCapability } from "../../lib/authorization.js";
import { ApiError, validateBody } from "../../lib/http.js";
import * as catalogService from "./catalog.service.js";

export const catalogRouter = Router();

catalogRouter.get("/products", requireCapability("catalog.read"), async (_req, res, next) => {
  try {
    const products = await catalogService.listProducts();
    res.status(200).json({ products });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post("/products", requireCapability("catalog.write"), validateBody(createProductSchema), async (req, res, next) => {
  try {
    const product = await catalogService.createProduct(req.body);
    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/products/:id", requireCapability("catalog.read"), async (req, res, next) => {
  try {
    const product = await catalogService.getProductById((req.params as { id: string }).id);

    if (!product) {
      throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found");
    }

    res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/meters", requireCapability("catalog.read"), async (_req, res, next) => {
  try {
    const meters = await catalogService.listMeters();
    res.status(200).json({ meters });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post("/meters", requireCapability("catalog.write"), validateBody(createMeterSchema), async (req, res, next) => {
  try {
    const meter = await catalogService.createMeter(req.body);
    res.status(201).json({ meter });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/plans", requireCapability("catalog.read"), async (_req, res, next) => {
  try {
    const plans = await catalogService.listPlans();
    res.status(200).json({ plans });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post("/plans", requireCapability("catalog.write"), validateBody(createPlanSchema), async (req, res, next) => {
  try {
    const plan = await catalogService.createPlan(req.body);
    res.status(201).json({ plan });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/price-rules", requireCapability("catalog.read"), async (_req, res, next) => {
  try {
    const priceRules = await catalogService.listPriceRules();
    res.status(200).json({ priceRules });
  } catch (error) {
    next(error);
  }
});

catalogRouter.post("/price-rules", requireCapability("catalog.write"), validateBody(createPriceRuleSchema), async (req, res, next) => {
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
