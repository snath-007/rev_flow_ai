import type { Capability } from "@revflow/shared";
import type { RequestHandler } from "express";

import { ApiError } from "./http.js";

export function requireCapability(requiredCapability: Capability): RequestHandler {
  return (req, _res, next) => {
    const actor = req.authenticatedActor;

    if (!actor) {
      next(new ApiError(401, "AUTHENTICATION_REQUIRED", "A valid session is required"));
      return;
    }

    if (!actor.capabilities.includes(requiredCapability)) {
      next(new ApiError(403, "AUTHORIZATION_FORBIDDEN", "You do not have permission to perform this action", {
        requiredCapability
      }));
      return;
    }

    next();
  };
}
