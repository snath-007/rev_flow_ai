import { Router } from "express";

import { requireCapability } from "../../lib/authorization.js";
import * as reportsService from "./reports.service.js";

export const reportsRouter = Router();

reportsRouter.get("/overview", requireCapability("reports.read"), async (_req, res, next) => {
  try {
    const report = await reportsService.getOverviewReport();
    res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
});
reportsRouter.get("/revenue-waterfall", requireCapability("reports.read"), async (_req, res, next) => {
  try {
    const report = await reportsService.getRevenueWaterfallReport();
    res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
});
reportsRouter.get("/ar-aging", requireCapability("reports.read"), async (_req, res, next) => {
  try {
    const report = await reportsService.getArAgingReport();
    res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/dso", requireCapability("reports.read"), async (_req, res, next) => {
  try {
    const report = await reportsService.getDsoReport();
    res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
});
reportsRouter.get("/mrr", requireCapability("reports.read"), async (_req, res, next) => {
  try {
    const report = await reportsService.getRecurringRevenueReport();
    res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
});