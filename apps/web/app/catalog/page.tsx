import { WorkspaceShell } from "../workspace-shell";
import { getAuthenticationContext, listMeters, listPlans, listPriceRules, listProducts } from "@/lib/api-client";
import { hasCapability } from "@/lib/access";
import { NextAction, WorkflowGuide, WorkflowPageHeader } from "../workflow-components";
import { PermissionNotice } from "../permission-notice";

import { CatalogWorkspace } from "./catalog-workspace";

export default async function CatalogPage() {
  const [context, products, meters, plans, priceRules] = await Promise.all([
    getAuthenticationContext(),
    listProducts(),
    listMeters(),
    listPlans(),
    listPriceRules()
  ]);
  const canWriteCatalog = context.status === "ready" && hasCapability(context.actor, "catalog.write");
  const catalogReady = products.length > 0 && meters.length > 0 && plans.length > 0 && priceRules.length > 0;

  return (
    <WorkspaceShell activePath="/catalog">
      <main className="workspace-page page-grid">
        <WorkflowPageHeader
          breadcrumbs={[{ href: "/overview", label: "Overview" }, { label: "Catalog" }]}
          eyebrow="Configure"
          title="Commercial configuration"
          description="Build and maintain the reusable pricing ingredients that contracts consume: products, meters, plans, and price rules."
        />

        <WorkflowGuide
          title="Catalog readiness"
          items={[
            { label: "Product", detail: `${products.length} configured`, status: products.length > 0 ? "done" : "active" },
            { label: "Meter", detail: `${meters.length} configured`, status: meters.length > 0 ? "done" : products.length > 0 ? "active" : "blocked" },
            { label: "Plan", detail: `${plans.length} configured`, status: plans.length > 0 ? "done" : products.length > 0 ? "active" : "blocked" },
            { label: "Price rule", detail: `${priceRules.length} configured`, status: priceRules.length > 0 ? "done" : plans.length > 0 ? "active" : "blocked" }
          ]}
        />
        {!canWriteCatalog ? <PermissionNotice capability="catalog.write" label="Catalog changes" /> : null}
        <CatalogWorkspace canWrite={canWriteCatalog} meters={meters} plans={plans} priceRules={priceRules} products={products} />

        {catalogReady ? <NextAction href="/contracts" title="Next: draft contract">Attach customer terms to the prepared catalog and move into approval.</NextAction> : null}
      </main>
    </WorkspaceShell>
  );
}