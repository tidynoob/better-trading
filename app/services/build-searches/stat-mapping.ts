// Vendor
import Service, {inject as service} from '@ember/service';

// Utilities
import {dateDelta} from 'better-trading/utilities/date-delta';

// Types
import Storage from 'better-trading/services/storage';
import {BuildSearchStatOption} from 'better-trading/types/build-searches';

interface TradeStatsPayload {
  result: Array<{
    entries: Array<{
      id: string;
    }>;
  }>;
}

// Constants
const TRADE_STATS_CACHE_DURATION = 86400000; // 1 day
const TRADE_STATS_CACHE_KEY = 'poe2-trade-stat-list-cache';
const TRADE_STATS_URL = 'https://www.pathofexile.com/api/trade2/data/stats';

export const STAT_OPTIONS: BuildSearchStatOption[] = [
  {
    key: 'maximumLife',
    label: 'Maximum life',
    tradeStatId: 'pseudo.pseudo_total_life',
    defaultWeight: 1,
  },
  {
    key: 'maximumMana',
    label: 'Maximum mana',
    tradeStatId: 'pseudo.pseudo_total_mana',
    defaultWeight: 0.5,
  },
  {
    key: 'energyShield',
    label: 'Energy shield',
    tradeStatId: 'pseudo.pseudo_total_energy_shield',
    defaultWeight: 1,
  },
  {
    key: 'elementalResistance',
    label: 'Elemental resistance',
    tradeStatId: 'pseudo.pseudo_total_elemental_resistance',
    defaultWeight: 0.35,
  },
  {
    key: 'fireResistance',
    label: 'Fire resistance',
    tradeStatId: 'pseudo.pseudo_total_fire_resistance',
    defaultWeight: 0.35,
  },
  {
    key: 'coldResistance',
    label: 'Cold resistance',
    tradeStatId: 'pseudo.pseudo_total_cold_resistance',
    defaultWeight: 0.35,
  },
  {
    key: 'lightningResistance',
    label: 'Lightning resistance',
    tradeStatId: 'pseudo.pseudo_total_lightning_resistance',
    defaultWeight: 0.35,
  },
  {
    key: 'chaosResistance',
    label: 'Chaos resistance',
    tradeStatId: 'pseudo.pseudo_total_chaos_resistance',
    defaultWeight: 0.5,
  },
  {
    key: 'movementSpeed',
    label: 'Movement speed',
    tradeStatId: 'pseudo.pseudo_increased_movement_speed',
    defaultWeight: 2,
  },
  {
    key: 'strength',
    label: 'Strength',
    tradeStatId: 'pseudo.pseudo_total_strength',
    defaultWeight: 0.25,
  },
  {
    key: 'dexterity',
    label: 'Dexterity',
    tradeStatId: 'pseudo.pseudo_total_dexterity',
    defaultWeight: 0.25,
  },
  {
    key: 'intelligence',
    label: 'Intelligence',
    tradeStatId: 'pseudo.pseudo_total_intelligence',
    defaultWeight: 0.25,
  },
  {
    key: 'spellDamage',
    label: 'Spell damage',
    tradeStatId: 'explicit.stat_2974417149',
    defaultWeight: 1,
  },
  {
    key: 'physicalDamage',
    label: 'Physical damage',
    tradeStatId: 'explicit.stat_1509134228',
    defaultWeight: 1,
  },
  {
    key: 'attackSpeed',
    label: 'Attack speed',
    tradeStatId: 'explicit.stat_681332047',
    defaultWeight: 1,
  },
];

export default class BuildSearchesStatMapping extends Service {
  @service('storage')
  storage: Storage;

  get statOptions() {
    return STAT_OPTIONS;
  }

  getMapping(statKey: string): BuildSearchStatOption | null {
    return STAT_OPTIONS.find((statOption) => statOption.key === statKey) || null;
  }

  async fetchValidTradeStatIds(): Promise<string[] | null> {
    const cachedStatIds = await this.storage.getValue<string[]>(TRADE_STATS_CACHE_KEY);
    if (cachedStatIds) return cachedStatIds;

    try {
      const response = await fetch(TRADE_STATS_URL, {
        credentials: 'include',
      });
      if (!response.ok) return null;

      const payload = (await response.json()) as TradeStatsPayload;
      const statIds = this.extractStatIds(payload);

      await this.storage.setEphemeralValue(TRADE_STATS_CACHE_KEY, statIds, dateDelta(TRADE_STATS_CACHE_DURATION));

      return statIds;
    } catch (_error) {
      return null;
    }
  }

  private extractStatIds(payload: TradeStatsPayload) {
    return payload.result
      .map((group) => group.entries.map((entry) => entry.id))
      .reduce((allIds: string[], groupIds: string[]) => allIds.concat(groupIds), []);
  }
}

declare module '@ember/service' {
  interface Registry {
    'build-searches/stat-mapping': BuildSearchesStatMapping;
  }
}
