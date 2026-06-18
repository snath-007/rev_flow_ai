import { Router } from "express";

import * as auditService from "./audit.service.js";

export const auditRouter = Router();

auditRouter.get("/", async (_req, res, next) => {
  try {
    const auditLogs = await auditService.listAuditLogs();
    res.status(200).json({ auditLogs });
  } catch (error) {
    next(error);
  }
});
