"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomerCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      billingAddress: String(formData.get("billingAddress") ?? "") || null
    };

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not create customer");
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
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required placeholder="Acme Inc." />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" required type="email" placeholder="billing@acme.com" />
      </div>
      <div>
        <label htmlFor="billingAddress">Billing address</label>
        <textarea id="billingAddress" name="billingAddress" rows={3} placeholder="Optional" />
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating..." : "Create customer"}
      </button>
    </form>
  );
}
