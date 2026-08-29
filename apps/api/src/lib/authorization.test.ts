import type { Request, RequestHandler } from "express";
import { describe, expect, it, vi } from "vitest";
import {
  roleCapabilities,
  type AuthenticatedActor,
  type Capability,
} from "@revflow/shared";

import { requireCapability } from "./authorization.js";

function actorWith(capabilities: Capability[]): AuthenticatedActor {
  return {
    userId: null,
    externalUserId: "user_123",
    workspaceId: "00000000-0000-4000-8000-000000000001",
    externalOrganizationId: "org_123",
    membershipId: "00000000-0000-4000-8000-000000000002",
    role: "finance_operator",
    capabilities,
    displayName: "Finance User",
    sessionId: "session_123",
    authProvider: "local_test",
  };
}

function invoke(middleware: RequestHandler, request: Partial<Request>) {
  const next = vi.fn();
  middleware(request as Request, {} as never, next);
  return next;
}

describe("capability authorization", () => {
  it("rejects requests without an authenticated actor", () => {
    const next = invoke(requireCapability("customers.read"), {});
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      statusCode: 401,
      code: "AUTHENTICATION_REQUIRED",
    });
  });

  it("rejects actors without the required capability", () => {
    const next = invoke(requireCapability("customers.write"), {
      authenticatedActor: actorWith(["customers.read"]),
    });
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      statusCode: 403,
      code: "AUTHORIZATION_FORBIDDEN",
    });
  });

  it("allows actors with the required capability", () => {
    const next = invoke(requireCapability("customers.write"), {
      authenticatedActor: actorWith(["customers.read", "customers.write"]),
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("keeps fixed role boundaries aligned with the Phase 6 RBAC contract", () => {
    expect(roleCapabilities.auditor).not.toContain("customers.write");
    expect(roleCapabilities.auditor).not.toContain("invoices.generate");
    expect(roleCapabilities.auditor).not.toContain("integrations.export");
    expect(roleCapabilities.finance_operator).toContain("invoices.generate");
    expect(roleCapabilities.finance_operator).toContain("integrations.export");
    expect(roleCapabilities.finance_operator).not.toContain("invoices.approve");
    expect(roleCapabilities.reviewer).toContain("contracts.approve");
    expect(roleCapabilities.reviewer).not.toContain("contracts.write");
    expect(roleCapabilities.reviewer).not.toContain("integrations.export");
    expect(roleCapabilities.workspace_admin).toContain("members.manage");
  });
});
