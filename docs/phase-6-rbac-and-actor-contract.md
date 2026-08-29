# Phase 6 RBAC And Actor Contract

Status: accepted for Milestones 2-4  
Date: 2026-06-24

## Authorization Model

RevFlow starts with four fixed workspace roles and a capability-based API policy layer.

Roles are assignment conveniences. Capabilities are the authorization contract. API middleware checks capabilities, repositories enforce workspace ownership, and the web application uses the same capability names only to shape navigation and actions.

A hidden button is never an authorization control.

## Fixed Roles

| Role | Purpose |
| --- | --- |
| workspace_admin | Workspace, membership, configuration, finance, and operational administration |
| finance_operator | Day-to-day customer, catalog, contract, usage, billing, payment, revenue, and AI intake work |
| reviewer | Human review and approval with broad read access but no workspace administration |
| auditor | Read-only inspection of configuration, finance records, reports, audit, and operations |

One membership has one role in the POC. Custom roles and per-user capability grants remain future scope.

## Capability Vocabulary

Use resource.verb names. Read, write, generate, approve, review, apply, and manage remain distinct because they represent materially different control boundaries.

| Capability | Admin | Finance operator | Reviewer | Auditor |
| --- | :---: | :---: | :---: | :---: |
| workspace.read | Yes | Yes | Yes | Yes |
| workspace.manage | Yes | No | No | No |
| members.read | Yes | No | No | No |
| members.manage | Yes | No | No | No |
| customers.read | Yes | Yes | Yes | Yes |
| customers.write | Yes | Yes | No | No |
| catalog.read | Yes | Yes | Yes | Yes |
| catalog.write | Yes | Yes | No | No |
| contracts.read | Yes | Yes | Yes | Yes |
| contracts.write | Yes | Yes | No | No |
| contracts.approve | Yes | No | Yes | No |
| usage.read | Yes | Yes | Yes | Yes |
| usage.write | Yes | Yes | No | No |
| invoices.read | Yes | Yes | Yes | Yes |
| invoices.generate | Yes | Yes | No | No |
| invoices.approve | Yes | No | Yes | No |
| revenue.read | Yes | Yes | Yes | Yes |
| revenue.generate | Yes | Yes | No | No |
| ai.read | Yes | Yes | Yes | Yes |
| ai.extract | Yes | Yes | No | No |
| ai.review | Yes | No | Yes | No |
| ai.apply | Yes | No | Yes | No |
| payments.read | Yes | Yes | Yes | Yes |
| payments.write | Yes | Yes | No | No |
| reports.read | Yes | Yes | Yes | Yes |
| audit.read | Yes | Yes | Yes | Yes |
| ops.read | Yes | Yes | Yes | Yes |

Reviewers can apply approved AI extraction results to draft contract configuration, but cannot approve the resulting contract unless they also have contracts.approve, which they do in the fixed reviewer role. These remain separate API calls and audit events.

## Route Policy

| Route group | Read | Create or update | Controlled transition |
| --- | --- | --- | --- |
| Workspace | workspace.read | workspace.manage | workspace.manage |
| Members | members.read | members.manage | members.manage |
| Customers | customers.read | customers.write | customers.write |
| Catalog | catalog.read | catalog.write | catalog.write |
| Contracts | contracts.read | contracts.write | contracts.approve |
| Usage | usage.read | usage.write | usage.write |
| Invoices | invoices.read | invoices.generate | invoices.approve |
| Revenue | revenue.read | revenue.generate | revenue.generate |
| AI extraction | ai.read | ai.extract | ai.review or ai.apply |
| Payments | payments.read | payments.write | payments.write |
| Reports | reports.read | none | none |
| Audit | audit.read | none | none |
| Operations | ops.read | none | none |

Milestone 4 must map every concrete endpoint from the Milestone 0 inventory to exactly one required capability and include the mapping in tests.

## Authorization Order

For a protected request:

1. Verify the identity-provider session.
2. Require an active external organization.
3. Resolve the RevFlow workspace.
4. Load an active membership for the verified user and workspace.
5. Expand its fixed role to server-owned capabilities.
6. Check the route capability.
7. Pass AuthenticatedActor and workspaceId into the service.
8. Scope every repository query by workspaceId.
9. Record actor and workspace on finance-impacting audit events.

Authentication failure returns unauthorized. A valid identity without an active workspace or membership returns forbidden. A resource belonging to another workspace returns not found.

## Membership Safety

- A member cannot alter their own role through a general profile endpoint.
- The last active workspace admin cannot be removed or demoted in the POC.
- Invitation acceptance does not grant a RevFlow role beyond the server-selected default.
- Membership changes require members.manage and create an audit event.
- Role values are validated against the fixed role set.
- Capability arrays from clients or identity-provider metadata are ignored.

## AuthenticatedActor Type

The shared application contract should contain:

| Field | Type | Notes |
| --- | --- | --- |
| userId | UUID or null | RevFlow user UUID if persisted |
| externalUserId | string | Verified Clerk user identifier |
| workspaceId | UUID | Authoritative tenant key |
| externalOrganizationId | string | Verified active Clerk organization |
| membershipId | UUID | Active RevFlow membership |
| role | fixed role | Server-loaded role |
| capabilities | capability array | Server-expanded and immutable per request |
| displayName | string or null | Display only |
| sessionId | string or null | Trace context, not authorization |
| authProvider | clerk, local_test, or system | Actor origin |

Services receive this object or a narrower derived command context. They do not receive Clerk SDK objects.

## Audit Actor Contract

Audit records should add structured actor and request context while retaining the current actor text during migration:

| Field | Purpose |
| --- | --- |
| workspace_id | Tenant boundary |
| actor_type | user or system |
| actor_user_id | Optional RevFlow user UUID |
| actor_external_user_id | Provider user identifier for traceability |
| actor_membership_id | Membership used for authorization |
| actor_display_name | Human-readable snapshot |
| actor_role | Role snapshot at action time |
| auth_provider | clerk, local_test, or system |
| request_id | Correlates request logs and audit events |
| actor | Backward-compatible display text during migration |

Do not store bearer tokens, cookies, complete identity claims, source contract text, or provider secrets in audit records.

System and worker actions use actor_type system, include workspace_id, and identify the initiating user separately when a queued command was user-triggered.

## Required Tests

- Anonymous and invalid-token rejection
- Missing active workspace rejection
- Inactive membership rejection
- Every role against every mutation capability
- Approval separation for contracts and invoices
- AI extract versus review versus apply separation
- Workspace-admin membership controls and self-escalation prevention
- Auditor mutation denial
- Deep-link/API denial when navigation is hidden
- Cross-workspace list, detail, and mutation isolation
- Queue actor/workspace propagation
- Audit actor and workspace attribution
