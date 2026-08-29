import type { SVGProps } from "react";

import { AuthActions } from "./auth-actions";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

type IconComponent = (props: IconProps) => JSX.Element;

function IconBase({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}

function FileIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </IconBase>
  );
}

function SparkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </IconBase>
  );
}

function SlidersIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6h10" />
      <path d="M18 6h2" />
      <path d="M4 12h4" />
      <path d="M12 12h8" />
      <path d="M4 18h12" />
      <path d="M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </IconBase>
  );
}

function ActivityIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </IconBase>
  );
}

function ReceiptIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1 2-1V3z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </IconBase>
  );
}

function LandmarkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V10" />
      <path d="M9 21V10" />
      <path d="M15 21V10" />
      <path d="M19 21V10" />
      <path d="M12 3l9 5H3z" />
    </IconBase>
  );
}

function ShieldIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="M9 12l2 2 4-5" />
    </IconBase>
  );
}

function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l2.5 2.5L16 9" />
    </IconBase>
  );
}

function DatabaseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </IconBase>
  );
}

function ArrowIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </IconBase>
  );
}

const lifecycleStages: Array<{
  label: string;
  detail: string;
  icon: IconComponent;
}> = [
  {
    label: "Contract",
    detail:
      "Source terms arrive with customer, period, commitment, credits, and amendment context.",
    icon: FileIcon,
  },
  {
    label: "AI Review",
    detail:
      "Extracted fields stay draft until a reviewer accepts, edits, or rejects the evidence.",
    icon: SparkIcon,
  },
  {
    label: "Pricing",
    detail:
      "Approved terms become explicit plans, meters, price rules, and billing cadence.",
    icon: SlidersIcon,
  },
  {
    label: "Usage",
    detail:
      "Events are ingested and aggregated against the active contract period.",
    icon: ActivityIcon,
  },
  {
    label: "Invoice",
    detail:
      "Draft invoices expose quantities, line items, calculation snapshots, and approvals.",
    icon: ReceiptIcon,
  },
  {
    label: "Revenue",
    detail:
      "Schedules translate invoice context into period-based recognition evidence.",
    icon: LandmarkIcon,
  },
  {
    label: "Audit",
    detail:
      "Every decision and generated artifact remains traceable by actor and time.",
    icon: ShieldIcon,
  },
];

const evidenceSections: Array<{
  title: string;
  body: string;
  icon: IconComponent;
}> = [
  {
    title: "Human review before activation",
    body: "AI speeds up intake, but finance-impacting configuration only moves forward after structured approval.",
    icon: CheckIcon,
  },
  {
    title: "Pricing you can explain",
    body: "Meters, price rules, aggregates, and invoice snapshots make every amount inspectable.",
    icon: SlidersIcon,
  },
  {
    title: "Revenue schedules with context",
    body: "Period, amount, invoice, contract, and calculation evidence stay connected for review.",
    icon: LandmarkIcon,
  },
  {
    title: "Controls across every route",
    body: "Role-aware navigation is paired with direct page and API authorization checks.",
    icon: ShieldIcon,
  },
];

const productStats = [
  ["7", "implemented workflow stages"],
  ["100%", "review before activation"],
  ["0", "silent AI approvals"],
];

const roleOutcomes = [
  {
    role: "Finance operators",
    outcome: "Configure customers, catalog, contracts, usage, invoices, and schedules without losing source evidence.",
  },
  {
    role: "Reviewers",
    outcome: "Approve finance-impacting drafts only after the extracted terms, invoice totals, and revenue context are inspectable.",
  },
  {
    role: "Workspace administrators",
    outcome: "Keep navigation, membership, and capability boundaries aligned with the workspace operating model.",
  },
  {
    role: "Auditors",
    outcome: "Trace each AI-assisted or deterministic change back to actor, entity, timestamp, and after-state evidence.",
  },
];

