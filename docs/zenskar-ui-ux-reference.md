# Zenskar UI/UX Reference For RevFlow

Research date: 2026-06-22

## Scope And Evidence

This note uses Zenskar's public website, public documentation, and publicly hosted product screenshots as design research for RevFlow Phase 6.

The authenticated Zenskar application is not publicly inspectable without an account. Some marketing screenshots are illustrative composites, and Zenskar's analytics documentation explicitly says its example dashboards and screenshots are illustrative. Therefore:

- Documented workflows and permission semantics are treated as factual.
- Visible layout patterns are treated as directional evidence.
- Exact current production navigation, responsive behavior, and all role defaults are not assumed.
- RevFlow should adapt the operating principles, not copy branding or recreate every enterprise feature.

## Product And Feature Structure

Zenskar presents the product around order-to-cash outcomes rather than technical services.

Public feature groups include:

- Billing
- Revenue recognition
- Accounts receivable
- Analytics
- Contract AI
- Usage metering
- Entitlements
- Customer portal
- Integrations
- Agents marketplace

Its documentation expands these into operational modules:

- Customers
- Contracts
- Plans
- Products and pricing models
- Usage events, data ingestion, and billable metrics
- Accounting and revenue recognition
- Monitoring and analytics
- Invoices, payments, payment methods, and credit notes
- Settings, API keys, SSO, two-factor authentication, and webhooks
- Entitlements
- Users, roles, communications, templates, and business entities
- CRM, ERP, payment, tax, and data-source integrations

### RevFlow Implication

RevFlow should group navigation by operator outcome:

- Overview
- Configure: Customers, Catalog, Contracts
- Meter: Usage and Aggregates
- Bill: Invoices and future Payments
- Recognize: Revenue
- Review: AI Intake and Audit
- Insights: Reports
- System: Ops, Integrations, Settings

AI contract intake should be contextually associated with Contracts/Review even if the existing route remains `/ai`. It should not feel like an isolated novelty product.

## Onboarding Model

Zenskar exposes three onboarding layers.

### Account Foundation

Creating an account creates an organization. A default business entity is created for that organization, and newly created customers are assigned to the default entity.

### In-Product Quickstart

The documented first successful billing journey is:

1. Add a customer
2. Ingest usage events
3. Define billable metrics
4. Create a contract and add products
5. Generate an invoice

This is workflow onboarding, not a generic product tour.

### Enterprise Implementation

The public implementation process is:

1. Discovery
2. Solutioning
3. Configuration
4. Testing and validation
5. Go-live

Configuration includes contract parsing, product/pricing setup, integrations, alerts, approvals, and access control. Testing validates invoices, revenue recognition, and end-to-end integration behavior before go-live.

### RevFlow Implication

RevFlow should combine:

- A short workspace setup flow: workspace name, default currency, timezone, and first admin
- A persistent first-run checklist tied to real workflow records
- Contextual empty states that route users to the next valid action
- A demo workspace option with seeded data
- A completion path: Customer -> Catalog/Meter -> Contract/AI Review -> Usage -> Invoice -> Revenue

Do not build a long decorative onboarding carousel. Progress should come from completing actual domain steps.

## Users, Roles, And Permissions

Zenskar uses both role-based and permission-based authorization.

Documented concepts:

- A permission is an allowed verb on a resource.
- A role is a collection of permissions.
- A user is bound to one role.
- A user can receive additional permissions beyond the assigned role.
- Permission verbs include Read, Write, Delete, and Approve.
- Approve is specifically documented for invoices.
- User management has separate Read, Write, and Delete permissions.
- Role administration uses searchable Available Permissions and Granted Permissions panels.
- Public screenshots show example role names such as admin, Accounting, Administrator, and Sales; these should be treated as examples, not guaranteed system defaults.

Documented permission resources include:

- Accounting
- Aggregate
- Analytics
- Contract
- Credit Notes
- Customer
- Data Sources
- Integrations
- Invoices
- Jobs
- Monitors
- Payments
- Payment Methods
- Product
- Raw Metric
- Roles
- Template
- Triggers
- User

### RevFlow Implication

The Phase 6 capability-based design is the right direction.

Keep the initial fixed roles:

- Workspace Admin
- Finance Operator
- Reviewer
- Auditor

Implement capabilities underneath those roles. Do not build a custom role editor in the core POC. The capability model should nevertheless use consistent verbs and resources so a later dual-list role editor is possible.

Recommended verbs:

- Read
- Write
- Approve
- Manage

