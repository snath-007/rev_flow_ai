import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    service: "revflow-api",
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

