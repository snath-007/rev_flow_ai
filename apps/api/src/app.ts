import cors from "cors";
import type { ErrorRequestHandler } from "express";
import express from "express";
import helmet from "helmet";

import { toApiError } from "./lib/http.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { contractsRouter } from "./modules/contracts/contracts.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { usageRouter } from "./modules/usage/usage.routes.js";
import { invoicesRouter } from "./modules/invoices/invoices.routes.js";
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
  app.use("/customers", customersRouter);
  app.use("/catalog", catalogRouter);
  app.use("/contracts", contractsRouter);
  app.use("/usage", usageRouter);
  app.use("/invoices", invoicesRouter);
  app.use(errorHandler);

  return app;
}



