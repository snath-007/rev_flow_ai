import { Router } from "express";

import { requireCapability } from "../../lib/authorization.js";

import * as opsService from "./ops.service.js";

export const opsRouter = Router();

opsRouter.get("/jobs", requireCapability("ops.read"), async (_req, res, next) => {
  try {
    const jobRuns = await opsService.listJobRuns();
    res.status(200).json({ jobRuns });
  } catch (error) {
    next(error);
  }
});
