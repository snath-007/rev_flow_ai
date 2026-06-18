import { Router } from "express";

import * as opsService from "./ops.service.js";

export const opsRouter = Router();

opsRouter.get("/jobs", async (_req, res, next) => {
  try {
    const jobRuns = await opsService.listJobRuns();
    res.status(200).json({ jobRuns });
  } catch (error) {
    next(error);
  }
});
