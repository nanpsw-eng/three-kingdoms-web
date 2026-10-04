import type { ContentRegistry } from '../../game/content/registry';
import type { SaveGame } from '../../game/domain/save/index';
import type { ShopDefinition } from '../../game/schemas';
import { effectSummary, SLOT_LABEL } from './EquipmentLabels';

interface ShopSheetProps {
  save: SaveGame;
  registry: ContentRegistry;
  shop: ShopDefinition;
  t(key: string): string;
  onBuy(itemId: string): void;
  onClose(): void;
}

export function ShopSheet({ save, registry, shop, t, onBuy, onClose }: ShopSheetProps) {
  return (
    <section className="location-sheet shop-sheet" role="dialog" aria-label="상점">
      <div className="sheet-heading">
        <div>
          <p className="eyebrow">상점</p>
          <strong>{t(shop.nameKey)}</strong>
        </div>
        <button type="button" className="sheet-close" aria-label="상점 닫기" onClick={onClose}>×</button>
      </div>
      <p className="gold-line" data-testid="shop-gold">보유 금 {save.gold.toLocaleString('ko-KR')}</p>
      <ul className="item-list">
        {shop.itemIds.map((itemId) => {
          const item = registry.equipment.get(itemId);
          if (!item) return null;
          const name = t(item.nameKey);
          const owned = save.inventory[itemId] ?? 0;
          const affordable = save.gold >= item.price;
          return (
            <li key={itemId} className="item-row">
              <div className="item-text">
                <strong>{name}</strong>
                <span>{SLOT_LABEL[item.slot]} · {effectSummary(item)}</span>
                <small>{t(item.descriptionKey)}{owned > 0 ? ` (보관 ${owned})` : ''}</small>
              </div>
              <button
                type="button"
                aria-label={'구매: ' + name + ', ' + item.price + '금'}
                disabled={!affordable}
                onClick={() => onBuy(itemId)}
              >
                {item.price}금{affordable ? '' : ' · 부족'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