Delete should be rare in finance workflows. Prefer void, reverse, deactivate, or archive where history must remain intact.

Authorization must be enforced in the API. Navigation visibility and disabled controls are only secondary UX.

## Visible Application Patterns

### Shell And Navigation

Public documentation screenshots show:

- A dark left-side navigation/account rail
- A light, full-width work canvas
- User, Settings, and Logout actions in the account area
- An account/environment toggle near the profile area
- Dense operational screens rather than marketing layouts

### Page Headers

Common administration patterns include:

- Breadcrumb or section context above the title
- Page title and brief supporting text on the left
- Primary action aligned top-right
- Secondary cancel/filter actions beside the primary action
- Large uninterrupted work areas instead of nested cards

### Tables And Lists

Users and roles use:

- Dense tables
- Search and filter controls
- Primary create action at top-right
- Row-level kebab menus for secondary/destructive actions
- Created-at/status/security columns
- Pagination or compact footer controls

### Forms And Configuration

Role editing uses:

- Full-width form layout
- Clear section labels
- Searchable dual-pane permission assignment
- Resource-grouped permissions
- Fixed action area with Cancel and Save/Update

Contract configuration uses:

- Strong section hierarchy
- Inline badges for new/changed records
- Targeted edit actions near each section or product
- Repeated product/pricing rows with calculation context
- Add Product, Add Phase, and Add Trial Phase commands
- Warning/information banners for consequential system behavior

### Drawers And Context Panels

Monitoring documentation describes selecting a monitor from a list and opening a right-side panel for contextual analysis. This is useful for quick inspection without losing list context.

### RevFlow Implication

RevFlow should adopt:

- Persistent left navigation and compact top context bar
- Full-width operational pages
- Header actions in predictable positions
- Search/filter/action table toolbars
- Detail tabs or section navigation
- Drawers for quick inspection
- Dialogs only for bounded actions
- Inline edit controls where context matters
- Status and warning banners for finance-impacting transitions

Avoid copying Zenskar's colors or marketing composites. RevFlow needs its own restrained semantic palette.

## AI Contract Workflow

Zenskar's documented AI contract flow is structured rather than chat-first:

1. Navigate to Contracts -> AI Contracts
2. Upload PDF contracts
3. Use a default or saved/custom extraction prompt
4. Review extracted customer, contract, phase, feature, product, pricing, quantity, cadence, and date fields
5. Edit fields and products directly
6. Create the contract only after review

Visible draft patterns include:

- Regenerate action when results are unsatisfactory
- Banner when a new customer or contract will be created
- More Details links
- One or more contract phases
- Product cards with pricing model and billing context
- New/changed badges
- Per-product Edit actions
- Add Product/Phase/Trial commands

The docs repeatedly warn that AI output must be reviewed.

### RevFlow Implication

RevFlow's existing human-review boundary is aligned, but Phase 6 should improve its presentation:

- Position AI Intake under Contracts or Review
- Keep the source and extraction metadata inspectable
- Use banners for "will create customer/draft contract"
- Group fields into Customer, Contract, Billing, Product/Pricing, and Revenue sections
- Prefer targeted inline edits over a generic chat experience
- Show accepted, edited, rejected, ambiguous, and missing states clearly
- Keep conversational assistance optional and subordinate to explicit field decisions
- Show the exact draft records that Apply will create
- Preserve normal contract approval as the activation gate

## Analytics And Reporting

Public analytics visuals show:

- Compact KPI row for MRR, ARR, committed ARR, and NRR
- Report tiles for financial, invoice, and usage summaries
- Bottom alert/action strip for upgrades, renewals, and risk
- Report navigation separated from dashboard content
- Secondary dimensions such as Product, Usage, Performance Obligation, Contracts, and Customer Segments
- AI prompt, visual chart builder, and SQL paths as different report-authoring modes

Zenskar's custom-dashboard docs state that dashboards are built through an integrated BI layer and can use visual or SQL editors. They emphasize filters, reusable questions, limited tile counts, indexed queries, and role-controlled sharing.

### RevFlow Implication

For Phase 6:

- Start with curated deterministic reports, not a general SQL builder
- Use a compact KPI band plus a small number of useful charts/tables
- Make report formulas and source records inspectable
- Add dimensions only when the current data model supports them
- Separate recurring metrics from pure usage revenue
- Keep NRR stretch-gated until cohort semantics are credible
- Use alerts/exceptions as an operational strip, not decorative badges
- Consider a BI integration only as a production-forward article, not a POC dependency

