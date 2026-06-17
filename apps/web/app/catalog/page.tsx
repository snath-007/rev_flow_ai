import { listMeters, listPlans, listPriceRules, listProducts } from "@/lib/api-client";

import {
  MeterCreateForm,
  PlanCreateForm,
  PriceRuleCreateForm,
  ProductCreateForm
} from "./catalog-forms";

export default async function CatalogPage() {
  const [products, meters, plans, priceRules] = await Promise.all([
    listProducts(),
    listMeters(),
    listPlans(),
    listPriceRules()
  ]);
  const productById = new Map(products.map((product) => [product.id, product.name]));
  const meterById = new Map(meters.map((meter) => [meter.id, meter.name]));
  const planById = new Map(plans.map((plan) => [plan.id, plan.name]));

  return (
    <main className="shell page-grid">
      <section className="hero compact">
        <p className="eyebrow">Catalog</p>
        <h1>Commercial configuration</h1>
        <p className="lede">Define products, meters, reusable plans, and price rules for future contracts.</p>
      </section>

      <section className="two-column">
        <div className="stacked-forms">
          <ProductCreateForm />
          <MeterCreateForm products={products} />
          <PlanCreateForm products={products} />
          <PriceRuleCreateForm meters={meters} plans={plans} />
        </div>

        <div className="stacked-forms">
          <div className="table-panel">
            <div className="table-header">
              <h2>Products</h2>
              <span>{products.length} total</span>
            </div>
            {products.length === 0 ? (
              <p className="empty-state">No products yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.status}</td>
                      <td>{new Date(product.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="table-panel">
            <div className="table-header">
              <h2>Meters</h2>
              <span>{meters.length} total</span>
            </div>
            {meters.length === 0 ? (
              <p className="empty-state">No meters yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Product</th>
                    <th>Event</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {meters.map((meter) => (
                    <tr key={meter.id}>
                      <td>{meter.name}</td>
                      <td>{productById.get(meter.productId) ?? "Unknown"}</td>
                      <td>{meter.eventName}</td>
                      <td>{meter.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="table-panel">
            <div className="table-header">
              <h2>Plans</h2>
              <span>{plans.length} total</span>
            </div>
            {plans.length === 0 ? (
              <p className="empty-state">No plans yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Product</th>
                    <th>Interval</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>{plan.name}</td>
                      <td>{productById.get(plan.productId) ?? "Unknown"}</td>
                      <td>{plan.billingInterval}</td>
                      <td>{plan.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="table-panel">
            <div className="table-header">
              <h2>Price rules</h2>
              <span>{priceRules.length} total</span>
            </div>
            {priceRules.length === 0 ? (
              <p className="empty-state">No price rules yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Meter</th>
                    <th>Model</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {priceRules.map((priceRule) => (
                    <tr key={priceRule.id}>
                      <td>{planById.get(priceRule.planId) ?? "Unknown"}</td>
                      <td>{priceRule.meterId ? meterById.get(priceRule.meterId) ?? "Unknown" : "None"}</td>
                      <td>{priceRule.pricingModel}</td>
                      <td>{priceRule.currency} {priceRule.unitPrice.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
