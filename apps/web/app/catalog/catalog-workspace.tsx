"use client";

import type { Meter, Plan, PriceRule, Product } from "@revflow/shared";
import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type CatalogTab = "products" | "meters" | "plans" | "priceRules";

type CatalogWorkspaceProps = {
  canWrite: boolean;
  products: Product[];
  meters: Meter[];
  plans: Plan[];
  priceRules: PriceRule[];
};

const tabLabels: Record<CatalogTab, string> = {
  products: "Products",
  meters: "Meters",
  plans: "Plans",
  priceRules: "Price rules"
};

function csvEscape(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function includesTerm(values: (string | number | null | undefined)[], term: string) {
  return values.some((value) => String(value ?? "").toLowerCase().includes(term));
}

export function CatalogWorkspace({ canWrite, products, meters, plans, priceRules }: CatalogWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CatalogTab>("products");
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product.name])), [products]);
  const meterById = useMemo(() => new Map(meters.map((meter) => [meter.id, meter.name])), [meters]);
  const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan.name])), [plans]);
  const term = query.trim().toLowerCase();

  const filteredProducts = useMemo(() => products.filter((product) => !term || includesTerm([product.name, product.description, product.status], term)), [products, term]);
  const filteredMeters = useMemo(() => meters.filter((meter) => !term || includesTerm([meter.name, productById.get(meter.productId), meter.eventName, meter.aggregationType, meter.unit], term)), [meters, productById, term]);
  const filteredPlans = useMemo(() => plans.filter((plan) => !term || includesTerm([plan.name, productById.get(plan.productId), plan.billingInterval, plan.status], term)), [plans, productById, term]);
  const filteredPriceRules = useMemo(() => priceRules.filter((priceRule) => !term || includesTerm([planById.get(priceRule.planId), priceRule.meterId ? meterById.get(priceRule.meterId) : "None", priceRule.pricingModel, priceRule.currency, priceRule.unitPrice], term)), [meterById, planById, priceRules, term]);

  const activeCount = activeTab === "products" ? filteredProducts.length : activeTab === "meters" ? filteredMeters.length : activeTab === "plans" ? filteredPlans.length : filteredPriceRules.length;
  const totalCount = activeTab === "products" ? products.length : activeTab === "meters" ? meters.length : activeTab === "plans" ? plans.length : priceRules.length;

  function exportActiveTab() {
    if (activeTab === "products") {
      downloadCsv("revflow-products.csv", [["Name", "Description", "Status", "Created"], ...filteredProducts.map((product) => [product.name, product.description, product.status, new Date(product.createdAt).toLocaleDateString()])]);
    }
    if (activeTab === "meters") {
      downloadCsv("revflow-meters.csv", [["Name", "Product", "Event", "Aggregation", "Unit"], ...filteredMeters.map((meter) => [meter.name, productById.get(meter.productId) ?? "Unknown", meter.eventName, meter.aggregationType, meter.unit])]);
    }
    if (activeTab === "plans") {
      downloadCsv("revflow-plans.csv", [["Name", "Product", "Interval", "Status"], ...filteredPlans.map((plan) => [plan.name, productById.get(plan.productId) ?? "Unknown", plan.billingInterval, plan.status])]);
    }
    if (activeTab === "priceRules") {
      downloadCsv("revflow-price-rules.csv", [["Plan", "Meter", "Model", "Currency", "Unit price"], ...filteredPriceRules.map((priceRule) => [planById.get(priceRule.planId) ?? "Unknown", priceRule.meterId ? meterById.get(priceRule.meterId) ?? "Unknown" : "None", priceRule.pricingModel, priceRule.currency, priceRule.unitPrice])]);
    }
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    const request = activeTab === "products"
      ? { path: "/api/catalog/products", label: "Product", payload: { name: String(formData.get("name") ?? ""), description: String(formData.get("description") ?? "") || null } }
      : activeTab === "meters"
        ? { path: "/api/catalog/meters", label: "Meter", payload: { productId: String(formData.get("productId") ?? ""), name: String(formData.get("name") ?? ""), eventName: String(formData.get("eventName") ?? ""), aggregationType: String(formData.get("aggregationType") ?? "sum"), unit: String(formData.get("unit") ?? "") } }
        : activeTab === "plans"
          ? { path: "/api/catalog/plans", label: "Plan", payload: { productId: String(formData.get("productId") ?? ""), name: String(formData.get("name") ?? ""), billingInterval: String(formData.get("billingInterval") ?? "monthly") } }
          : { path: "/api/catalog/price-rules", label: "Price rule", payload: { planId: String(formData.get("planId") ?? ""), meterId: String(formData.get("meterId") ?? "") || null, pricingModel: String(formData.get("pricingModel") ?? "flat"), unitPrice: Number(formData.get("unitPrice") ?? 0), currency: String(formData.get("currency") ?? "USD").toUpperCase(), config: {} } };

    try {
      const response = await fetch(request.path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request.payload)
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `Could not create ${request.label.toLowerCase()}`);
      }

      toast.success(`${request.label} created`, { description: "Catalog configuration updated." });
      setIsModalOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error("Catalog change failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  function createDisabledReason() {
    if (!canWrite) return "Read-only access";
    if ((activeTab === "meters" || activeTab === "plans") && products.length === 0) return "Create a product first";
    if (activeTab === "priceRules" && plans.length === 0) return "Create a plan first";
    return null;
  }

  const disabledReason = createDisabledReason();

  return (
    <section className="data-panel catalog-workspace">
      <div className="data-toolbar">
        <div>
          <h2>Catalog records</h2>
          <span>{activeCount} of {totalCount} {tabLabels[activeTab].toLowerCase()} shown</span>
        </div>
        <div className="data-toolbar-actions">
          <label className="data-search" htmlFor="catalog-search">
            <span>Search</span>
            <input id="catalog-search" onChange={(event) => setQuery(event.target.value)} placeholder={`Filter ${tabLabels[activeTab].toLowerCase()}`} value={query} />
          </label>
          <button className="secondary-command" disabled={activeCount === 0} onClick={exportActiveTab} type="button">Export CSV</button>
          <button className="primary-link data-primary-action" disabled={Boolean(disabledReason)} onClick={() => setIsModalOpen(true)} title={disabledReason ?? undefined} type="button">New {tabLabels[activeTab].slice(0, -1)}</button>
        </div>
      </div>

      <div className="data-tabs" role="tablist" aria-label="Catalog tables">
        {(["products", "meters", "plans", "priceRules"] as CatalogTab[]).map((tab) => (
          <button aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} key={tab} onClick={() => { setActiveTab(tab); setQuery(""); }} role="tab" type="button">
            <span>{tabLabels[tab]}</span>
            <strong>{tab === "products" ? products.length : tab === "meters" ? meters.length : tab === "plans" ? plans.length : priceRules.length}</strong>
          </button>
        ))}
      </div>

      {activeTab === "products" ? <ProductsTable products={filteredProducts} /> : null}
      {activeTab === "meters" ? <MetersTable meters={filteredMeters} productById={productById} /> : null}
      {activeTab === "plans" ? <PlansTable plans={filteredPlans} productById={productById} /> : null}
      {activeTab === "priceRules" ? <PriceRulesTable priceRules={filteredPriceRules} meterById={meterById} planById={planById} /> : null}

      {isModalOpen ? (
        <div className="data-modal-backdrop" role="presentation">
          <section aria-labelledby="catalog-create-title" aria-modal="true" className="data-modal" role="dialog">
            <div className="panel-title-row">
              <div>
                <p className="eyebrow">Catalog</p>
                <h2 id="catalog-create-title">New {tabLabels[activeTab].slice(0, -1)}</h2>
                <p>Create the selected catalog object without losing table context.</p>
              </div>
              <button aria-label="Close catalog modal" className="secondary-command" onClick={() => setIsModalOpen(false)} type="button">Close</button>
            </div>
            <form className="data-modal-form" onSubmit={submitCreate}>
              <CatalogCreateFields activeTab={activeTab} meters={meters} plans={plans} products={products} />
              {error ? <p className="error-text">{error}</p> : null}
              <div className="data-modal-actions">
                <span>{disabledReason ?? "The new record appears in this tab after save."}</span>
                <button disabled={isSubmitting || Boolean(disabledReason)} type="submit">{isSubmitting ? "Creating..." : `Create ${tabLabels[activeTab].slice(0, -1)}`}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function ProductsTable({ products }: { products: Product[] }) {
  if (products.length === 0) return <EmptyTable title="No products found" detail="Create or adjust filters to see products." />;
  return <div className="data-table-scroll"><table><thead><tr><th>Name</th><th>Description</th><th>Status</th><th>Created</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong></td><td>{product.description ?? <span className="muted-text">No description</span>}</td><td><span className={`status-badge status-${product.status}`}>{product.status}</span></td><td>{new Date(product.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>;
}

function MetersTable({ meters, productById }: { meters: Meter[]; productById: Map<string, string> }) {
  if (meters.length === 0) return <EmptyTable title="No meters found" detail="Meters define usage events and billable units." />;
  return <div className="data-table-scroll"><table><thead><tr><th>Name</th><th>Product</th><th>Event</th><th>Aggregation</th><th>Unit</th></tr></thead><tbody>{meters.map((meter) => <tr key={meter.id}><td><strong>{meter.name}</strong></td><td>{productById.get(meter.productId) ?? "Unknown"}</td><td><code>{meter.eventName}</code></td><td>{meter.aggregationType}</td><td>{meter.unit}</td></tr>)}</tbody></table></div>;
}

function PlansTable({ plans, productById }: { plans: Plan[]; productById: Map<string, string> }) {
  if (plans.length === 0) return <EmptyTable title="No plans found" detail="Plans group product billing terms before pricing rules are attached." />;
  return <div className="data-table-scroll"><table><thead><tr><th>Name</th><th>Product</th><th>Interval</th><th>Status</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id}><td><strong>{plan.name}</strong></td><td>{productById.get(plan.productId) ?? "Unknown"}</td><td>{plan.billingInterval}</td><td><span className={`status-badge status-${plan.status}`}>{plan.status}</span></td></tr>)}</tbody></table></div>;
}

function PriceRulesTable({ priceRules, meterById, planById }: { priceRules: PriceRule[]; meterById: Map<string, string>; planById: Map<string, string> }) {
  if (priceRules.length === 0) return <EmptyTable title="No price rules found" detail="Contracts need price rules before line items can be attached." />;
  return <div className="data-table-scroll"><table><thead><tr><th>Plan</th><th>Meter</th><th>Model</th><th>Price</th></tr></thead><tbody>{priceRules.map((priceRule) => <tr key={priceRule.id}><td>{planById.get(priceRule.planId) ?? "Unknown"}</td><td>{priceRule.meterId ? meterById.get(priceRule.meterId) ?? "Unknown" : "None"}</td><td>{priceRule.pricingModel}</td><td>{priceRule.currency} {priceRule.unitPrice.toFixed(4)}</td></tr>)}</tbody></table></div>;
}

function EmptyTable({ title, detail }: { title: string; detail: string }) {
  return <div className="blocked-notice" role="note"><strong>{title}</strong><span>{detail}</span></div>;
}

function CatalogCreateFields({ activeTab, meters, plans, products }: { activeTab: CatalogTab; meters: Meter[]; plans: Plan[]; products: Product[] }) {
  if (activeTab === "products") {
    return <><div><label htmlFor="product-name">Product name</label><input id="product-name" name="name" required placeholder="API Platform" /></div><div><label htmlFor="product-description">Description</label><textarea id="product-description" name="description" rows={4} placeholder="Optional" /></div></>;
  }

  if (activeTab === "meters") {
    return <><div><label htmlFor="meter-product">Product</label><select id="meter-product" name="productId" required><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div><div><label htmlFor="meter-name">Meter name</label><input id="meter-name" name="name" required placeholder="API calls" /></div><div><label htmlFor="event-name">Event name</label><input id="event-name" name="eventName" required placeholder="api.call" /></div><div className="inline-fields"><div><label htmlFor="aggregation-type">Aggregation</label><select id="aggregation-type" name="aggregationType" defaultValue="sum"><option value="sum">Sum</option><option value="count">Count</option></select></div><div><label htmlFor="unit">Unit</label><input id="unit" name="unit" required placeholder="calls" /></div></div></>;
  }

  if (activeTab === "plans") {
    return <><div><label htmlFor="plan-product">Product</label><select id="plan-product" name="productId" required><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div><div><label htmlFor="plan-name">Plan name</label><input id="plan-name" name="name" required placeholder="Growth" /></div><div><label htmlFor="billing-interval">Billing interval</label><select id="billing-interval" name="billingInterval" defaultValue="monthly"><option value="monthly">Monthly</option><option value="annual">Annual</option></select></div></>;
  }

  return <><div><label htmlFor="price-rule-plan">Plan</label><select id="price-rule-plan" name="planId" required><option value="">Select plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></div><div><label htmlFor="price-rule-meter">Meter</label><select id="price-rule-meter" name="meterId"><option value="">No meter</option>{meters.map((meter) => <option key={meter.id} value={meter.id}>{meter.name}</option>)}</select></div><div className="inline-fields"><div><label htmlFor="pricing-model">Pricing model</label><select id="pricing-model" name="pricingModel" defaultValue="flat"><option value="flat">Flat</option><option value="per_unit">Per unit</option><option value="tiered">Tiered</option></select></div><div><label htmlFor="unit-price">Unit price</label><input id="unit-price" name="unitPrice" min="0" step="0.0001" type="number" defaultValue="0" /></div></div><div><label htmlFor="currency">Currency</label><input id="currency" name="currency" maxLength={3} minLength={3} defaultValue="USD" /></div></>;
}