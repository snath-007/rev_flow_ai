"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

export function WorkspaceOnboardingForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(toSlug(initialName));
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/onboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Workspace onboarding failed");
      setSubmitting(false);
      return;
    }

    router.push("/customers");
    router.refresh();
  }

  return (
    <form className="onboarding-form" onSubmit={submit}>
      <div className="form-field">
        <label htmlFor="workspace-name">Workspace name</label>
        <input
          id="workspace-name"
          value={name}
          minLength={2}
          maxLength={120}
          required
          onChange={(event) => {
            const value = event.target.value;
            setName(value);
            if (!slugEdited) {
              setSlug(toSlug(value));
            }
          }}
        />
      </div>

      <div className="form-field">
        <label htmlFor="workspace-slug">Workspace URL</label>
        <div className="slug-input">
          <span>revflow.app/</span>
          <input
            id="workspace-slug"
            value={slug}
            minLength={2}
            maxLength={63}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(toSlug(event.target.value));
            }}
          />
        </div>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <button className="primary-button" disabled={submitting} type="submit">
        {submitting ? "Creating workspace..." : "Create RevFlow workspace"}
      </button>
    </form>
  );
}