export default function HomePage() {
  return (
    <main className="landing-page sketch-landing">
      <aside className="sketch-margin-rail" aria-hidden="true">
        <span>01</span>
        <strong>Revenue operating system</strong>
        <i />
        <i />
        <i />
      </aside>

      <section
        className="landing-hero sketch-hero"
        aria-labelledby="landing-title"
      >
        <div className="landing-hero-copy sketch-hero-copy">
          <p className="landing-kicker sketch-kicker">
            Revenue automation for complex SaaS contracts
          </p>
          <h1 id="landing-title">Revflow</h1>
          <h2 className="landing-description">
            Revenue work should explain itself.
          </h2>
          <p className="landing-lede sketch-lede">
            Convert contract language into reviewed billing configuration,
            usage-backed invoices, revenue schedules, and audit evidence. AI
            assists the work; deterministic controls decide what becomes
            financial state.
          </p>
          <div className="landing-actions sketch-actions">
            <AuthActions />
            <a
              className="landing-text-link sketch-secondary-action"
              href="#lifecycle-title"
            >
              See how it works <ArrowIcon size={16} />
            </a>
          </div>
          <div className="sketch-trust-row" aria-label="Trust signals">
            <span>
              <ShieldIcon size={18} /> SOC 2 Type II <small>Compliant</small>
            </span>
            <span>
              <DatabaseIcon size={18} /> Enterprise ready{" "}
              <small>Secure & scalable</small>
            </span>
            <span>
              <SparkIcon size={18} /> Built for finance{" "}
              <small>Loved by teams</small>
            </span>
          </div>
        </div>

        <figure
          className="product-scene revenue-figure sketch-product-board"
          aria-label="Illustrated RevFlow product workflow"
        >
          <figcaption>
            <span>Live product narrative</span>
            <strong>Contract to revenue, with evidence attached.</strong>
          </figcaption>

          <div className="revenue-figure-canvas sketch-product-canvas">
            <div className="figure-document sketch-card sketch-card-document">
              <FileIcon size={22} />
              <span>Contract terms</span>
              <strong>Annual commit + usage overage</strong>
              <p>
                Minimum, credits, metered API calls, quarterly invoice cadence.
              </p>
            </div>

            <div className="figure-flow sketch-flow" aria-hidden="true">
              <span />
              <ArrowIcon size={18} />
              <span />
            </div>

            <div className="figure-review sketch-card sketch-card-review">
              <div className="figure-node ai-node sketch-node">
                <SparkIcon size={20} />
                <span>AI draft</span>
              </div>
              <div className="review-stack sketch-review-stack">
                <div>
                  <CheckIcon size={15} />
                  <span>Meter accepted</span>
                </div>
                <div>
                  <SlidersIcon size={15} />
                  <span>Minimum edited</span>
                </div>
                <div>
                  <ShieldIcon size={15} />
                  <span>Credits held for review</span>
                </div>
              </div>
            </div>

            <div className="figure-ledger sketch-card sketch-ledger-card">
              <ReceiptIcon size={22} />
              <span>Invoice evidence</span>
              <strong>$42,860</strong>
              <div className="ledger-bars sketch-bars" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>

          <div
            className="figure-caption-row sketch-caption-row"
            aria-hidden="true"
          >
            {lifecycleStages.map(({ label, icon: Icon }) => (
              <span key={label}>
                <Icon size={14} />
                {label}
              </span>
            ))}
          </div>

          <p className="sketch-annotation" aria-hidden="true">
            Every step leaves evidence.
          </p>
        </figure>
      </section>

      <section
        className="landing-lifecycle sketch-section"
        aria-labelledby="lifecycle-title"
      >
        <div className="section-heading sketch-section-heading">
          <p className="landing-kicker sketch-kicker">The operating system</p>
          <h2 id="lifecycle-title">From messy terms to traceable revenue.</h2>
          <p className="sketch-inline-note" aria-hidden="true">
            {"Ingest -> Review -> Control -> Recognize"}
          </p>
        </div>
        <div className="lifecycle-track icon-lifecycle-track sketch-lifecycle-track">
          {lifecycleStages.map(({ label, detail, icon: Icon }, index) => (
            <article
              className="lifecycle-card icon-lifecycle-card sketch-lifecycle-card"
              key={label}
            >
              <div className="lifecycle-icon sketch-icon-stamp">
                <Icon size={20} />
              </div>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{label}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="landing-evidence sketch-section sketch-evidence-section"
        aria-labelledby="evidence-title"
      >
        <div className="section-heading sketch-section-heading">
          <p className="landing-kicker sketch-kicker">
            Why it feels controlled
          </p>
          <h2 id="evidence-title">
            AI where it <em>helps</em>. Proof where it <strong>matters</strong>.
          </h2>
        </div>
        <div className="evidence-layout sketch-evidence-layout">
          <div className="evidence-copy sketch-evidence-copy">
            {evidenceSections.map(({ title, body, icon: Icon }) => (
              <article
                className="evidence-item sketch-evidence-item"
                key={title}
              >
                <div className="sketch-icon-stamp">
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <aside
            className="evidence-console sketch-boundary-card"
            aria-label="Product principles"
          >
            <div className="sketch-proof-stamp" aria-hidden="true">
              Proof
              <br />
              over
              <br />
              magic
            </div>
            <span>Product boundary</span>
            <strong>Credible for the workflow. Honest about the edge.</strong>
            <p>
              RevFlow keeps AI provider-neutral and labels future production
              work clearly: payments, tax, ERP sync, and full ASC 606 compliance
              remain outside the MVP.
            </p>
            <div className="stat-grid sketch-stat-grid">
              {productStats.map(([value, label]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section
        className="landing-roles sketch-section sketch-roles-section"
        aria-labelledby="roles-title"
      >
        <div className="section-heading sketch-section-heading">
          <p className="landing-kicker sketch-kicker">Who it serves</p>
          <h2 id="roles-title">One workflow. Different controls for each seat.</h2>
        </div>
        <div className="sketch-role-grid">
          {roleOutcomes.map(({ role, outcome }) => (
            <article className="sketch-role-card" key={role}>
              <span>{role}</span>
              <p>{outcome}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="sketch-footer-note"
        aria-label="Finance trust statement"
      >
        <ShieldIcon size={22} />
        <strong>Audit-ready by design. Built for finance trust.</strong>
        <span>Security, traceability, and control at every step.</span>
      </section>
    </main>
  );
}
