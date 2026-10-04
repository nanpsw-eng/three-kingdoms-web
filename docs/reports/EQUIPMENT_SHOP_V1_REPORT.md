# EQUIPMENT / SHOP v1 REPORT — 2026-10-04

## 0. Summary

| Item | Result |
|---|---|
| Integration base | `implementation/bootstrap@ea02f9354cd4c01926be3249a00b589c70d50a08` (PR #10 merged) |
| Working branch | `ccr-47ddf3a9-qsyimg` |
| Scope | PRD FR-008 Equipment + Vertical Slice shop flow |
| Decision | DEC-005 — **PROPOSED** (human approval required) |
| Save version | unchanged (`1`); no migration required |
| Local gate | **PASS** (see §3) |
| GitHub Actions | `NOT_RUN` (runs when a PR targets `implementation/bootstrap`) |

## 1. What was implemented

### Content
- `Equipment` schema (WEAPON / ARMOR / ACCESSORY) and `Shop` schema; ids `WPN_` / `ARM_` / `ACC_` / `SHOP_`.
- Weapon families are a shared enum; general `weaponAptitudes` are validated against it.
- 11 items, 2 shops (Zhuo Town, Baishui Village). Baishui Village gains the `SHOP` service.
- Registry validation: shop ↔ SHOP-service coverage both ways, item references, duplicates.

### Domain / adapter
- `equipmentLoadout()` / `equippedStatsAt()` derive weapon attack (aptitude-scaled), armor defense and capped accessory bonuses from content.
- Player battle combatants use their equipment; enemy encounter numbers are untouched.
- `buyItem` / `equipItem` / `unequipSlot` are pure save transitions with typed `EquipmentError` codes.

### UI (mobile-first)
- Location sheet → `상점 · <shop name>` → shop sheet: price, effect summary, stored count; unaffordable items say `부족` in text (not color-only).
- Bottom-nav `부대` → party sheet: member tabs, stats incl. accessory bonus, troops, gear attack/defense, per-slot equip/unequip with aptitude grade shown.
- Gold badge in the top bar. World is paused while shop/party sheets are open.
- Wording: gear is labelled **무구** in the UI to avoid colliding with the general **장비** (Zhang Fei).

### Unrelated fix
- `tests/runtime-bridge.test.ts`: the controller-cancellation test timed out on a cold first run because the lazy Phaser import is transformed uncached (>5s). Timeout raised to 30s; the assertion is unchanged.

## 2. Tests added
- `tests/equipment/inventory.test.ts` (13): content coverage, registry rejection cases, purchase rules, equip/swap/unequip conservation, aptitude gate, save round-trip and invalid-id rejection, aptitude scaling, stat cap, combatant integration, deterministic damage increase under equal seed.
- `e2e/equipment-shop.spec.ts` (Chromium 360/390/412; also added to the WebKit 390 supplemental list): buy with starting gold, unaffordable item disabled, equip Guan Yu via 부대, 44px touch targets, no horizontal overflow, IndexedDB persistence across reload.

## 3. Local validation evidence

`npm run verify:foundation` on the implementation commits:

| Check | Result |
|---|---|
| typecheck | PASS |
| content validation | PASS (23 files; equipment=11, shops=2) |
| domain smoke | PASS |
| Vitest | **103/103 PASS** (was 90) |
| battle golden | PASS (unchanged) |
| architecture boundaries | PASS |
| build / PWA | PASS |
| Chromium E2E 360/390/412 | **39/39 PASS** (was 36; Critical Journey unchanged and green) |
| WebKit supplemental | **NOT_RUN locally** — WebKit is not installed in this container; CI installs it |

Balance probe (`npm run sim:encounters`, informational), North Gate boss, 50 seeds:

| Party | Turns | Troop loss |
|---|---|---|
| Unequipped | 8.8 | 76% |
| Iron weapons ×3 (180g) | 6.6 | 62% |
| Upper bound | 6.0 | 57% |

## 4. Not validated / limits
- WebKit run of the new spec: pending CI.
- Physical Android Chrome / iPhone Safari: NOT_RUN.
- Human judgement of gear value, prices and pacing: NOT_RUN.
- Selling, consumables (`ITEM_`), and more shops: not in v1.

## 5. Gate
- Engineering (local Chromium): **PASS**
- DEC-005 product approval: **HUMAN APPROVAL REQUIRED**
- PR → `implementation/bootstrap`: **HUMAN APPROVAL REQUIRED**
