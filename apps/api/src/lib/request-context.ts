import { AsyncLocalStorage } from "node:async_hooks";

import type { AuthenticatedActor } from "@revflow/shared";
import type { RequestHandler } from "express";

import { ApiError } from "./http.js";

const actorStorage = new AsyncLocalStorage<AuthenticatedActor>();

export function bindAuthenticatedActorContext(): RequestHandler {
  return (req, _res, next) => {
    if (!req.authenticatedActor) {
      next(new ApiError(401, "AUTHENTICATION_REQUIRED", "A complete authenticated actor is required"));
      return;
    }

    actorStorage.run(req.authenticatedActor, next);
  };
}

export function runWithAuthenticatedActor<T>(actor: AuthenticatedActor, callback: () => T) {
  return actorStorage.run(actor, callback);
}

export function getAuthenticatedActor() {
  return actorStorage.getStore() ?? null;
}

export function getRequiredAuthenticatedActor() {
  const actor = getAuthenticatedActor();

  if (!actor) {
    throw new ApiError(401, "AUTHENTICATION_REQUIRED", "A complete authenticated actor is required");
  }

  return actor;
}

export function getRequiredWorkspaceId() {
  return getRequiredAuthenticatedActor().workspaceId;
}
