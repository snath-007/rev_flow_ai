import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isClerkConfigured } from "@/lib/auth-config";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)"
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

const authenticatedProxy = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
    const session = await auth();

    if (!session.orgId && !isOnboardingRoute(request)) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }
});

export default isClerkConfigured()
  ? authenticatedProxy
  : function localDevelopmentProxy() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
