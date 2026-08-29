import { clerkMiddleware, getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

import { ApiError } from "../../lib/http.js";
import type { VerifiedIdentity, WorkspaceContext } from "./auth.types.js";
import { findWorkspaceContext } from "./workspace.repository.js";

type ContextResolver = (identity: VerifiedIdentity) => Promise<WorkspaceContext | null>;

const attachLocalIdentity: RequestHandler = (req, _res, next) => {
  if (process.env.NODE_ENV === "production") {
    next(new ApiError(500, "INVALID_AUTH_CONFIGURATION", "Local authentication is disabled in production"));
    return;
  }

  req.verifiedIdentity = {
    externalUserId: process.env.LOCAL_AUTH_USER_ID ?? "local-user",
    externalOrganizationId: process.env.LOCAL_AUTH_ORGANIZATION_ID ?? "local-org",
    organizationRole: "org:admin",
    organizationSlug: "revflow-demo",
    sessionId: "local-session",
    displayName: process.env.LOCAL_AUTH_DISPLAY_NAME ?? "Local Admin",
    authProvider: "local_test"
  };
  next();
};

const attachClerkIdentity: RequestHandler = (req, _res, next) => {
  const auth = getAuth(req);

  if (!auth.userId) {
    next(new ApiError(401, "AUTHENTICATION_REQUIRED", "A valid session is required"));
    return;
  }

  if (!auth.orgId) {
    next(new ApiError(403, "ACTIVE_ORGANIZATION_REQUIRED", "Select or create a workspace organization"));
    return;
  }

  req.verifiedIdentity = {
    externalUserId: auth.userId,
    externalOrganizationId: auth.orgId,
    organizationRole: auth.orgRole ?? null,
    organizationSlug: auth.orgSlug ?? null,
    sessionId: auth.sessionId,
    displayName: null,
    authProvider: "clerk"
  };
  next();
};

export function createIdentityMiddleware(): RequestHandler[] {
  const mode = process.env.AUTH_MODE ?? (process.env.NODE_ENV === "production" ? "clerk" : "local");

  if (mode === "local") {
    return [attachLocalIdentity];
  }

  if (mode !== "clerk") {
    throw new Error("AUTH_MODE must be clerk or local");
  }

  if (!process.env.CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are required when AUTH_MODE=clerk");
  }

  return [clerkMiddleware(), attachClerkIdentity];
}

export function requireVerifiedIdentity(): RequestHandler {
  return (req, _res, next) => {
    if (!req.verifiedIdentity) {
      next(new ApiError(401, "AUTHENTICATION_REQUIRED", "A valid session is required"));
      return;
    }
    next();
  };
}

export function createRequireAuthenticatedActor(
  resolveContext: ContextResolver = findWorkspaceContext
): RequestHandler {
  return async (req, _res, next) => {
    if (!req.verifiedIdentity) {
      next(new ApiError(401, "AUTHENTICATION_REQUIRED", "A valid session is required"));
      return;
    }

    try {
      const context = await resolveContext(req.verifiedIdentity);
      if (!context) {
        next(new ApiError(403, "WORKSPACE_ONBOARDING_REQUIRED", "Complete workspace onboarding before accessing RevFlow"));
        return;
      }

      req.authenticatedActor = context.actor;
      next();
    } catch (error) {
      next(error);
    }
  };
}