## Usage And Monitoring

Public usage visuals and docs show multiple ingestion paths:

- API
- File upload
- Data-source connectors
- Remote queries

Usage monitoring combines:

- Time-range selection
- Usage/credit/storage KPIs
- Comparative charts
- Expiry/limit notifications
- Contract or usage-aggregate monitors

### RevFlow Implication

RevFlow should retain API/manual usage ingestion for the core POC but structure the page so future upload and connector sources can fit. Usage Events, Aggregates, and Monitoring should become distinct tabs or views rather than one undifferentiated page.

## Invoice And Payment Lifecycle

Zenskar documents explicit invoice states:

- Draft
- Approved
- Partially Paid
- Paid
- Void
- Deleted only from Draft

Approved invoices become formal records and are adjusted through credit notes rather than editing/deleting history.

### RevFlow Implication

RevFlow's explicit draft/approve behavior is aligned. Phase 6 payment simulation should add Partially Paid and Paid through additive payment records. Avoid destructive edits to approved invoices; future corrections should use credit/void semantics.

## Customer Portal

Zenskar separates internal operations from a customer-facing portal. The portal exposes invoices, payments, entitlements, and profile management, with future reports/contracts/billing/payment-method/branding capabilities.

### RevFlow Implication

A customer-facing portal is not part of core Phase 6. Document it as a separate persona and future surface. Do not mix external customer permissions with internal workspace RBAC.

## Recommended RevFlow Navigation

`Overview`

`Configure`
- Customers
- Catalog
- Contracts
- AI Intake

`Operate`
- Usage
- Invoices
- Payments

`Recognize`
- Revenue

`Insights`
- Reports

`Control`
- Audit
- Ops

`Workspace`
- Members
- Roles summary
- Settings
- Integrations

This hierarchy is intentionally smaller than Zenskar's. RevFlow should demonstrate coherent workflows, not reproduce enterprise breadth.

## What RevFlow Should Not Copy

- Zenskar's brand colors, illustration style, or marketing compositions
- Every documented resource and permission
- A custom dashboard/SQL builder
- Every pricing model or integration
- Multi-entity accounting before basic workspace tenancy is secure
- Customer portal scope inside the internal operator application
- AI claims without equivalent implemented behavior
- Custom roles before fixed roles and server-side capability enforcement are proven

## Phase 6 Plan Adjustments

The Phase 6 checklist should preserve these decisions:

- Milestone 1 defines capability verbs/resources and workspace/business-entity terminology.
- Milestone 2 adds workspace setup plus a domain-driven first-run checklist.
- Milestone 4 keeps fixed POC roles but capability-based enforcement.
- Milestone 5 groups navigation by operator outcome and adopts table/header/action conventions.
- Milestone 6 makes AI review structured and contextually part of Contracts/Review.
- Milestone 7 uses curated deterministic reports instead of a report builder.
- Milestone 8 follows additive payment/invoice-state semantics.
- Customer portal, custom roles, and general BI remain deferred.

## Official Sources

- Zenskar product site: https://www.zenskar.com
- Zenskar quickstart: https://docs.zenskar.com/docs/quickstart-guide
- Add a customer: https://docs.zenskar.com/docs/quickstart-add-a-customer
- Create contract and products: https://docs.zenskar.com/docs/quickstart-create-contract-products
- AI contract creation: https://docs.zenskar.com/docs/create-a-contract-via-ai
- Users: https://docs.zenskar.com/docs/users
- Roles: https://docs.zenskar.com/docs/roles
- Business entities: https://docs.zenskar.com/docs/business-entities
- Monitoring: https://docs.zenskar.com/docs/monitoring
- Invoice lifecycle: https://docs.zenskar.com/docs/life-cycle-of-an-invoice
- Custom dashboards: https://docs.zenskar.com/docs/create-custom-dashboards
- Customer portal: https://docs.zenskar.com/docs/customer-facing-portal
- Implementation process: https://docs.zenskar.com/docs/what-does-zenskar-implementation-entail
- Billing feature: https://www.zenskar.com/feature/billing
- Revenue recognition feature: https://www.zenskar.com/feature/revenue-recognition
- Accounts receivable feature: https://www.zenskar.com/feature/accounts-receivable
- Analytics feature: https://www.zenskar.com/feature/analytics
- Contract AI feature: https://www.zenskar.com/feature/contracts-ai
- Usage feature: https://www.zenskar.com/feature/usage
