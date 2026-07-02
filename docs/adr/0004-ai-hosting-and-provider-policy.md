# ADR 0004 - AI Hosting And Provider Policy

Status: accepted  
Date: 2026-06-24

## Context

Phase 5 introduced an AiProvider boundary with deterministic mock and Ollama implementations. AI extraction remains draft-only and requires human review before applying configuration.

A public demo must not depend on an operator's laptop, expose an unauthenticated Ollama endpoint, or create unbounded model cost. It should still demonstrate provider neutrality and the complete review workflow.

## Decision

Use deterministic mock extraction as the default hosted-demo AI behavior.

Keep the provider contract unchanged:

- mock: deterministic local, test, and public-demo behavior
- ollama: local open-model development
- hosted_open_model: optional future adapter behind the same contract

The hosted_open_model adapter is stretch scope. It may target any bounded provider capable of returning the required structured schema. Domain services must not branch on vendor-specific response objects.

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

If a hosted model adapter is enabled:

- Require authentication and ai.extract capability.
- Apply per-user and per-workspace rate limits.
- Set request-size, timeout, and response-size limits.
- Use a model allowlist and server-owned endpoint.
- Record provider and model metadata.
- Do not retry non-idempotent provider calls without an extraction-run idempotency key.
- Fall back visibly; never silently replace failed AI output with invented terms.
- Keep a demo-wide budget or quota.

Ollama remains bound to local or protected private infrastructure. It is never exposed directly to the public internet as an unauthenticated RevFlow dependency.

## Consequences

Benefits:

- The hosted demo is deterministic and inexpensive.
- The review experience can be evaluated without model availability.
- Open-source local inference remains supported.
- A later provider can be added without changing contract workflows.

Costs:

- Public-demo extraction is illustrative rather than generative.
- Hosted open-model latency and quality are not proven in core scope.
- Provider-specific optimization is deliberately deferred.

## Rejected Alternatives

- Public remote Ollama endpoint: unsafe and operationally fragile.
- Hard-coded hosted vendor SDK in the AI service: breaks provider neutrality.
- Autonomous apply or approval: conflicts with the finance control model.
- Convex as an AI orchestration layer: duplicates API and persistence responsibilities.
