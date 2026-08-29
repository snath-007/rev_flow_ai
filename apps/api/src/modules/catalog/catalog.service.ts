import type {
  CreateMeterInput,
  CreatePlanInput,
  CreatePriceRuleInput,
  CreateProductInput
} from "@revflow/shared";

import { createAuditLog } from "../audit/audit.service.js";
import * as catalogRepository from "./catalog.repository.js";

export async function listProducts() {
  return catalogRepository.listProducts();
}

export async function getProductById(id: string) {
  return catalogRepository.getProductById(id);
}

export async function createProduct(input: CreateProductInput) {
  const product = await catalogRepository.createProduct(input);

  await createAuditLog({
    entityType: "product",
    entityId: product.id,
    action: "product.created",
    afterState: product
  });

  return product;
}

export async function listMeters() {
  return catalogRepository.listMeters();
}

export async function createMeter(input: CreateMeterInput) {
  const meter = await catalogRepository.createMeter(input);

  await createAuditLog({
    entityType: "meter",
    entityId: meter.id,
    action: "meter.created",
    afterState: meter
  });

  return meter;
}

export async function listPlans() {
  return catalogRepository.listPlans();
}

export async function createPlan(input: CreatePlanInput) {
  const plan = await catalogRepository.createPlan(input);

  await createAuditLog({
    entityType: "plan",
    entityId: plan.id,
    action: "plan.created",
    afterState: plan
  });

  return plan;
}

export async function listPriceRules() {
  return catalogRepository.listPriceRules();
}

export async function createPriceRule(input: CreatePriceRuleInput) {
  const priceRule = await catalogRepository.createPriceRule(input);

  await createAuditLog({
    entityType: "price_rule",
    entityId: priceRule.id,
    action: "price_rule.created",
    afterState: priceRule
  });

  return priceRule;
}
