import { SignUp } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/auth-config";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      {isClerkConfigured() ? (
        <SignUp forceRedirectUrl="/onboarding" />
      ) : (
        <section className="auth-fallback">
          <p className="eyebrow">Local development</p>
          <h1>Account creation is managed by Clerk</h1>
          <p>Add Clerk development keys to test account and organization creation.</p>
          <a className="primary-link" href="/onboarding">Continue to local workspace</a>
        </section>
      )}
    </main>
  );
}
