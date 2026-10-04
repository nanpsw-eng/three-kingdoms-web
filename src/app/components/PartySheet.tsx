import { useState } from 'react';
import { equipmentLoadout, equippedStatsAt, maxTroopsAt } from '../../game/battle/fromContent';
import type { ContentRegistry } from '../../game/content/registry';
import type { SaveGame } from '../../game/domain/save/index';
import { equippableFromInventory, SLOT_KEY, weaponAptitudeOf } from '../../game/equipment/inventory';
import type { EquipmentSlot } from '../../game/schemas';
import { nameOf } from './BattleScreen';
import { effectSummary, SLOT_LABEL, STAT_KEYS, statLabel } from './EquipmentLabels';

interface PartySheetProps {
  save: SaveGame;
  registry: ContentRegistry;
  t(key: string): string;
  onEquip(generalId: string, itemId: string): void;
  onUnequip(generalId: string, slot: EquipmentSlot): void;
  onClose(): void;
}

const SLOTS: EquipmentSlot[] = ['WEAPON', 'ARMOR', 'ACCESSORY'];

export function PartySheet({ save, registry, t, onEquip, onUnequip, onClose }: PartySheetProps) {
  const members = [...save.party.activeGeneralIds, ...save.party.reserveGeneralIds];
  const [selected, setSelected] = useState(members[0] ?? '');
  const generalId = members.includes(selected) ? selected : members[0]!;
  const progress = save.generals[generalId]!;
  const stats = equippedStatsAt(registry, generalId, progress.level, progress.equipment);
  const loadout = equipmentLoadout(registry, generalId, progress.equipment);
  const name = nameOf(registry, t, generalId);
  const storedCount = Object.values(save.inventory).reduce((sum, n) => sum + n, 0);

  return (
    <section className="location-sheet party-sheet" role="dialog" aria-label="부대 편성">
      <div className="sheet-heading">
        <div>
          <p className="eyebrow">부대 · 무구</p>
          <strong>{name} Lv.{progress.level}</strong>
        </div>
        <button type="button" className="sheet-close" aria-label="부대 편성 닫기" onClick={onClose}>×</button>
      </div>
      <p className="gold-line">보유 금 {save.gold.toLocaleString('ko-KR')} · 보관 무구 {storedCount}개</p>

      <div className="location-group" role="group" aria-label="장수 선택">
        <div className="location-buttons member-tabs">
          {members.map((id) => (
            <button
              type="button"
              key={id}
              aria-pressed={id === generalId}
              className={id === generalId ? 'selected' : ''}
              onClick={() => setSelected(id)}
            >
              {nameOf(registry, t, id)}{save.party.reserveGeneralIds.includes(id) ? ' (예비)' : ''}
            </button>
          ))}
        </div>
      </div>

      <dl className="stat-grid" aria-label={name + ' 능력치'}>
        {STAT_KEYS.map((key) => (
          <div key={key}><dt>{statLabel(key)}</dt><dd>{stats[key]}</dd></div>
        ))}
        <div><dt>병력</dt><dd>{progress.currentTroops.toLocaleString('ko-KR')} / {maxTroopsAt(registry, generalId, progress.level).toLocaleString('ko-KR')}</dd></div>
        <div><dt>무구 공격</dt><dd>+{loadout.weaponAttack}</dd></div>
        <div><dt>무구 방어</dt><dd>+{loadout.armorDefense}</dd></div>
      </dl>

      {SLOTS.map((slot) => {
        const currentId = progress.equipment[SLOT_KEY[slot]];
        const current = currentId ? registry.equipment.get(currentId) : undefined;
        const candidates = equippableFromInventory(save, registry, generalId, slot);
        return (
          <div className="location-group equip-slot" key={slot} role="group" aria-label={name + ' ' + SLOT_LABEL[slot]}>
            <span>{SLOT_LABEL[slot]} · {current ? `${t(current.nameKey)} (${effectSummary(current)})` : '없음'}</span>
            <div className="location-buttons">
              {current && (
                <button type="button" onClick={() => onUnequip(generalId, slot)} aria-label={'해제: ' + t(current.nameKey)}>
                  해제
                </button>
              )}
              {candidates.map((item) => {
                const grade = weaponAptitudeOf(registry, generalId, item.id);
                return (
                  <button type="button" key={item.id} onClick={() => onEquip(generalId, item.id)} aria-label={'장착: ' + t(item.nameKey)}>
                    {t(item.nameKey)}{grade ? ` · 적성 ${grade}` : ''}
                  </button>
                );
              })}
              {!current && candidates.length === 0 && <small>장착할 수 있는 보관 무구가 없습니다.</small>}
            </div>
          </div>
        );
      })}
    </section>
  );
}
