import type { AuthenticatedActor } from "@revflow/shared";

export type VerifiedIdentity = {
  externalUserId: string;
  externalOrganizationId: string;
  organizationRole: string | null;
  organizationSlug: string | null;
  sessionId: string | null;
  displayName: string | null;
  authProvider: "clerk" | "local_test";
};

export type WorkspaceContext = {
  actor: AuthenticatedActor;
  workspace: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "suspended";
    externalProvider: "clerk" | "local";
    externalOrganizationId: string;
    createdAt: string;
    updatedAt: string;
  };
};
