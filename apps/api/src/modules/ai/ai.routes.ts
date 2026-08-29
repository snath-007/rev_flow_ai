import { createAiExtractionSchema, reviewAiExtractionSchema } from "@revflow/shared";
import { Router } from "express";

import { requireCapability } from "../../lib/authorization.js";
import { validateBody } from "../../lib/http.js";
import * as aiService from "./ai.service.js";

export const aiRouter = Router();

aiRouter.get("/extractions", requireCapability("ai.read"), async (_req, res, next) => {
  try {
    const extractions = await aiService.listExtractionRuns();
    res.status(200).json({ extractions });
  } catch (error) {
    next(error);
  }
});

aiRouter.post("/extractions", requireCapability("ai.extract"), validateBody(createAiExtractionSchema), async (req, res, next) => {
  try {
    const input = createAiExtractionSchema.parse(req.body);
    const extraction = await aiService.createContractExtraction(input);
    res.status(201).json({ extraction });
  } catch (error) {
    next(error);
  }
});

aiRouter.get("/extractions/:id", requireCapability("ai.read"), async (req, res, next) => {
  try {
    const extraction = await aiService.getExtractionRunById((req.params as { id: string }).id);
    res.status(200).json({ extraction });
  } catch (error) {
    next(error);
  }
});
aiRouter.post("/extractions/:id/review", requireCapability("ai.review"), validateBody(reviewAiExtractionSchema), async (req, res, next) => {
  try {
    const input = reviewAiExtractionSchema.parse(req.body);
    const extractionId = (req.params as { id: string }).id;
    const result = await aiService.reviewContractExtraction(extractionId, input);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

aiRouter.post("/extractions/:id/apply", requireCapability("ai.apply"), async (req, res, next) => {
  try {
    const result = await aiService.applyReviewedExtraction((req.params as { id: string }).id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
