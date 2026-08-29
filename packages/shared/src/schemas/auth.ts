import { z } from "zod";

export const workspaceRoleSchema = z.enum([
  "workspace_admin",
  "finance_operator",
  "reviewer",
  "auditor",
]);

export const capabilitySchema = z.enum([
  "workspace.read",
  "workspace.manage",
  "members.read",
  "members.manage",
  "customers.read",
  "customers.write",
  "catalog.read",
  "catalog.write",
  "contracts.read",
  "contracts.write",
  "contracts.approve",
  "usage.read",
  "usage.write",
  "invoices.read",
  "invoices.generate",
  "invoices.approve",
  "revenue.read",
  "revenue.generate",
  "ai.read",
  "ai.extract",
  "ai.review",
  "ai.apply",
  "payments.read",
  "payments.write",
  "reports.read",
  "integrations.export",
  "audit.read",
  "ops.read",
]);

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type Capability = z.infer<typeof capabilitySchema>;

const allCapabilities = capabilitySchema.options;

export const roleCapabilities: Record<WorkspaceRole, readonly Capability[]> = {
  workspace_admin: allCapabilities,
  finance_operator: [
    "workspace.read",
    "customers.read",
    "customers.write",
    "catalog.read",
    "catalog.write",
    "contracts.read",
    "contracts.write",
    "usage.read",
    "usage.write",
    "invoices.read",
    "invoices.generate",
    "revenue.read",
    "revenue.generate",
    "ai.read",
    "ai.extract",
    "payments.read",
    "payments.write",
    "reports.read",
    "integrations.export",
    "audit.read",
    "ops.read",
  ],
  reviewer: [
    "workspace.read",
    "customers.read",
    "catalog.read",
    "contracts.read",
    "contracts.approve",
    "usage.read",
    "invoices.read",
    "invoices.approve",
    "revenue.read",
    "ai.read",
    "ai.review",
    "ai.apply",
    "payments.read",
    "reports.read",
    "audit.read",
    "ops.read",
  ],
  auditor: [
    "workspace.read",
    "customers.read",
    "catalog.read",
    "contracts.read",
    "usage.read",
    "invoices.read",
    "revenue.read",
    "ai.read",
    "payments.read",
    "reports.read",
    "audit.read",
    "ops.read",
  ],
};

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "suspended"]),
  externalProvider: z.enum(["clerk", "local"]),
  externalOrganizationId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workspaceMembershipSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  externalUserId: z.string(),
  role: workspaceRoleSchema,
  status: z.enum(["active", "disabled"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const authenticatedActorSchema = z.object({
  userId: z.string().uuid().nullable(),
  externalUserId: z.string(),
  workspaceId: z.string().uuid(),
  externalOrganizationId: z.string(),
  membershipId: z.string().uuid(),
  role: workspaceRoleSchema,
  capabilities: z.array(capabilitySchema),
  displayName: z.string().nullable(),
  sessionId: z.string().nullable(),
  authProvider: z.enum(["clerk", "local_test", "system"]),
});

export const onboardWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(63)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens",
    ),
});

export const authenticationContextSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("onboarding_required"),
    externalUserId: z.string(),
    externalOrganizationId: z.string(),
  }),
  z.object({
    status: z.literal("ready"),
    actor: authenticatedActorSchema,
    workspace: workspaceSchema,
  }),
]);

export type AuthenticatedActor = z.infer<typeof authenticatedActorSchema>;
export type AuthenticationContext = z.infer<typeof authenticationContextSchema>;
export type OnboardWorkspaceInput = z.output<typeof onboardWorkspaceSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspaceMembership = z.infer<typeof workspaceMembershipSchema>;
