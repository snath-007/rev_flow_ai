import { Router } from "express";
import { checkDatabaseConnection } from "@revflow/db";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    service: "revflow-api",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/db", async (_req, res) => {
  try {
    const connected = await checkDatabaseConnection();

    res.status(connected ? 200 : 503).json({
      service: "revflow-api",
      dependency: "postgres",
      status: connected ? "ok" : "unavailable",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      service: "revflow-api",
      dependency: "postgres",
      status: "unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});
