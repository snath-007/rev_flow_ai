# Pricing Module

## Purpose

Calculate invoice charges from pricing configuration, usage quantities, and billing periods using deterministic strategy code.

## Current Implementation

Phase 3 implemented `apps/api/src/modules/pricing` with:

- Pricing types and strategy interface
- Shared money rounding helpers
- Flat-rate strategy
- Per-unit strategy
- Tiered strategy
- Pricing engine dispatcher
- Strategy snapshots for invoice explainability

Implemented tier modes:

- `graduated`: each tier rate applies only to usage within that tier
- `volume`: the selected tier rate applies to all billable units

## Responsibilities

- Keep pricing logic independent from HTTP and database code
- Accept normalized config, usage, period, and context inputs
- Return deterministic quantities, unit prices, amounts, and calculation snapshots
- Provide unit tests for rounding, zero usage, thresholds, and invalid tier configs

## Planned Strategies

Still planned beyond the current Phase 3 implementation:

- Seat-based pricing
- Included units plus overage
- Minimum commitment
- Prepaid credit burn-down
- Hybrid subscription plus usage

## Guardrails

- Do not use AI for pricing math.
- Keep strategies pure and testable.
- Store enough calculation detail on invoice line items for finance review.
