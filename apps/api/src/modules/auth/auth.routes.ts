import { onboardWorkspaceSchema } from "@revflow/shared";
import { Router } from "express";

import { ApiError, validateBody } from "../../lib/http.js";
import { requireVerifiedIdentity } from "./auth.middleware.js";
import { findWorkspaceContext, isUniqueConstraintError, onboardWorkspace } from "./workspace.repository.js";

export const authRouter = Router();
authRouter.use(requireVerifiedIdentity());

authRouter.get("/context", async (req, res, next) => {
  try {
    const identity = req.verifiedIdentity;
    if (!identity) {
      throw new ApiError(401, "AUTHENTICATION_REQUIRED", "A valid session is required");
    }

    const context = await findWorkspaceContext(identity);
    res.status(200).json(
      context
        ? { status: "ready", actor: context.actor, workspace: context.workspace }
        : {
            status: "onboarding_required",
            externalUserId: identity.externalUserId,
            externalOrganizationId: identity.externalOrganizationId
          }
    );
  } catch (error) {
    next(error);
  }
});

authRouter.post("/onboard", validateBody(onboardWorkspaceSchema), async (req, res, next) => {
  try {
    const identity = req.verifiedIdentity;
    if (!identity) {
      throw new ApiError(401, "AUTHENTICATION_REQUIRED", "A valid session is required");
    }

    const context = await onboardWorkspace(identity, req.body);
    if (!context) {
      throw new Error("Workspace onboarding completed without a resolvable membership");
    }

    res.status(201).json({ status: "ready", actor: context.actor, workspace: context.workspace });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      next(new ApiError(409, "WORKSPACE_SLUG_CONFLICT", "That workspace URL is already in use"));
      return;
    }
    next(error);
  }
});
