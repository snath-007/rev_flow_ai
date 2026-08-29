# Phase 6 Product Experience Blueprint

Status: accepted for Milestones 2, 5, 6, and 7  
Date: 2026-06-24

## Experience Boundary

RevFlow has two deliberately different surfaces.

Public site:

- Expressive product storytelling
- Shows the implemented contract-to-revenue lifecycle
- Uses polished product media and purposeful motion
- Directs users to sign in or open the seeded demo
- Makes no unsupported production or compliance claims

Authenticated application:

- Quiet, dense, task-focused workspace
- Prioritizes scanning, comparison, review, and repeated action
- Uses consistent tables, forms, tabs, drawers, status history, and approval bars
- Shows role-appropriate navigation and actions
- Keeps financial consequences and calculation evidence visible

The public site may be cinematic. The application must remain operational.

## Routing Decision

- Root route is the public RevFlow landing page.
- Sign-in and onboarding routes are public.
- The authenticated overview uses /overview.
- Existing domain URLs remain concise, such as /customers, /contracts, and /invoices.
- Next.js route groups may separate public and workspace layouts without adding URL noise.
- Middleware protects workspace routes; the Express API independently verifies every session.

## Information Architecture

Overview:

- Overview
- My review queue
- Recent activity and exceptions

Configure:

- Customers
- Catalog
- Contracts
- AI Intake

Operate:

- Usage
- Invoices
- Payments

Recognize:

- Revenue schedules
- Journal entries

Insights:

- Reports
- MRR and ARR
- Revenue waterfall
- AR aging and DSO

Control:

- Audit
- Operations

Workspace:

- Members
- Workspace settings
- Integrations

Navigation items are filtered by capabilities. A direct URL still performs page and API authorization.

## Primary Role Journeys

### Workspace Admin

1. Sign in and create or select a workspace.
2. Confirm workspace details and invite members.
3. Assign one of the fixed roles.
4. Review configuration and seeded demo readiness.
5. Inspect audit, operations, and deployment health.
6. Enter finance workflows when necessary.

Home emphasis: onboarding progress, workspace health, exceptions, and membership activity.

### Finance Operator

1. Create or select a customer.
2. Configure catalog, meters, plans, and pricing.
3. Create a contract or start AI extraction.
4. Submit work for human review.
5. Ingest usage and verify aggregates.
6. Generate invoices and revenue schedules.
7. Record and reconcile payments.
8. Inspect reports and operational exceptions.

Home emphasis: tasks due, usage readiness, draft invoices, payment exceptions, and recent activity.

### Reviewer

1. Open the review queue.
2. Compare source text and extracted fields.
3. Accept, reject, or edit individual decisions.
4. Apply approved extraction to draft configuration.
5. Approve eligible contracts and invoices as separate actions.
6. Inspect consequence, calculation evidence, actor, and resulting state.

Home emphasis: pending reviews, aging approvals, ambiguities, and recently completed decisions.

### Auditor

1. Open reports or audit search.
2. Filter by period, actor, entity, action, and status.
3. Follow records from report to invoice, contract, calculation snapshot, and audit history.
4. Inspect operations and AI provenance without mutation controls.
5. Export bounded evidence when enabled.

Home emphasis: read-only KPIs, exceptions, audit activity, and data completeness.

## Onboarding Checklist

Onboarding is domain-driven, not a decorative tour:

1. Create or select workspace.
2. Confirm workspace settings.
3. Invite or skip team setup.
4. Create first customer.
5. Configure product, meter, plan, and price rule.
6. Create or extract first contract.
7. Review and activate contract.
8. Ingest sample usage.
9. Generate and approve first invoice.
10. Generate revenue schedule and inspect audit trail.

Each step derives completion from persisted state and links to the next valid action.

## Workflow Interaction Rules

- Lists preserve filters and pagination when opening a detail view.
- Detail views show stable context, status, actor, timestamps, and related records.
- Create and edit use full pages for complex configuration and drawers for bounded edits.
- Approvals use a persistent action bar that states consequence and required capability.
- Disabled actions explain missing prerequisites next to the control.
- Finance-impacting actions confirm the exact record, period, currency, and resulting state.
- Optimistic UI never presents unpersisted finance state as final.
- Errors preserve entered data and expose a request or error identifier.
- AI review is structured field review with optional assistance, not a chat-first replacement.
- Audit history is reachable from every finance-impacting detail page.

## Visual Direction

RevFlow should feel precise, contemporary, and calm rather than resembling a generic billing template.

Foundation:

- Paper-white and soft-neutral work surfaces
- Graphite navigation and primary text
- Teal or green as the restrained product/action accent
- Blue for information
- Amber for warnings and review-needed states
- Coral or red only for destructive, overdue, or failed states

Typography:

- A distinctive display face is reserved for the public site and major product identity moments.
- A highly legible sans serif handles application UI.
- Monospace is limited to identifiers, amounts requiring alignment, event names, and technical metadata.
- Compact panels and sidebars use compact type, never hero-scale headings.

Shape and density:

- Border radii remain restrained, generally 4 to 8 pixels.
- Sections are unframed layouts; cards represent repeated records or genuinely bounded tools.
- Tables and review surfaces are dense but retain clear row rhythm.
- Fixed-format controls and counters use stable dimensions.
- Color never carries status without text or icon support.

Motion:

- Public motion explains lifecycle progression or product state.
- Application motion confirms navigation, drawer state, and persisted transitions.
- Reduced-motion preferences are honored.
- Decorative looping effects, gradient blobs, and ambient motion are excluded.

## Shared Component Contract

Milestone 5 standardizes:

- Application shell and mobile navigation
- Workspace switcher and user menu
- Breadcrumbs and page headers
- Action bars and approval bars
- Tabs and segmented controls
- Data tables, filters, pagination, and row menus
- Forms, field help, validation, and unsaved-change handling
- Dialogs and drawers
- Status badges and state timelines
- Money, quantity, period, actor, and identifier displays
- Loading skeletons, empty states, inline errors, and toasts
- Calculation and provenance panels
- Command palette for navigation and clear commands

## Public Landing Narrative

First viewport:

- RevFlow is the literal product headline.
- Supporting copy describes AI-assisted revenue operations with deterministic controls.
- A full-width real product scene shows the contract-to-revenue workflow.
- Primary action opens the demo or sign-in.
- A hint of the next section remains visible on desktop and mobile.

Lifecycle section:

- Contract
- AI Review
- Pricing
- Usage
- Invoice
- Revenue
- Audit

Evidence sections:

- Human-in-the-loop contract review
- Explainable pricing and usage snapshots
- Revenue schedules and journal evidence
- Role-specific operations and auditability
- Provider-neutral AI and production-forward boundaries

The site uses actual implemented states. Future work is labeled as future direction.

## Responsive And Accessibility Acceptance

Validate at representative mobile, tablet, laptop, and wide-desktop widths.

Required:

- No overlapping navigation, controls, labels, tables, or product media
- Long identifiers and labels wrap or truncate with accessible disclosure
- Keyboard-visible focus
- Semantic labels and error associations
- Sufficient contrast
- Touch targets appropriate for mobile
- Reduced-motion behavior
- Tables provide a usable narrow-screen strategy
- Public product media remains legible rather than becoming atmospheric decoration

## Reference Use

Zenskar informs workflow literacy, role-aware information architecture, onboarding, and review patterns.

The Emergent Ledger prototype informs compact navigation, workspace switching, command access, typography contrast, and dashboard rhythm.

Neither reference defines RevFlow branding, exact navigation, page composition, or product claims.
