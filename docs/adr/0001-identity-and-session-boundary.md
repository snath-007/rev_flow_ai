# ADR 0001 - Identity And Session Boundary

Status: accepted  
Date: 2026-06-24

## Context

RevFlow currently has no authentication. Domain routes accept requests without a verified user, workspace, role, or capability context. Phase 6 must introduce identity without coupling domain services to one vendor SDK.

The POC needs organization-aware sign-in, invitations, an active workspace, and server-verifiable sessions. It also needs deterministic local tests and a future path away from the first identity provider.

## Decision

Use Clerk for user authentication and organization selection in the Phase 6 hosted demo.

Clerk is responsible for:

- Sign-in, sign-out, session lifecycle, and user identity
- Organization creation, selection, and invitations
- Producing signed session tokens containing the authenticated user and active organization identifiers

RevFlow is responsible for:

- Mapping a Clerk organization identifier to an application workspace UUID
- Persisting workspace memberships and one fixed RevFlow role per membership
- Expanding the role into application capabilities
- Authorizing every API operation from server-derived workspace and membership data
- Recording the normalized actor on audit events

Clerk organization roles and permissions are not authoritative for domain authorization. They may support invitation and organization administration, but the API loads the RevFlow membership for every protected request. This keeps capability rules testable, auditable, and independent from provider plan limits or stale token claims.

## Authenticated Actor

The API middleware will expose a normalized actor with:

| Field | Meaning |
| --- | --- |
| userId | RevFlow user UUID, when an application user record is introduced |
| externalUserId | Clerk user identifier |
| workspaceId | RevFlow workspace UUID |
| externalOrganizationId | Clerk organization identifier |
| membershipId | RevFlow membership UUID |
| role | One fixed RevFlow role |
| capabilities | Capabilities expanded from the role on the server |
| displayName | Non-authoritative display value |
| email | Optional display/contact value |
| sessionId | Provider session identifier when available |
| authProvider | clerk, local_test, or system |

No route accepts userId, workspaceId, role, or capabilities from request JSON as authorization evidence.

## Token Handling

- The Express API verifies the Clerk token signature, issuer, audience or authorized party, expiry, and session state using the official backend SDK.
- The active organization claim is required for workspace-scoped routes.
- The API resolves the organization-to-workspace mapping and membership after verification.
- Raw bearer tokens, cookies, and complete token claims are never written to logs or audit records.
- The web application may proxy requests, but it cannot manufacture the authenticated actor.
- Health endpoints remain public and expose no tenant data.

## Local And Test Modes

- Local interactive development uses Clerk development keys.
- Automated tests use an injected authentication verifier and deterministic actor fixtures.
- A local_test verifier is allowed only when NODE_ENV is test, or when an explicit development-only flag is set.
- Production startup fails if a bypass verifier is configured.

## Consequences

Benefits:

- Clerk accelerates identity and organization onboarding.
- Domain services consume a stable RevFlow actor instead of vendor objects.
- Authorization changes are immediately reflected from the application database.
- A later identity-provider migration does not rewrite repositories or capability checks.

Costs:

- Organization and membership synchronization must be implemented.
- Protected API requests perform a membership lookup unless safely cached.
- Clerk organization roles cannot be assumed to match RevFlow roles.

## Rejected Alternatives

- Clerk roles as the only authority: rejected because domain capabilities and audit history should not depend on provider configuration.
- Client-supplied workspace headers: rejected because they allow confused-deputy and cross-tenant failures.
- Authentication only in Next.js: rejected because the Express API is independently reachable.
- Building password authentication in RevFlow: rejected as unnecessary POC security scope.

## References

- Clerk organizations: https://clerk.com/docs/guides/organizations/overview
- Clerk roles and permissions: https://clerk.com/docs/guides/organizations/control-access/roles-and-permissions
- Clerk backend token verification: https://clerk.com/docs/reference/backend/verify-token
