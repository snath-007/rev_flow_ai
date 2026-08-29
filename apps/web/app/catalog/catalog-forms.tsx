"use client";

import type { Meter, Plan, Product } from "@revflow/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

function useSubmitState() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return { error, setError, isSubmitting, setIsSubmitting };
}

export function ProductCreateForm() {
  const router = useRouter();
  const { error, setError, isSubmitting, setIsSubmitting } = useSubmitState();

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const payload = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? "") || null
    };

    try {
      const response = await fetch("/api/catalog/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not create product");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="form-panel">
      <h2>New product</h2>
      <div>
        <label htmlFor="product-name">Product name</label>
        <input id="product-name" name="name" required placeholder="API Platform" />
      </div>
      <div>
        <label htmlFor="product-description">Description</label>
        <textarea id="product-description" name="description" rows={3} placeholder="Optional" />
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating..." : "Create product"}
      </button>
    </form>
  );
}

export function MeterCreateForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const { error, setError, isSubmitting, setIsSubmitting } = useSubmitState();

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const payload = {
      productId: String(formData.get("productId") ?? ""),
      name: String(formData.get("name") ?? ""),
      eventName: String(formData.get("eventName") ?? ""),
      aggregationType: String(formData.get("aggregationType") ?? "sum"),
      unit: String(formData.get("unit") ?? "")
    };

    try {
      const response = await fetch("/api/catalog/meters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not create meter");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="form-panel">
      <h2>New meter</h2>
      <div>
        <label htmlFor="meter-product">Product</label>
        <select id="meter-product" name="productId" required disabled={products.length === 0}>
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="meter-name">Meter name</label>
        <input id="meter-name" name="name" required placeholder="API calls" />
      </div>
      <div>
        <label htmlFor="event-name">Event name</label>
        <input id="event-name" name="eventName" required placeholder="api.call" />
      </div>
      <div className="inline-fields">
        <div>
          <label htmlFor="aggregation-type">Aggregation</label>
          <select id="aggregation-type" name="aggregationType" defaultValue="sum">
            <option value="sum">Sum</option>
            <option value="count">Count</option>
          </select>
        </div>
        <div>
          <label htmlFor="unit">Unit</label>
          <input id="unit" name="unit" required placeholder="calls" />
        </div>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting || products.length === 0} type="submit">
        {isSubmitting ? "Creating..." : "Create meter"}
      </button>
    </form>
  );
}

export function PlanCreateForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const { error, setError, isSubmitting, setIsSubmitting } = useSubmitState();

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const payload = {
      productId: String(formData.get("productId") ?? ""),
      name: String(formData.get("name") ?? ""),
      billingInterval: String(formData.get("billingInterval") ?? "monthly")
    };

    try {
      const response = await fetch("/api/catalog/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not create plan");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="form-panel">
      <h2>New plan</h2>
      <div>
        <label htmlFor="plan-product">Product</label>
        <select id="plan-product" name="productId" required disabled={products.length === 0}>
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="plan-name">Plan name</label>
        <input id="plan-name" name="name" required placeholder="Growth" />
      </div>
      <div>
        <label htmlFor="billing-interval">Billing interval</label>
        <select id="billing-interval" name="billingInterval" defaultValue="monthly">
          <option value="monthly">Monthly</option>
          <option value="annual">Annual</option>
        </select>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting || products.length === 0} type="submit">
        {isSubmitting ? "Creating..." : "Create plan"}
      </button>
    </form>
  );
}

export function PriceRuleCreateForm({ meters, plans }: { meters: Meter[]; plans: Plan[] }) {
  const router = useRouter();
  const { error, setError, isSubmitting, setIsSubmitting } = useSubmitState();

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const meterId = String(formData.get("meterId") ?? "");
    const payload = {
      planId: String(formData.get("planId") ?? ""),
      meterId: meterId || null,
      pricingModel: String(formData.get("pricingModel") ?? "flat"),
      unitPrice: Number(formData.get("unitPrice") ?? 0),
      currency: String(formData.get("currency") ?? "USD").toUpperCase(),
      config: {}
    };

    try {
      const response = await fetch("/api/catalog/price-rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not create price rule");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="form-panel">
      <h2>New price rule</h2>
      <div>
        <label htmlFor="price-rule-plan">Plan</label>
        <select id="price-rule-plan" name="planId" required disabled={plans.length === 0}>
          <option value="">Select plan</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>{plan.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="price-rule-meter">Meter</label>
        <select id="price-rule-meter" name="meterId">
          <option value="">No meter</option>
          {meters.map((meter) => (
            <option key={meter.id} value={meter.id}>{meter.name}</option>
          ))}
        </select>
      </div>
      <div className="inline-fields">
        <div>
          <label htmlFor="pricing-model">Pricing model</label>
          <select id="pricing-model" name="pricingModel" defaultValue="flat">
            <option value="flat">Flat</option>
            <option value="per_unit">Per unit</option>
            <option value="tiered">Tiered</option>
          </select>
        </div>
        <div>
          <label htmlFor="unit-price">Unit price</label>
          <input id="unit-price" name="unitPrice" min="0" step="0.0001" type="number" defaultValue="0" />
        </div>
      </div>
      <div>
        <label htmlFor="currency">Currency</label>
        <input id="currency" name="currency" maxLength={3} minLength={3} defaultValue="USD" />
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting || plans.length === 0} type="submit">
        {isSubmitting ? "Creating..." : "Create price rule"}
      </button>
    </form>
  );
}
