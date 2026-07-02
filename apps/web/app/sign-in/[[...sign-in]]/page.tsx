import { SignIn } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/auth-config";

export default function SignInPage() {
  return (
    <main className="auth-page">
      {isClerkConfigured() ? (
        <SignIn forceRedirectUrl="/onboarding" />
      ) : (
        <section className="auth-fallback">
          <p className="eyebrow">Local development</p>
          <h1>Authentication bypass is active</h1>
          <p>Configure Clerk keys and set AUTH_MODE=clerk to exercise real sign-in.</p>
          <a className="primary-link" href="/onboarding">Continue as Local Admin</a>
        </section>
      )}
    </main>
  );
}
