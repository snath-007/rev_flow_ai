# ADR 0004 - AI Hosting And Provider Policy

Status: accepted  
Date: 2026-06-24

## Context

Phase 5 introduced an AiProvider boundary with deterministic mock and local-model implementations. The current implementation replaces the local-model adapter with direct Google Gemini API access. AI extraction remains draft-only and requires human review before applying configuration.

A public demo must not depend on an operator's laptop or create unbounded model cost. It should still demonstrate provider neutrality and the complete review workflow.

## Decision

Use Gemini as the default real-model extraction provider and retain deterministic mock extraction for tests, offline development, and repeatable demos.

Keep the provider contract unchanged:

- gemini: direct Google Gemini API access authenticated with a server-side API key
- mock: deterministic local, test, and repeatable-demo behavior

Domain services must not branch on vendor-specific response objects.

## Safety And Workflow Rules

- AI output is always a draft.
- Review decisions are required before apply.
- Apply creates or updates draft configuration only.
- Contract approval remains a separate deterministic permission and transition.
- Provider output is validated with the shared schema before persistence.
- Confidence is advisory and never authorizes an action.
- Provider failures, latency, model identifier, prompt version, and schema version are persisted without exposing secrets.
- Source contract text is not copied into general request logs or audit payloads.

## Hosted Controls

When Gemini is enabled:

- Require authentication and ai.extract capability.
- Apply per-user and per-workspace rate limits.
- Set request-size, timeout, and response-size limits.
- Use a model allowlist and server-owned endpoint.
- Record provider and model metadata.
- Do not retry non-idempotent provider calls without an extraction-run idempotency key.
- Fall back visibly; never silently replace failed AI output with invented terms.
- Keep a demo-wide budget or quota.
- Keep `GEMINI_API_KEY` server-side and out of logs, browser bundles, and committed files.
- Send contract text only when the workspace is approved to use Google Gemini.

## Consequences

Benefits:

- Real-model extraction works without local inference infrastructure.
- The review experience can still be evaluated without model availability by selecting the mock provider.
- A later provider can be added without changing contract workflows.

Costs:

- Gemini usage introduces external cost, latency, quotas, and data-processing considerations.
- Public demos require rate limits and budget controls.
- Provider-specific optimization is deliberately limited to the adapter.

## Rejected Alternatives

- Self-hosted local-model endpoint: unnecessary operational complexity for the current phase.
- Hard-coded hosted vendor SDK in the AI service: breaks provider neutrality.
- Autonomous apply or approval: conflicts with the finance control model.
- Convex as an AI orchestration layer: duplicates API and persistence responsibilities.
