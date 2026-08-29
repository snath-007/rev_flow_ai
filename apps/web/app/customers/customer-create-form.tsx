"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

export function CustomerCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
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
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Could not create customer");
      }

      toast.success("Customer created", { description: `${payload.name} is ready for catalog and contract setup.` });
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error("Customer was not created", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button className="primary-link data-primary-action" onClick={() => setIsOpen(true)} type="button">New customer</button>
      {isOpen ? (
        <div className="data-modal-backdrop" role="presentation">
          <section aria-labelledby="customer-create-title" aria-modal="true" className="data-modal" role="dialog">
            <div className="panel-title-row">
              <div>
                <p className="eyebrow">Configure</p>
                <h2 id="customer-create-title">New customer</h2>
                <p>Create the billable account that contract, invoice, revenue, and audit records attach to.</p>
              </div>
              <button aria-label="Close customer modal" className="secondary-command" onClick={() => setIsOpen(false)} type="button">Close</button>
            </div>

            <form className="data-modal-form" onSubmit={onSubmit}>
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
                <textarea id="billingAddress" name="billingAddress" rows={4} placeholder="Optional" />
              </div>
              {error ? <p className="error-text">{error}</p> : null}
              <div className="data-modal-actions">
                <span>Customer records become available to contracts immediately.</span>
                <button disabled={isSubmitting} type="submit">{isSubmitting ? "Creating..." : "Create customer"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}