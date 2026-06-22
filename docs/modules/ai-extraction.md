# AI-Assisted Contract Extraction

## Purpose

Convert contract text into structured draft terms that a finance reviewer can inspect, edit, accept, reject, approve, and apply through normal RevFlow controls.

AI output is never treated as active billing configuration.

## Implemented Workflow

```txt
Paste contract text
  -> create extraction run
  -> selected mock or Ollama provider extracts fields
  -> validate structured output
  -> store confidence, ambiguity, source evidence, provider/model/prompt metadata
  -> human accepts, edits, or rejects each field
  -> human approves or rejects the extraction
  -> approved extraction may create/match a customer and create a draft contract
  -> existing contract approval remains the activation gate
```

## Current Provider

The deterministic mock remains the default:

```env
AI_PROVIDER=mock
```

It does not call a model, require credentials, or send contract text over the network. This keeps local development, tests, and demos repeatable.

An Ollama adapter provides the first opt-in real-model path. It uses Ollama's local HTTP API and validates every response against the same shared extraction schema used by the mock provider.

```bash
ollama pull qwen2.5:3b
```

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_TIMEOUT_MS=120000
```

Restart the API after changing these values. No hosted-provider API key is required.

The provider boundary remains vendor-neutral:

- `AiProvider` defines the contract extraction operation.
- Provider adapters own transport, authentication, and response parsing.
- The AI service owns extraction lifecycle, persistence, and audit behavior.
- Shared Zod schemas validate output before persistence.
- Adding another provider requires a new adapter and registry entry, without changing routes or workflow services.

## Provider Safety

- `AI_PROVIDER=mock` is the safe local-demo default.
- A default Ollama URL keeps contract text on the machine running Ollama.
- Pointing `OLLAMA_BASE_URL` at another host sends contract text to that host.
- Model output remains an untrusted draft even when schema-valid.
- Provider errors, invalid JSON, and schema failures mark the extraction run as failed and remain visible to operators.
- Use only models and infrastructure approved for the contract data being processed.

The provider boundary records:

- Provider name
- Model/parser identifier
- Prompt version
- Structured output
- Confidence summary
- Ambiguities and missing fields
- Failure details

## Extracted Fields

The current mock provider tracks:

- Customer name and email
- Contract start and end dates
- Billing frequency
- Payment terms
- Product or plan name
- Pricing model
- Unit/platform price
- Currency
- Revenue recognition method

Missing values are returned as `null` with low confidence and an ambiguity message. They are not invented.

## Human Review

The `/ai` workspace shows:

- Original source text
- Extracted structured fields
- Confidence percentages
- Source evidence snippets
- Ambiguity and missing-field warnings
- Provider, model, and prompt version
- Field decisions: pending, accepted, edited, rejected

Approval requires all fields to have an explicit decision. Rejection and approval are persisted as review history and audit events.

## Apply Behavior

Apply is deliberately conservative:

- Requires an approved extraction
- Matches customer by email or creates a customer
- Requires reviewed customer name, email, and contract start date
- Creates a draft contract through the normal contract service
- Creates no price-rule or catalog links because AI output does not contain trusted internal IDs
- Does not approve or activate the contract

## Auditability

Audit events are written for:

- Extraction created
- Extraction completed
- Extraction failed
- Extraction approved or rejected
- Extraction applied

Reviewer identity is used as the actor for review and apply events. Full source contract text is not copied into audit payloads.

## Current Boundaries

- Paste-based text intake only; file upload/OCR is a later ingestion enhancement
- Mock provider only by default
- No autonomous approval or billing activation
- No AI pricing, invoice, revenue, or journal-entry calculations
- No conversational reviewer assistant yet
- No automatic creation of catalog or pricing rules
