import { Router } from "express";
import { ingestUsageEventSchema } from "@revflow/shared";

import { validateBody } from "../../lib/http.js";
import * as usageService from "./usage.service.js";

export const usageRouter = Router();

usageRouter.get("/events", async (_req, res, next) => {
  try {
    const events = await usageService.listUsageEvents();
    res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
});

usageRouter.post("/events", validateBody(ingestUsageEventSchema), async (req, res, next) => {
  try {
    const event = await usageService.ingestUsageEvent(req.body);
    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
});

usageRouter.get("/aggregates", async (_req, res, next) => {
  try {
    const aggregates = await usageService.listUsageAggregates();
    res.status(200).json({ aggregates });
  } catch (error) {
    next(error);
  }
});
