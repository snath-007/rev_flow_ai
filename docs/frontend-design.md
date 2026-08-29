# Frontend Design System Plan

## Decision

RevFlow will use:

- Tailwind CSS for layout, spacing, typography, and responsive styling
- shadcn/ui for accessible UI primitives
- lucide-react for icons
- react-hook-form plus Zod for complex forms and validation
- TanStack Table for dense operational tables
- TanStack Query for client-side API fetching and cache management
- Recharts for dashboards and revenue/usage charts
- Sonner for toast notifications

## Why This Stack

RevFlow is an enterprise workflow product. The UI needs to handle dense forms, tables, review flows, approvals, audit trails, and operational dashboards.

Tailwind plus shadcn/ui gives us enough structure to move quickly while still letting the product have its own visual identity.

## UI Principles

- Build the actual workflow first, not a marketing landing page.
- Keep screens dense but readable.
- Prefer clear tables, side panels, tabs, dialogs, and forms over decorative cards.
- Use icons for common actions.
- Make approval and state transitions visually obvious.
- Show calculation details where finance users need explainability.
- Treat auditability and error states as first-class UI surfaces.

## Planned UI Areas

### App Shell

- Sidebar navigation
- Top bar with environment/status indicators
- Main content region
- Toast region

### Core Screens

- Contract intake
- AI extraction review
- Catalog and pricing builder
- Meter configuration
- Usage events and aggregates
- Invoice list and invoice detail
- Revenue schedules
- Audit log
- Ops jobs

### Component Categories

- Status badges
- Money and quantity display helpers
- Date period display helpers
- Approval action bars
- Calculation breakdown panels
- Editable line item tables
- Empty states
- Error states
- Loading skeletons
## Phase 6 Experience Contract

The accepted [Phase 6 Product Experience Blueprint](./phase-6-product-experience-blueprint.md) refines this plan with the public/product boundary, information architecture, role journeys, landing narrative, responsive rules, and visual direction.

The public site may use expressive product storytelling. The authenticated application remains a quiet, dense operational workspace.
