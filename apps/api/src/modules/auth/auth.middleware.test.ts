import type { Request, RequestHandler } from "express";
import { describe, expect, it, vi } from "vitest";

import { createRequireAuthenticatedActor } from "./auth.middleware.js";
import type { VerifiedIdentity, WorkspaceContext } from "./auth.types.js";

const identity: VerifiedIdentity = {
  externalUserId: "user_123",
  externalOrganizationId: "org_123",
  organizationRole: "org:member",
  organizationSlug: "acme",
  sessionId: "session_123",
  displayName: "A. User",
  authProvider: "clerk"
};

function invoke(middleware: RequestHandler, request: Partial<Request>) {
  const next = vi.fn();
  void middleware(request as Request, {} as never, next);
  return next;
}

describe("authenticated actor middleware", () => {
  it("rejects requests without verified identity", async () => {
    const resolver = vi.fn();
    const next = invoke(createRequireAuthenticatedActor(resolver), {});
    await vi.waitFor(() => expect(next).toHaveBeenCalled());
    expect(next.mock.calls[0]?.[0]).toMatchObject({ statusCode: 401, code: "AUTHENTICATION_REQUIRED" });
  });

  it("requires onboarding when no active membership exists", async () => {
    const resolver = vi.fn().mockResolvedValue(null);
    const next = invoke(createRequireAuthenticatedActor(resolver), { verifiedIdentity: identity });
    await vi.waitFor(() => expect(next).toHaveBeenCalled());
    expect(next.mock.calls[0]?.[0]).toMatchObject({ statusCode: 403, code: "WORKSPACE_ONBOARDING_REQUIRED" });
  });

  it("attaches the server-derived actor", async () => {
    const context: WorkspaceContext = {
      actor: {
        userId: null,
        externalUserId: identity.externalUserId,
        workspaceId: "00000000-0000-4000-8000-000000000002",
        externalOrganizationId: identity.externalOrganizationId,
        membershipId: "00000000-0000-4000-8000-000000000003",
        role: "finance_operator",
        capabilities: ["workspace.read"],
        displayName: identity.displayName,
        sessionId: identity.sessionId,
        authProvider: "clerk"
      },
      workspace: {
        id: "00000000-0000-4000-8000-000000000002",
        name: "Acme",
        slug: "acme",
        status: "active",
        externalProvider: "clerk",
        externalOrganizationId: identity.externalOrganizationId,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString()
      }
    };
    const resolver = vi.fn().mockResolvedValue(context);
    const request = { verifiedIdentity: identity } as Partial<Request>;
    const next = invoke(createRequireAuthenticatedActor(resolver), request);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith());
    expect(request.authenticatedActor).toEqual(context.actor);
  });
});
