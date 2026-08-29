import { Router } from "express";
import { aggregateUsageSchema, ingestUsageEventSchema } from "@revflow/shared";

import { requireCapability } from "../../lib/authorization.js";
import { validateBody } from "../../lib/http.js";
import * as usageService from "./usage.service.js";

export const usageRouter = Router();

usageRouter.get("/events", requireCapability("usage.read"), async (_req, res, next) => {
  try {
    const events = await usageService.listUsageEvents();
    res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
});

usageRouter.post("/events", requireCapability("usage.write"), validateBody(ingestUsageEventSchema), async (req, res, next) => {
  try {
    const event = await usageService.ingestUsageEvent(req.body);
    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
});

usageRouter.get("/aggregates", requireCapability("usage.read"), async (_req, res, next) => {
  try {
    const aggregates = await usageService.listUsageAggregates();
    res.status(200).json({ aggregates });
  } catch (error) {
    next(error);
  }
});

usageRouter.post("/aggregates/run", requireCapability("usage.write"), validateBody(aggregateUsageSchema), async (req, res, next) => {
  try {
    const aggregate = await usageService.aggregateUsageForPeriod(req.body);
    res.status(200).json({ aggregate });
  } catch (error) {
    next(error);
  }
});
