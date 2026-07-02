import "server-only";

import { auth } from "@clerk/nextjs/server";

import type {
  AddContractLineItemInput,
  AuthenticationContext,
  AggregateUsageInput,
  AiExtractionRun,
  AuditLog,
  Contract,
  ContractSummary,
  CreateAiExtractionInput,
  CreateContractInput,
  CreateCustomerInput,
  CreateMeterInput,
  CreatePlanInput,
  CreatePriceRuleInput,
  CreateProductInput,
  Customer,
  GenerateInvoiceInput,
  IngestUsageEventInput,
  Invoice,
  JobRun,
  JournalEntry,
  Meter,
  OnboardWorkspaceInput,
  Plan,
  PriceRule,
  Product,
  RevenueSchedule,
  ReviewAiExtractionInput,
  UsageAggregate,
  UsageEvent
} from "@revflow/shared";

import { isClerkConfigured } from "./auth-config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (isClerkConfigured()) {
    const session = await auth();
    const token = await session.getToken();
    if (token) {
      headers.set("authorization", "Bearer " + token);
    }
  }

  const response = await fetch(apiUrl + path, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "API request failed: " + response.status);
  }

  return response.json() as Promise<T>;
}

export async function getAuthenticationContext() {
  return request<AuthenticationContext>("/auth/context");
}

export async function onboardWorkspace(input: OnboardWorkspaceInput) {
  return request<Extract<AuthenticationContext, { status: "ready" }>>("/auth/onboard", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listCustomers() {
  const data = await request<{ customers: Customer[] }>("/customers");
  return data.customers;
}

export async function createCustomer(input: CreateCustomerInput) {
  const data = await request<{ customer: Customer }>("/customers", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return data.customer;
}

export async function listProducts() {
  const data = await request<{ products: Product[] }>("/catalog/products");
  return data.products;
}

export async function createProduct(input: CreateProductInput) {
  const data = await request<{ product: Product }>("/catalog/products", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return data.product;
}

export async function listMeters() {
  const data = await request<{ meters: Meter[] }>("/catalog/meters");
  return data.meters;
}

export async function createMeter(input: CreateMeterInput) {
  const data = await request<{ meter: Meter }>("/catalog/meters", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return data.meter;
}

export async function listPlans() {
  const data = await request<{ plans: Plan[] }>("/catalog/plans");
  return data.plans;
}

export async function createPlan(input: CreatePlanInput) {
  const data = await request<{ plan: Plan }>("/catalog/plans", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return data.plan;
}

export async function listPriceRules() {
  const data = await request<{ priceRules: PriceRule[] }>("/catalog/price-rules");
  return data.priceRules;
}

export async function createPriceRule(input: CreatePriceRuleInput) {
  const data = await request<{ priceRule: PriceRule }>("/catalog/price-rules", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return data.priceRule;
}

export async function listContracts() {
  const data = await request<{ contracts: ContractSummary[] }>("/contracts");
  return data.contracts;
}

export async function createContract(input: CreateContractInput) {
  const data = await request<{ contract: Contract }>("/contracts", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return data.contract;
}

export async function addContractLineItem(contractId: string, input: AddContractLineItemInput) {
  const data = await request<{ lineItem: unknown }>(`/contracts/${contractId}/line-items`, {
    method: "POST",
    body: JSON.stringify(input)
  });

  return data.lineItem;
}

export async function approveContract(contractId: string) {
  const data = await request<{ contract: Contract }>(`/contracts/${contractId}/approve`, {
    method: "POST"
  });

  return data.contract;
}

export async function listUsageEvents() {
  const data = await request<{ events: UsageEvent[] }>("/usage/events");
  return data.events;
}

export async function ingestUsageEvent(input: IngestUsageEventInput) {
  const data = await request<{ event: UsageEvent }>("/usage/events", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return data.event;
}

export async function listUsageAggregates() {
  const data = await request<{ aggregates: UsageAggregate[] }>("/usage/aggregates");
  return data.aggregates;
}

export async function aggregateUsageForPeriod(input: AggregateUsageInput) {
  const data = await request<{ aggregate: UsageAggregate }>("/usage/aggregates/run", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return data.aggregate;
}

export async function listInvoices() {
  const data = await request<{ invoices: Invoice[] }>("/invoices");
  return data.invoices;
}

export async function getInvoice(invoiceId: string) {
  const data = await request<{ invoice: Invoice }>(`/invoices/${invoiceId}`);
  return data.invoice;
}

export async function generateInvoice(input: GenerateInvoiceInput) {
  const data = await request<{ invoice: Invoice }>("/invoices/generate", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return data.invoice;
}

export async function approveInvoice(invoiceId: string) {
  const data = await request<{ invoice: Invoice }>(`/invoices/${invoiceId}/approve`, {
    method: "POST"
  });

  return data.invoice;
}

export async function listAuditLogs() {
  const data = await request<{ auditLogs: AuditLog[] }>("/audit");
  return data.auditLogs;
}
export async function listJobRuns() {
  const data = await request<{ jobRuns: JobRun[] }>("/ops/jobs");
  return data.jobRuns;
}

export async function listRevenueSchedules() {
  const data = await request<{ schedules: RevenueSchedule[] }>("/revenue/schedules");
  return data.schedules;
}

export async function listJournalEntries() {
  const data = await request<{ journalEntries: JournalEntry[] }>("/revenue/journal-entries");
  return data.journalEntries;
}

export async function generateRevenueSchedules(invoiceId: string) {
  return request<{
    invoiceId: string;
    performanceObligations: unknown[];
    schedules: RevenueSchedule[];
    journalEntries: JournalEntry[];
  }>("/revenue/schedules/generate", {
    method: "POST",
    body: JSON.stringify({ invoiceId })
  });
}
export async function listAiExtractions() {
  const data = await request<{ extractions: AiExtractionRun[] }>("/ai/extractions");
  return data.extractions;
}

export async function createAiExtraction(input: CreateAiExtractionInput) {
  const data = await request<{ extraction: AiExtractionRun }>("/ai/extractions", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return data.extraction;
}

export async function reviewAiExtraction(extractionId: string, input: ReviewAiExtractionInput) {
  return request<{ run: AiExtractionRun; review: unknown }>(`/ai/extractions/${extractionId}/review`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function applyAiExtraction(extractionId: string) {
  return request<{
    extraction: AiExtractionRun;
    customer: Customer;
    customerCreated: boolean;
    contract: Contract;
  }>(`/ai/extractions/${extractionId}/apply`, {
    method: "POST"
  });
}
