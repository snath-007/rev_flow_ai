import cors from "cors";
import type { ErrorRequestHandler } from "express";
import express from "express";
import helmet from "helmet";

import { toApiError } from "./lib/http.js";
import { bindAuthenticatedActorContext } from "./lib/request-context.js";
import { createIdentityMiddleware, createRequireAuthenticatedActor } from "./modules/auth/auth.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { aiRouter } from "./modules/ai/ai.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { contractsRouter } from "./modules/contracts/contracts.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { invoicesRouter } from "./modules/invoices/invoices.routes.js";
import { opsRouter } from "./modules/ops/ops.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { revrecRouter } from "./modules/revrec/revrec.routes.js";
import { usageRouter } from "./modules/usage/usage.routes.js";
import { healthRouter } from "./routes/health.js";

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const apiError = toApiError(error);

  if (apiError.statusCode >= 500) {
    console.error(error);
  }

  res.status(apiError.statusCode).json({
    code: apiError.code,
    message: apiError.message,
    details: apiError.details
  });
};

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", healthRouter);
  app.use(...createIdentityMiddleware());
  app.use("/auth", authRouter);
  app.use(createRequireAuthenticatedActor());
  app.use(bindAuthenticatedActorContext());
  app.use("/customers", customersRouter);
  app.use("/catalog", catalogRouter);
  app.use("/contracts", contractsRouter);
  app.use("/usage", usageRouter);
  app.use("/invoices", invoicesRouter);
  app.use("/payments", paymentsRouter);
  app.use("/audit", auditRouter);
  app.use("/ai", aiRouter);
  app.use("/ops", opsRouter);
  app.use("/revenue", revrecRouter);
  app.use(errorHandler);

  return app;
}

