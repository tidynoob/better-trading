// Vendor
import Service, {inject as service} from '@ember/service';

// Services
import BuildSearchesStatMapping from 'better-trading/services/build-searches/stat-mapping';

// Types
import {
  BuildSearchMappedStat,
  BuildSearchPreviewSlot,
  BuildSearchSlotState,
  BuildSearchTradeQuery,
  BuildSearchUnmappedStat,
} from 'better-trading/types/build-searches';

interface MinMaxValue {
  min?: number;
  max?: number;
}

// Constants
const TYPE_FILTERS_KEY = 'type_filters';

export default class BuildSearchesQueryGenerator extends Service {
  @service('build-searches/stat-mapping')
  statMapping: BuildSearchesStatMapping;

  async generatePreview(slots: BuildSearchSlotState[]): Promise<BuildSearchPreviewSlot[]> {
    const validTradeStatIds = await this.statMapping.fetchValidTradeStatIds();
    const validTradeStatIdSet = validTradeStatIds ? new Set(validTradeStatIds) : null;

    return slots.map((slot) => this.generateSlotPreview(slot, validTradeStatIdSet));
  }

  private generateSlotPreview(
    slot: BuildSearchSlotState,
    validTradeStatIds: Set<string> | null
  ): BuildSearchPreviewSlot {
    const {mappedStats, unmappedStats} = this.resolveStats(slot, validTradeStatIds);
    const errors = mappedStats.length === 0 ? ['At least one mapped stat is required.'] : [];
    const warnings = unmappedStats.length > 0 ? ['Unmapped stats will be skipped.'] : [];
    const query = errors.length === 0 ? this.buildQuery(slot, mappedStats) : null;

    return {
      slotId: slot.slotId,
      title: `${slot.label} search`,
      category: slot.category,
      base: slot.base,
      groupType: slot.groupType,
      countMin: this.resolveCountMin(slot, mappedStats),
      groupMin: slot.groupMin,
      groupMax: slot.groupMax,
      mappedStats,
      unmappedStats,
      errors,
      warnings,
      query,
    };
  }

  private resolveStats(
    slot: BuildSearchSlotState,
    validTradeStatIds: Set<string> | null
  ): {mappedStats: BuildSearchMappedStat[]; unmappedStats: BuildSearchUnmappedStat[]} {
    return slot.priorities
      .filter((priority) => priority.enabled)
      .reduce(
        (result, priority) => {
          const mapping = this.statMapping.getMapping(priority.statKey);

          if (!mapping) {
            result.unmappedStats.push({
              statKey: priority.statKey,
              label: priority.label,
              reason: 'No stat mapping exists.',
            });

            return result;
          }

          if (validTradeStatIds && !validTradeStatIds.has(mapping.tradeStatId)) {
            result.unmappedStats.push({
              statKey: priority.statKey,
              label: priority.label,
              reason: 'The mapped trade stat was not found in the live trade stat list.',
            });

            return result;
          }

          result.mappedStats.push({
            statKey: priority.statKey,
            label: priority.label,
            tradeStatId: mapping.tradeStatId,
            weight: priority.weight,
            min: priority.min,
            max: priority.max,
          });

          return result;
        },
        {mappedStats: [], unmappedStats: []} as {
          mappedStats: BuildSearchMappedStat[];
          unmappedStats: BuildSearchUnmappedStat[];
        }
      );
  }

  private buildQuery(slot: BuildSearchSlotState, mappedStats: BuildSearchMappedStat[]): BuildSearchTradeQuery {
    const typeFilters: {
      category: {option: string};
      rarity?: {option: string};
    } = {
      category: {
        option: slot.category,
      },
    };

    if (slot.rarity) {
      typeFilters.rarity = {
        option: slot.rarity,
      };
    }

    const query: {
      status: {option: string};
      type?: string;
      stats: object[];
      filters: object;
    } = {
      status: {
        option: 'online',
      },
      stats: [this.buildStatGroup(slot, mappedStats)],
      filters: {
        [TYPE_FILTERS_KEY]: {
          filters: typeFilters,
        },
      },
    };

    const base = slot.base.trim();
    if (base) query.type = base;

    return {
      query,
      sort: slot.groupType === 'weight2' ? {'statgroup.0': 'desc'} : {price: 'asc'},
    };
  }

  private buildStatGroup(slot: BuildSearchSlotState, mappedStats: BuildSearchMappedStat[]): object {
    if (slot.groupType === 'weight2') {
      return {
        type: 'weight2',
        value: this.minMaxValue(slot.groupMin, slot.groupMax),
        filters: mappedStats.map((stat) => ({
          id: stat.tradeStatId,
          value: {
            ...this.minMaxValue(stat.min, stat.max),
            weight: stat.weight,
          },
        })),
      };
    }

    return {
      type: 'count',
      value: {
        min: this.resolveCountMin(slot, mappedStats),
      },
      filters: mappedStats.map((stat) => ({
        id: stat.tradeStatId,
        value: this.minMaxValue(stat.min, stat.max),
      })),
    };
  }

  private resolveCountMin(slot: BuildSearchSlotState, mappedStats: BuildSearchMappedStat[]): number {
    if (slot.countMin === null) return mappedStats.length;

    return Math.max(1, Math.min(slot.countMin, mappedStats.length));
  }

  private minMaxValue(min: number | null, max: number | null): MinMaxValue {
    const value: MinMaxValue = {};
    if (min !== null) value.min = min;
    if (max !== null) value.max = max;

    return value;
  }
}

declare module '@ember/service' {
  interface Registry {
    'build-searches/query-generator': BuildSearchesQueryGenerator;
  }
}
