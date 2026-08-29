import cors from "cors";
import type { ErrorRequestHandler } from "express";
import express from "express";
import helmet from "helmet";

import { ApiError, toApiError } from "./lib/http.js";
import { bindAuthenticatedActorContext } from "./lib/request-context.js";
import {
  createIdentityMiddleware,
  createRequireAuthenticatedActor,
} from "./modules/auth/auth.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { aiRouter } from "./modules/ai/ai.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { contractsRouter } from "./modules/contracts/contracts.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { invoicesRouter } from "./modules/invoices/invoices.routes.js";
import { integrationsRouter } from "./modules/integrations/integrations.routes.js";
import { opsRouter } from "./modules/ops/ops.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
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
    details: apiError.details,
  });
};

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.WEB_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        const allowUnrestrictedDevelopment =
          process.env.NODE_ENV !== "production" && allowedOrigins.length === 0;

        if (
          !origin ||
          allowUnrestrictedDevelopment ||
          allowedOrigins.includes(origin)
        ) {
          callback(null, true);
          return;
        }

        callback(
          new ApiError(
            403,
            "CORS_ORIGIN_FORBIDDEN",
            "Request origin is not allowed",
          ),
        );
      },
    }),
  );
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
  app.use("/reports", reportsRouter);
  app.use("/integrations", integrationsRouter);
  app.use("/audit", auditRouter);
  app.use("/ai", aiRouter);
  app.use("/ops", opsRouter);
  app.use("/revenue", revrecRouter);
  app.use(errorHandler);

  return app;
}
