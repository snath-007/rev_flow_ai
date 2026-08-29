import { Router } from "express";
import { createExportRequestSchema } from "@revflow/shared";

import { requireCapability } from "../../lib/authorization.js";
import { validateBody } from "../../lib/http.js";
import * as integrationsService from "./integrations.service.js";

export const integrationsRouter = Router();

integrationsRouter.post(
  "/exports",
  requireCapability("integrations.export"),
  validateBody(createExportRequestSchema),
  async (req, res, next) => {
    try {
      const body = createExportRequestSchema.parse(req.body);
      const result = await integrationsService.createExport(body);
      const statusCode = result.duplicate ? 200 : 201;

      if (result.payload.format === "csv") {
        res
          .status(statusCode)
          .setHeader("Content-Type", "text/csv; charset=utf-8")
          .setHeader(
            "Content-Disposition",
            `attachment; filename="${integrationsService.fileNameFor(result.payload.entityType, result.payload.format)}"`,
          )
          .setHeader("X-Integration-Run-Id", result.run.id)
          .setHeader("X-Export-Reference", result.run.exportReference ?? "")
          .setHeader("X-Export-Duplicate", String(result.duplicate))
          .send(integrationsService.toCsv(result.payload));
        return;
      }

      res.status(statusCode).json({
        run: result.run,
        export: result.payload,
        duplicate: result.duplicate,
      });
    } catch (error) {
      next(error);
    }
  },
);
