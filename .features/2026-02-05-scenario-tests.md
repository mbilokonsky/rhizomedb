# Scenario Tests

**Date:** 2026-02-05
**Branch:** `feature/scenario-tests`

## What

60 scenario tests across 12 test files, each grounded in a realistic domain where
someone would actually use RhizomeDB. A shared helpers module provides reusable
delta creation, view resolution, and federation utilities.

## Why

Stress-test the system through divergent use cases — different domains, stakes,
threat models, and usage patterns. The scenarios were designed first as narratives
(SCENARIOS.md), then translated into executable tests.

## Scenarios

1. **Mutual Aid Network** — federation between shelter hub and field phones
2. **Investigative Journalism** — cross-newsroom evidence sharing with selective schemas
3. **Clinical Trial** — audit trails, blinding schemas, multi-site normalization
4. **Indigenous Oral History** — community vs. legal schemas on the same data
5. **Agent Swarm** — multi-agent coordination, conflicting claims, scoped authority
6. **Personal Knowledge Graph** — web of associations, time-travel, schema-as-lens
7. **Conflict-Zone Medical Records** — patient records across clinics, allergy propagation
8. **Collaborative Worldbuilding** — DM authority via negation, secret schemas
9. **Supply Chain Provenance** — linear chains, branching/merging material flows
10. **Whistleblower Evidence** — tamper-evidence, double-negation restoration
11. **Scientific Replication** — replication tracking, formal retraction, consensus
12. **Estate Dispute** — competing claims, mediator authority, per-party views

## Files

- `SCENARIOS.md` — narrative descriptions of all 12 scenarios
- `typescript/src/__tests__/scenarios/helpers.ts` — shared test utilities
- `typescript/src/__tests__/scenarios/01-mutual-aid.test.ts` through `12-estate-dispute.test.ts`
- `typescript/jest.config.js` — narrowed testMatch to `*.test.ts`
