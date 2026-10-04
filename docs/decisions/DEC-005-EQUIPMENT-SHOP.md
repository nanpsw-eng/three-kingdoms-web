# DEC-005 — Equipment and Shop v1

## Status
PROPOSED / IMPLEMENTED ON FEATURE BRANCH — 2026-10-04

Rules below are implemented on `ccr-47ddf3a9-qsyimg`. All numbers are `BALANCE_PROPOSED` content values pending playtest. Human approval is required before this decision is marked APPROVED.

## Rule
### Slots
- Each general has three slots: **weapon / armor / accessory**, one item each.
- No rarity tiers, no enhancement/upgrade, no durability, no random stats (PRD §12 non-goals; no gacha-like loops).

### Effects (derived, never persisted)
- Weapon: `weaponAttack = round(item.attack × aptitudeMultiplier)`.
  - Aptitude multipliers: **S 1.2 / A 1.1 / B 1.0 / C 0.8**.
- Armor: `armorDefense = item.defense`.
- Accessory: small core-stat bonuses (0–5 per stat); combined stats remain capped at 100.
- These feed the existing `weaponAttack` / `armorDefense` inputs of the deterministic battle core. No battle formula changed; golden tests are unchanged.

### Eligibility
- A weapon is equippable only if the general lists that weapon family in `weaponAptitudes` (SWORD / DAO / SPEAR / BOW / AXE).
- Armor and accessories fit every general.
- This preserves fixed general identity (DEC-003 principle): Zhang Fei cannot wield a sword; Guan Yu is strongest with a dao.

### Ownership model
- `save.inventory[itemId]` counts **unequipped** owned items only.
- Equipped item ids live only in `generals[id].equipment`.
- Equip moves an item inventory → slot (any previous item returns to inventory); unequip reverses it. Each physical item is counted exactly once.
- Save version stays **1**: the v1 shape already had `gold`, `inventory` and `equipment {weapon?, armor?, accessory?}`. The schema now requires prefixed ids (`WPN_` / `ARM_` / `ACC_`); every pre-existing save holds `{}` and stays valid.

### Shops
- Shops are content (`src/content/shops/`), bound to one location with a `SHOP` service.
- Content validation rejects: shop on a location without `SHOP`, a `SHOP` location without a shop, duplicate or missing item references.
- Buying requires being at the location while its SHOP service is effective, and enough gold. No selling in v1.

### Vertical Slice stock
| Shop | Items |
|---|---|
| 탁현 무구점 (`SHOP_ZHUO_TOWN`) | 철검 / 철도 / 철창 (atk 6, 60g), 사냥활 (atk 5, 50g), 가죽 갑옷 (def 4, 50g), 청동 병부 (통솔 +2, 70g) |
| 백수촌 대장간 (`SHOP_BAISHUI_VILLAGE`) | 강철도 / 강철창 (atk 10, 150g), 각궁 (atk 9, 130g), 찰갑 (def 8, 120g), 옥패 (지력 +2, 70g) |

## Rationale
- PRD FR-008 and the Vertical Slice P0 list include equipment; this was the remaining unimplemented P0 system.
- Reusing the existing weapon/armor battle inputs keeps the deterministic core and golden evidence intact.
- Aptitude-gated weapons give recruitment and general identity a visible gear consequence without stat inflation.

## Balance evidence (informational, `npm run sim:encounters`, 50 seeds, Smart Command, Crane formation)
| North Gate boss party | Avg turns | Avg troop loss |
|---|---|---|
| Unequipped (current baseline) | 8.8 | 76% |
| Iron weapons for the three starters (180g; main-route budget before the boss is ~210g) | 6.6 | 62% |
| Upper bound (best Vertical Slice gear on all five) | 6.0 | 57% |

Equipment matters but does not remove the boss threat. Smart-only already wins without equipment; human playtest is still required before claiming difficulty validation.

## Open questions for approval
1. Aptitude multipliers (S 1.2 / A 1.1 / B 1.0 / C 0.8): keep, flatten, or widen?
2. Selling (e.g. 50% refund) — add in v1 or defer to MVP?
3. Should the Critical Journey require a purchase, or keep equipment optional? (Currently optional; the Critical Journey is unchanged.)
4. Item names are generic, original placeholders; final naming/art requires content review.

## Approval / integration gate
Not yet approved. Merge of the implementing PR into `implementation/bootstrap` requires explicit human approval.
