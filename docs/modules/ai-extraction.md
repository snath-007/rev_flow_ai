# AI Extraction Module Plan

## Purpose

Convert contract text into a structured draft billing configuration that a human can review.

## Responsibilities

- Accept pasted or uploaded contract text
- Extract billing and revenue terms
- Return structured JSON
- Mark ambiguous fields
- Store confidence and source snippets where possible
- Create draft configuration for review

## Extracted Fields

- Customer details
- Contract start and end dates
- Billing frequency
- Payment terms
- Products or plan references
- Meters
- Pricing rules
- Minimum commitments
- Free units
- Overage terms
- Revenue recognition method

## Product Rule

AI output must not activate billing automatically.

It creates a draft. A user must review, edit, and approve before the configuration becomes active.

## Open Questions

- Should MVP use a mocked AI provider first?
- Should source snippets be stored for every extracted field?
- How should low-confidence fields block approval?

