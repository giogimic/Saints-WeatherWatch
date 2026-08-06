# 2026-08-06 — Continue Phase 1 hardening

## Focus
Stabilize Phase 1 shared world (not Phase 3+ vision features).

## Fixes
1. Desk loot — /auth/me inventory shows Storm World packs (MetaLookup bridge)
2. Trade CAS — buy/cancel claim open rows via updateMany; reopen + refund on mid-trade failure
3. Craft refund — restore inputs if output grant fails
4. SIM event rollback — reactivate event if reward grant fails
5. Anti-teleport — pickup sync snap 0.55° → 0.12°
6. End leaves world — disconnectWorld() on endRun so presence does not ghost
7. UX — Trade & Craft CTA on results + Desk; trade UI uses named selects

