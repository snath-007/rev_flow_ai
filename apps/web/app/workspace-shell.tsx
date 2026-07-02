import { UserButton } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { getAuthenticationContext } from "@/lib/api-client";
import { navigationForActor, type NavigationItem } from "@/lib/access";
import { isClerkConfigured } from "@/lib/auth-config";

const iconByHref: Record<string, string> = {
  "/overview": "M4 5h7v7H4z M13 5h7v4h-7z M13 11h7v8h-7z M4 14h7v5H4z",
  "/customers": "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 19a5 5 0 0 1 10 0 M16 10a2.5 2.5 0 1 0 0-5 M14 14.5a4.5 4.5 0 0 1 5 4.5",
  "/catalog": "M4 7l8-4 8 4-8 4z M4 7v10l8 4 8-4V7 M12 11v10",
  "/contracts": "M7 3h8l4 4v14H7z M15 3v5h4 M9 12h6 M9 16h6",
  "/ai": "M8 8h8a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z M9 13h.01 M15 13h.01 M12 8V5 M9 18v3 M15 18v3",
  "/usage": "M4 18h16 M6 15l3-4 4 2 5-7 M6 6h.01 M18 18h.01",
  "/invoices": "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6 M9 16h4",
  "/revenue": "M4 19h16 M7 16v-5 M12 16V6 M17 16v-8 M5 9l7-5 7 5",
  "/audit": "M12 3l7 3v5c0 4.5-2.8 8.4-7 10-4.2-1.6-7-5.5-7-10V6z M9 12l2 2 4-5",
  "/ops": "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v3 M12 19v3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M2 12h3 M19 12h3 M4.9 19.1 7 17 M17 7l2.1-2.1"
};

const navDetailByHref: Record<string, string> = {
  "/overview": "Command center",
  "/customers": "Billable accounts",
  "/catalog": "Plans, meters, rules",
  "/contracts": "Terms and approvals",
  "/ai": "Contract extraction",
  "/usage": "Metered events",
  "/invoices": "Draft billing",
  "/revenue": "Schedules and journals",
  "/audit": "Actor evidence",
  "/ops": "Job health"
};

function initials(name: string | null) {
  if (!name) {
    return "RF";
  }

  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "RF";
}

function NavIcon({ href }: { href: string }) {
  return (
    <svg aria-hidden="true" className="workspace-nav-icon" fill="none" viewBox="0 0 24 24">
      <path d={iconByHref[href] ?? iconByHref["/contracts"]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function NavLink({ activePath, item }: { activePath: string; item: NavigationItem }) {
  const isActive = activePath === item.href || (item.href !== "/overview" && activePath.startsWith(item.href + "/"));

  return (
    <a aria-current={isActive ? "page" : undefined} className={isActive ? "workspace-nav-link active" : "workspace-nav-link"} href={item.href}>
      <NavIcon href={item.href} />
      <span className="workspace-nav-copy">
        <strong>{item.label}</strong>
        <small>{navDetailByHref[item.href] ?? "Workspace route"}</small>
      </span>
    </a>
  );
}

function stageState(groups: { items: NavigationItem[] }[]) {
  const items = groups.flatMap((group) => group.items);
  const active = items.filter((item) => ["/customers", "/catalog", "/contracts", "/usage", "/invoices", "/revenue", "/audit"].includes(item.href)).length;
  return Math.min(active, 7);
}

export async function WorkspaceShell({ activePath, children }: { activePath: string; children: ReactNode }) {
  const context = await getAuthenticationContext();

  if (context.status !== "ready") {
    return (
      <main className="workspace-empty-state">
        <p className="eyebrow">Workspace required</p>
        <h1>Finish workspace onboarding</h1>
        <p className="lede">Create or select a workspace before opening RevFlow operations.</p>
        <a className="primary-link" href="/onboarding">Open onboarding</a>
      </main>
    );
  }

  const groups = navigationForActor(context.actor);
  const environment = process.env.NEXT_PUBLIC_APP_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "local demo");
  const activeStages = stageState(groups);

  return (
    <div className="workspace-app">
      <aside className="workspace-sidebar" aria-label="Workspace navigation">
        <a className="workspace-brand" href="/overview" aria-label="RevFlow overview">
          <span className="workspace-brand-mark">R</span>
          <span>
            <strong>RevFlow</strong>
            <small>Revenue workbench</small>
          </span>
        </a>

        <div className="workspace-lifecycle" aria-label="Revenue workflow coverage">
          <span className="workspace-lifecycle-label">Operating system</span>
          <div className="workspace-lifecycle-rail" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => <i className={index < activeStages ? "ready" : ""} key={index} />)}
          </div>
          <strong>{activeStages}/7 stages visible</strong>
        </div>

        <nav className="workspace-nav">
          {groups.map((group) => (
            <div className="workspace-nav-group" key={group.label}>
              <span className="workspace-nav-label">{group.label}</span>
              {group.items.map((item) => <NavLink activePath={activePath} item={item} key={item.href} />)}
            </div>
          ))}
        </nav>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-switcher" aria-label="Current workspace">
            <span>{context.workspace.name}</span>
            <small>{context.actor.role.replace(/_/g, " ")}</small>
          </div>
          <div className="workspace-topbar-actions">
            <span className="environment-pill">{environment}</span>
            {isClerkConfigured() ? (
              <UserButton />
            ) : (
              <span className="local-user-badge" aria-label="Current local user">{initials(context.actor.displayName)}</span>
            )}
          </div>
        </header>

        <div className="workspace-mobile-nav" aria-label="Mobile workspace navigation">
          {groups.flatMap((group) => group.items).map((item) => <NavLink activePath={activePath} item={item} key={item.href} />)}
        </div>

        {children}
      </div>
    </div>
  );
}