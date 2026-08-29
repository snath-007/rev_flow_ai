import type { AuthenticatedActor } from "@revflow/shared";
import type { VerifiedIdentity } from "../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      verifiedIdentity?: VerifiedIdentity;
      authenticatedActor?: AuthenticatedActor;
    }
  }
}

export {};
