import { SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import { isClerkConfigured } from "@/lib/auth-config";

export async function AuthActions() {
  if (!isClerkConfigured()) {
    return <a className="primary-link" href="/onboarding">Open local workspace</a>;
  }

  const session = await auth();

  if (!session.userId) {
    return (
      <div className="auth-actions">
        <SignInButton forceRedirectUrl="/onboarding">
          <button className="primary-button" type="button">Sign in</button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="auth-actions">
      <a className="primary-link secondary" href="/overview">Open workspace</a>
      <UserButton />
    </div>
  );
}
