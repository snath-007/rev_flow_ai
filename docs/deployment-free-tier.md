# Free-Tier Deployment

## Recommended Hosted Demo

| Component      | Service                | Project/root           | Notes                                                            |
| -------------- | ---------------------- | ---------------------- | ---------------------------------------------------------------- |
| Web            | Vercel Hobby           | `apps/web`             | Next.js project with browser-safe configuration only.            |
| API            | Vercel Hobby           | `apps/api`             | Express runs as one Vercel Function with a 120-second limit.     |
| PostgreSQL     | Neon Free              | External service       | Use the pooled URL at runtime and the direct URL for migrations. |
| Authentication | Clerk Free             | External service       | Use a production instance for the hosted URLs.                   |
| AI             | Gemini Developer API   | Called only by the API | Keep the API key server-side and enforce review before apply.    |
| Redis/worker   | Not deployed initially | N/A                    | Current demo workflows retain synchronous paths.                 |

The web and API are two Vercel projects connected to the same GitHub repository. This is a hosted-demo profile, not a production SLA. Vercel Hobby is intended for personal, non-commercial use, and every provider remains subject to its current quotas and acceptable-use terms.

Use only synthetic or properly redacted contracts with a free AI tier. Confirm the provider's current data-use and retention terms before processing confidential agreements.

## 1. Prepare Neon

The repository is linked to Neon project `wild-fire-96215826`. Before a release:

1. Keep the Neon pooled connection string for the API runtime.
2. Keep the direct connection string only in a trusted release environment for migrations.
3. Run migrations explicitly from a trusted local shell:

   ```powershell
   npm run db:migrate
   ```

4. Do not run the demo seed against hosted data unless that data is intentional.

Migrations are idempotent and are never run from an HTTP request or application startup.

## 2. Deploy the Express API to Vercel

1. Import the GitHub repository as a new Vercel project named, for example, `revflow-api`.
2. Set **Root Directory** to `apps/api`.
3. If Vercel shows **Include source files outside of the Root Directory**, enable it because the API imports workspace packages from `packages/*`.
4. Keep the detected Node.js build settings. `src/index.ts` exports the Express app and `vercel.json` sets the function duration to 120 seconds.
5. Add these Production environment variables:

   | Variable                | Value/source                                               |
   | ----------------------- | ---------------------------------------------------------- |
   | `DATABASE_URL_POOLED`   | Neon pooled connection string                              |
   | `AUTH_MODE`             | `clerk`                                                    |
   | `CLERK_PUBLISHABLE_KEY` | Clerk production publishable key                           |
   | `CLERK_SECRET_KEY`      | Clerk production secret key                                |
   | `AI_PROVIDER`           | `gemini`                                                   |
   | `GEMINI_API_KEY`        | Gemini server-side API key                                 |
   | `GEMINI_MODEL`          | `gemini-3.6-flash`                                         |
   | `GEMINI_TIMEOUT_MS`     | `60000`                                                    |
   | `ALLOW_DEMO_SEED`       | `false`                                                    |
   | `WEB_ORIGIN`            | Final web production URL; add after the web project exists |

6. Deploy and verify:

   ```text
   https://<api-project>.vercel.app/health
   https://<api-project>.vercel.app/health/db
   ```

Do not add the direct migration URL to the API project unless an explicit release workflow needs it. `WEB_ORIGIN` accepts a comma-separated list when both a Vercel URL and a custom domain must be allowed.

## 3. Deploy the Next.js Web App to Vercel

1. Import the same GitHub repository again as a separate project named, for example, `revflow-web`.
2. Set **Root Directory** to `apps/web`.
3. Enable **Include source files outside of the Root Directory** if Vercel presents the option.
4. Add these Production environment variables:

   | Variable                            | Value/source                       |
   | ----------------------------------- | ---------------------------------- |
   | `NEXT_PUBLIC_API_URL`               | `https://<api-project>.vercel.app` |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk production publishable key   |
   | `CLERK_SECRET_KEY`                  | Clerk production secret key        |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL`     | `/sign-in`                         |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_URL`     | `/sign-up`                         |

5. Deploy the web project and copy its production URL.
6. Set the exact web URL as `WEB_ORIGIN` in the API project and redeploy the API.
7. Add the production web domain and required redirect URLs to the Clerk production instance.

Values prefixed with `NEXT_PUBLIC_` are included in browser bundles. Never use that prefix for database, Clerk secret, or Gemini credentials.

## 4. Preview Environment Policy

Do not point arbitrary pull-request previews at production Neon or Clerk resources. Either:

- leave Preview deployments disabled until isolated resources exist; or
- use a separate Neon branch/database and Clerk development instance for Preview variables.

The API preview URL must be paired with the corresponding web preview origin. Avoid broad wildcard CORS for authenticated finance workflows.

## 5. Release Verification

Run local release checks before deployment:

```powershell
npm run build
npm run typecheck
npm run test
```

Then verify the hosted flow:

1. Confirm `/health` and `/health/db` return success.
2. Open the web URL and sign in through Clerk.
3. Complete workspace onboarding if prompted.
4. Create and review a small Gemini extraction.
5. Apply it to draft customer and contract records.
6. Complete contract approval, billing, revenue, payment, audit, integration export, and reporting checks.
7. Confirm protected API routes reject unauthenticated requests.
8. Confirm no secret appears in browser responses, client bundles, or deployment logs.

## 6. Rollback

- Application: promote the last known-good Vercel deployment for the affected project.
- Environment: restore the previous Vercel variable value and redeploy; environment changes do not alter an existing deployment.
- Database: prefer forward-only corrective migrations. Before a risky migration, create a Neon branch or restore point and verify recovery separately.

## Optional Redis And Worker

Do not deploy Redis or `apps/worker` for the first hosted demo. Vercel Functions do not provide the continuously running process BullMQ consumers require. Add them later using managed Redis and a persistent worker host, while keeping the synchronous API paths available until the hosted queue path is verified.

## References

- [Vercel Express guide](https://vercel.com/docs/frameworks/backend/express)
- [Vercel monorepo projects](https://vercel.com/docs/monorepos)
- [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
