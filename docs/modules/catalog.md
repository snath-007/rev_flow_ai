# Catalog Module Plan

## Purpose

Own reusable commercial configuration: products, plans, meters, and price rules.

## Responsibilities

- Define products
- Define meters for usage tracking
- Define reusable plans
- Attach price rules to plans
- Allow contracts to override catalog defaults

## Key Concepts

- Catalog is reusable.
- Contracts are customer-specific.
- Plans reduce repeated configuration.
- Enterprise deals can override plan defaults.

## Planned Entities

- `products`
- `plans`
- `meters`
- `price_rules`

## Open Questions

- Should meters belong directly to products or be globally reusable?
- Should plans support versioning in MVP?
- How should deprecated price rules behave for active contracts?

