import type { CSSProperties, ReactNode } from "react";

type Breadcrumb = {
  href?: string;
  label: string;
};

export function WorkflowPageHeader({
  breadcrumbs,
  eyebrow,
  title,
  description,
  actions
}: {
  breadcrumbs: Breadcrumb[];
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="workflow-header">
      <nav aria-label="Breadcrumb" className="breadcrumb-trail">
        {breadcrumbs.map((item, index) => (
          <span key={`${item.label}-${index}`}>
            {item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
          </span>
        ))}
      </nav>
      <div className="workflow-title-row">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lede">{description}</p>
        </div>
        {actions ? <div className="workflow-header-actions">{actions}</div> : null}
      </div>
    </section>
  );
}

export function WorkflowGuide({
  title,
  items
}: {
  title: string;
  items: { href?: string; label: string; detail: string; status?: "done" | "active" | "blocked" | "idle" }[];
}) {
  return (
    <section className="workflow-guide" aria-label={title}>
      <div className="table-header">
        <h2>{title}</h2>
        <span>{items.length} steps</span>
      </div>
      <div className="workflow-step-list">
        {items.map((item, index) => {
          const content = (
            <>
              <span className={`workflow-step-index ${item.status ?? "idle"}`}>{index + 1}</span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
            </>
          );

          return item.href ? (
            <a href={item.href} key={item.label}>{content}</a>
          ) : (
            <div key={item.label}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  accent = "teal"
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  accent?: "teal" | "blue" | "terracotta" | "amber";
}) {
  const bars = accent === "terracotta" ? [38, 72, 48, 86, 54, 64, 78, 58] : accent === "amber" ? [26, 44, 58, 38, 72, 48, 62, 80] : [44, 58, 34, 72, 48, 86, 64, 76];

  return (
    <div className={`visual-metric-card accent-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      <div className="metric-spark" aria-hidden="true">
        {bars.map((height, index) => <i key={`${label}-${index}`} style={{ height: `${height}%` }} />)}
      </div>
    </div>
  );
}

export function EvidenceStrip({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <section className="evidence-strip" aria-label="Evidence summary">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </section>
  );
}

export function VisualBars({
  title,
  items
}: {
  title: string;
  items: { label: string; value: number; max?: number; color?: string }[];
}) {
  const fallbackMax = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="visual-bars" aria-label={title}>
      <h2>{title}</h2>
      {items.map((item) => {
        const max = item.max ?? fallbackMax;
        const width = Math.max(4, Math.min(100, Math.round((item.value / Math.max(1, max)) * 100)));
        const style = {
          "--bar-value": `${width}%`,
          "--bar-color": item.color ?? "var(--teal)"
        } as CSSProperties;

        return (
          <div className="bar-row" key={item.label}>
            <span>{item.label}</span>
            <div className="bar-track" role="img" aria-label={`${item.label}: ${item.value}`}>
              <i className="bar-fill" style={style} />
            </div>
            <strong className="bar-value">{item.value}</strong>
          </div>
        );
      })}
    </section>
  );
}

export function TimelinePanel({
  title,
  items
}: {
  title: string;
  items: { label: string; detail: string }[];
}) {
  return (
    <section className="timeline-panel" aria-label={title}>
      <h2>{title}</h2>
      <div className="timeline-list">
        {items.map((item, index) => (
          <div className="timeline-item" key={`${item.label}-${index}`}>
            <span className="timeline-dot">{index + 1}</span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}


export function PipelineMap({
  items
}: {
  items: { label: string; value: number; detail: string; href?: string; tone?: "blue" | "teal" | "terracotta" | "amber" }[];
}) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="pipeline-map" aria-label="Revenue pipeline map">
      {items.map((item, index) => {
        const width = Math.max(12, Math.round((item.value / max) * 100));
        const content = (
          <>
            <span className={`pipeline-index tone-${item.tone ?? "blue"}`}>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
            <i style={{ "--pipeline-value": `${width}%` } as CSSProperties} />
          </>
        );

        return item.href ? <a className="pipeline-node" href={item.href} key={item.label}>{content}</a> : <div className="pipeline-node" key={item.label}>{content}</div>;
      })}
    </section>
  );
}

export function QueueBoard({
  title,
  items
}: {
  title: string;
  items: { label: string; value: number; detail: string; href?: string; tone?: "blue" | "teal" | "terracotta" | "amber" | "danger" }[];
}) {
  return (
    <section className="queue-board" aria-label={title}>
      <div className="table-header"><h2>{title}</h2><span>{items.reduce((sum, item) => sum + item.value, 0)} signals</span></div>
      <div className="queue-list">
        {items.map((item) => {
          const content = (
            <>
              <strong className={`queue-value tone-${item.tone ?? "blue"}`}>{item.value}</strong>
              <span><b>{item.label}</b><small>{item.detail}</small></span>
            </>
          );

          return item.href ? <a href={item.href} key={item.label}>{content}</a> : <div key={item.label}>{content}</div>;
        })}
      </div>
    </section>
  );
}

export function DonutMetric({
  title,
  value,
  total,
  detail,
  tone = "teal"
}: {
  title: string;
  value: number;
  total: number;
  detail: string;
  tone?: "blue" | "teal" | "terracotta" | "amber" | "danger";
}) {
  const percent = total <= 0 ? 0 : Math.round((value / total) * 100);

  return (
    <section className={`donut-metric tone-${tone}`} aria-label={title}>
      <div className="donut-ring" style={{ "--donut-value": `${percent}%` } as CSSProperties}>
        <strong>{percent}%</strong>
      </div>
      <span>
        <b>{title}</b>
        <small>{detail}</small>
      </span>
    </section>
  );
}
export function NextAction({
  href,
  title,
  children
}: {
  href?: string;
  title: string;
  children: ReactNode;
}) {
  const content = (
    <>
      <strong>{title}</strong>
      <span>{children}</span>
    </>
  );

  return href ? <a className="next-action" href={href}>{content}</a> : <div className="next-action">{content}</div>;
}

export function BlockedNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="blocked-notice" role="note">
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}