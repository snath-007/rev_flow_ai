import { createAiExtractionSchema, reviewAiExtractionSchema } from "@revflow/shared";
import { Router } from "express";

import { validateBody } from "../../lib/http.js";
import * as aiService from "./ai.service.js";

export const aiRouter = Router();

aiRouter.get("/extractions", async (_req, res, next) => {
  try {
    const extractions = await aiService.listExtractionRuns();
    res.status(200).json({ extractions });
  } catch (error) {
    next(error);
  }
});

aiRouter.post("/extractions", validateBody(createAiExtractionSchema), async (req, res, next) => {
  try {
    const input = createAiExtractionSchema.parse(req.body);
    const extraction = await aiService.createContractExtraction(input);
    res.status(201).json({ extraction });
  } catch (error) {
    next(error);
  }
});

aiRouter.get("/extractions/:id", async (req, res, next) => {
  try {
    const extraction = await aiService.getExtractionRunById(req.params.id);
    res.status(200).json({ extraction });
  } catch (error) {
    next(error);
  }
});
aiRouter.post("/extractions/:id/review", validateBody(reviewAiExtractionSchema), async (req, res, next) => {
  try {
    const input = reviewAiExtractionSchema.parse(req.body);
    const extractionId = (req.params as { id: string }).id;
    const result = await aiService.reviewContractExtraction(extractionId, input);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

aiRouter.post("/extractions/:id/apply", async (req, res, next) => {
  try {
    const result = await aiService.applyReviewedExtraction(req.params.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
