import { OrganizationSwitcher } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import { getAuthenticationContext } from "@/lib/api-client";
import { isClerkConfigured } from "@/lib/auth-config";

import { WorkspaceOnboardingForm } from "./onboarding-form";

function titleFromSlug(slug: string | null | undefined) {
  if (!slug) {
    return "My RevFlow Workspace";
  }

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function OnboardingPage() {
  if (isClerkConfigured()) {
    const session = await auth();

    if (!session.userId) {
      return null;
    }

    if (!session.orgId) {
      return (
        <main className="onboarding-page">
          <section className="onboarding-copy">
            <p className="eyebrow">Workspace setup</p>
            <h1>Select or create your organization</h1>
            <p>Organizations provide the identity boundary for an isolated RevFlow workspace. Invitations and existing memberships appear here.</p>
          </section>
          <OrganizationSwitcher afterCreateOrganizationUrl="/onboarding" afterSelectOrganizationUrl="/onboarding" hidePersonal />
        </main>
      );
    }
  }

  const context = await getAuthenticationContext();

  if (context.status === "ready") {
    return (
      <main className="workspace-ready-page">
        <section className="workspace-ready-copy" aria-labelledby="workspace-ready-title">
          <div className="workspace-ready-stamp" aria-hidden="true">Workspace<br />Ready</div>
          <p className="workspace-ready-eyebrow">Workspace ready</p>
          <h1 id="workspace-ready-title">{context.workspace.name}</h1>
          <span className="workspace-ready-rule" aria-hidden="true" />
          <p>
            Your identity and active workspace membership are connected. Every step from here leaves evidence - contract terms, AI review,
            pricing, usage, invoices, revenue, and audit.
          </p>
          <a className="primary-link workspace-ready-action" href="/overview">Enter RevFlow -&gt;</a>
          <div className="workspace-ready-trust" aria-label="Workspace trust signals">
            <span>SOC 2 Type II</span>
            <span>Enterprise ready</span>
            <span>Built for finance</span>
          </div>
        </section>
      </main>
    );
  }

  const initialName = isClerkConfigured()
    ? titleFromSlug((await auth()).orgSlug)
    : "RevFlow Demo";

  return (
    <main className="onboarding-page">
      <section className="onboarding-copy">
        <p className="eyebrow">Final setup</p>
        <h1>Name your RevFlow workspace</h1>
        <p>This workspace owns customers, contracts, billing configuration, and finance records.</p>
      </section>
      <WorkspaceOnboardingForm initialName={initialName} />
    </main>
  );
}
