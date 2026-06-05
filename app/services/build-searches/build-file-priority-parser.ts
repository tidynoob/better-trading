// Vendor
import Service from '@ember/service';

// Utilities
import {slugify} from 'better-trading/utilities/slugify';

// Data
import {STAT_OPTIONS} from 'better-trading/services/build-searches/stat-mapping';

// Types
import {BuildSearchPriority} from 'better-trading/types/build-searches';

interface StatAlias {
  statKey: string;
  patterns: RegExp[];
}

const STAT_ALIASES: StatAlias[] = [
  {
    statKey: 'maximumLife',
    patterns: [/\b(maximum|max)?\s*(life|health)\b/i, /\bincreased\s+(life|health)\b/i],
  },
  {
    statKey: 'maximumMana',
    patterns: [/\b(maximum|max)?\s*mana\b/i, /\bincreased\s+mana\b/i],
  },
  {
    statKey: 'energyShield',
    patterns: [/\benergy\s+shield\b/i],
  },
  {
    statKey: 'elementalResistance',
    patterns: [/\belemental\s+resistances?\b/i, /\bresistances?\b/i],
  },
  {
    statKey: 'fireResistance',
    patterns: [/\bfire\s+resistances?\b/i],
  },
  {
    statKey: 'coldResistance',
    patterns: [/\bcold\s+resistances?\b/i],
  },
  {
    statKey: 'lightningResistance',
    patterns: [/\blightning\s+resistances?\b/i],
  },
  {
    statKey: 'chaosResistance',
    patterns: [/\bchaos\s+resistances?\b/i],
  },
  {
    statKey: 'movementSpeed',
    patterns: [/\bmovement\s+speed\b/i],
  },
  {
    statKey: 'strength',
    patterns: [/\bstrength\b/i],
  },
  {
    statKey: 'dexterity',
    patterns: [/\bdexterity\b/i],
  },
  {
    statKey: 'intelligence',
    patterns: [/\bintelligence\b/i],
  },
  {
    statKey: 'spellDamage',
    patterns: [/\bspell\s+damage\b/i],
  },
  {
    statKey: 'physicalDamage',
    patterns: [/\bphysical\s+(damage|dps)\b/i, /\b(flat\s+)?damage\s+to\s+attacks\b/i],
  },
  {
    statKey: 'attackSpeed',
    patterns: [/\battack\s+speed\b/i],
  },
];

export default class BuildSearchesBuildFilePriorityParser extends Service {
  parsePriorities(additionalText: string): BuildSearchPriority[] {
    const priorities: BuildSearchPriority[] = [];

    this.priorityLines(additionalText).forEach((line) => {
      const priority = this.priorityForLine(line, priorities.length);
      const existingPriority = priorities.find(({statKey}) => statKey === priority.statKey);

      if (existingPriority && !priority.statKey.startsWith('imported-unmapped:')) {
        if (existingPriority.min === null) existingPriority.min = priority.min;

        return;
      }

      priorities.push(priority);
    });

    return priorities;
  }

  private priorityForLine(line: string, index: number): BuildSearchPriority {
    const statKey = this.statKeyForLine(line);

    if (!statKey) {
      return {
        statKey: `imported-unmapped:${slugify(line)}:${index}`,
        label: line,
        enabled: true,
        weight: 0,
        min: null,
        max: null,
      };
    }

    const statOption = STAT_OPTIONS.find(({key}) => key === statKey);

    return {
      statKey,
      label: statOption?.label || line,
      enabled: true,
      weight: statOption?.defaultWeight || 1,
      min: this.minValue(line),
      max: null,
    };
  }

  private priorityLines(additionalText: string): string[] {
    return this.stripMarkup(additionalText)
      .split(/\n+/)
      .map((line) => this.cleanLine(line))
      .filter((line) => Boolean(line));
  }

  private stripMarkup(value: string): string {
    return value
      .replace(/\r/g, '\n')
      .replace(/<[^>{]+>\{/g, '')
      .replace(/[{}]/g, '');
  }

  private cleanLine(value: string): string {
    const cleanedValue = value
      .trim()
      .replace(/^\d+[\.)]\s*/, '')
      .replace(/^[-*]\s*/, '')
      .trim();

    if (/^stat\s+priority$/i.test(cleanedValue)) return '';
    if (/^-+$/.test(cleanedValue)) return '';

    return cleanedValue;
  }

  private statKeyForLine(line: string): string | null {
    const alias = STAT_ALIASES.find((statAlias) => statAlias.patterns.some((pattern) => pattern.test(line)));

    return alias?.statKey || null;
  }

  private minValue(line: string): number | null {
    const match = line.match(/\+?\s*(\d+(?:\.\d+)?)\s*\+?/);

    return match ? Number(match[1]) : null;
  }
}

declare module '@ember/service' {
  interface Registry {
    'build-searches/build-file-priority-parser': BuildSearchesBuildFilePriorityParser;
  }
}
