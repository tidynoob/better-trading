// Vendor
import Service, {inject as service} from '@ember/service';

// Services
import Storage from 'better-trading/services/storage';

// Types
import {
  BuildSearchGearSlotTemplate,
  BuildSearchGroupType,
  BuildSearchPriority,
  BuildSearchSlotState,
} from 'better-trading/types/build-searches';

// Data
import {STAT_OPTIONS} from 'better-trading/services/build-searches/stat-mapping';

interface DefaultTemplate {
  slotId: string;
  label: string;
  category: string;
  base?: string;
  rarity?: string;
  groupType?: BuildSearchGroupType;
  countMin?: number | null;
  groupMin: number;
  groupMax?: number | null;
  priorities: Array<Partial<BuildSearchPriority>>;
}

// Constants
const TEMPLATES_STORAGE_KEY = 'build-search-gear-slot-templates';
const DEFAULT_GROUP_TYPE: BuildSearchGroupType = 'count';
const DEFAULT_GROUP_MIN = 80;
const ATTRIBUTE_WEIGHT = 0.25;
const CHAOS_RESISTANCE_WEIGHT = 0.5;
const ELEMENTAL_RESISTANCE_WEIGHT = 0.35;
const FAST_ATTACK_WEIGHT = 0.75;
const MANA_WEIGHT = 0.5;

const priority = (statKey: string, weight: number): Partial<BuildSearchPriority> => ({
  statKey,
  enabled: true,
  weight,
  min: null,
  max: null,
});

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    slotId: 'weapon',
    label: 'Weapon',
    category: 'weapon',
    groupMin: DEFAULT_GROUP_MIN,
    priorities: [priority('physicalDamage', 1), priority('attackSpeed', 1), priority('spellDamage', 1)],
  },
  {
    slotId: 'helmet',
    label: 'Helmet',
    category: 'armour.helmet',
    groupMin: DEFAULT_GROUP_MIN,
    priorities: [
      priority('maximumLife', 1),
      priority('elementalResistance', ELEMENTAL_RESISTANCE_WEIGHT),
      priority('chaosResistance', CHAOS_RESISTANCE_WEIGHT),
    ],
  },
  {
    slotId: 'bodyArmour',
    label: 'Body armour',
    category: 'armour.chest',
    groupMin: DEFAULT_GROUP_MIN,
    priorities: [
      priority('maximumLife', 1),
      priority('elementalResistance', ELEMENTAL_RESISTANCE_WEIGHT),
      priority('energyShield', 1),
    ],
  },
  {
    slotId: 'gloves',
    label: 'Gloves',
    category: 'armour.gloves',
    groupMin: DEFAULT_GROUP_MIN,
    priorities: [
      priority('maximumLife', 1),
      priority('elementalResistance', ELEMENTAL_RESISTANCE_WEIGHT),
      priority('attackSpeed', FAST_ATTACK_WEIGHT),
    ],
  },
  {
    slotId: 'boots',
    label: 'Boots',
    category: 'armour.boots',
    groupMin: DEFAULT_GROUP_MIN,
    priorities: [
      priority('maximumLife', 1),
      priority('elementalResistance', ELEMENTAL_RESISTANCE_WEIGHT),
      priority('movementSpeed', 2),
    ],
  },
  {
    slotId: 'shield',
    label: 'Shield',
    category: 'armour.shield',
    groupMin: DEFAULT_GROUP_MIN,
    priorities: [
      priority('maximumLife', 1),
      priority('elementalResistance', ELEMENTAL_RESISTANCE_WEIGHT),
      priority('energyShield', 1),
    ],
  },
  {
    slotId: 'focus',
    label: 'Focus',
    category: 'armour.focus',
    groupMin: DEFAULT_GROUP_MIN,
    priorities: [priority('maximumLife', 1), priority('maximumMana', MANA_WEIGHT), priority('spellDamage', 1)],
  },
  {
    slotId: 'quiver',
    label: 'Quiver',
    category: 'armour.quiver',
    groupMin: DEFAULT_GROUP_MIN,
    priorities: [
      priority('maximumLife', 1),
      priority('elementalResistance', ELEMENTAL_RESISTANCE_WEIGHT),
      priority('attackSpeed', FAST_ATTACK_WEIGHT),
    ],
  },
  {
    slotId: 'ring',
    label: 'Ring',
    category: 'accessory.ring',
    groupMin: DEFAULT_GROUP_MIN,
    priorities: [
      priority('maximumLife', 1),
      priority('elementalResistance', ELEMENTAL_RESISTANCE_WEIGHT),
      priority('strength', ATTRIBUTE_WEIGHT),
    ],
  },
  {
    slotId: 'amulet',
    label: 'Amulet',
    category: 'accessory.amulet',
    groupMin: DEFAULT_GROUP_MIN,
    priorities: [
      priority('maximumLife', 1),
      priority('elementalResistance', ELEMENTAL_RESISTANCE_WEIGHT),
      priority('spellDamage', 1),
    ],
  },
  {
    slotId: 'belt',
    label: 'Belt',
    category: 'accessory.belt',
    groupMin: DEFAULT_GROUP_MIN,
    priorities: [
      priority('maximumLife', 1),
      priority('elementalResistance', ELEMENTAL_RESISTANCE_WEIGHT),
      priority('chaosResistance', CHAOS_RESISTANCE_WEIGHT),
    ],
  },
];

export default class BuildSearchesTemplates extends Service {
  @service('storage')
  storage: Storage;

  async fetchTemplates(): Promise<BuildSearchGearSlotTemplate[]> {
    const persistedTemplates = await this.storage.getValue<BuildSearchGearSlotTemplate[]>(TEMPLATES_STORAGE_KEY);

    try {
      return this.mergeTemplates(Array.isArray(persistedTemplates) ? persistedTemplates : []);
    } catch {
      return this.mergeTemplates([]);
    }
  }

  async persistTemplates(templates: BuildSearchGearSlotTemplate[]) {
    await this.storage.setValue(
      TEMPLATES_STORAGE_KEY,
      templates.map((template) => this.normalizeTemplate(template))
    );
  }

  createSlotStates(templates: BuildSearchGearSlotTemplate[]): BuildSearchSlotState[] {
    return templates.map((template) => ({
      ...this.cloneTemplate(template),
      selected: false,
    }));
  }

  defaultSlotStates(): BuildSearchSlotState[] {
    return this.createSlotStates(this.mergeTemplates([]));
  }

  cloneTemplates(templates: BuildSearchGearSlotTemplate[]) {
    return templates.map((template) => this.cloneTemplate(template));
  }

  normalizeTemplate(template: Partial<BuildSearchGearSlotTemplate> | DefaultTemplate): BuildSearchGearSlotTemplate {
    const defaultTemplate = DEFAULT_TEMPLATES.find(({slotId}) => slotId === template.slotId) || DEFAULT_TEMPLATES[0];

    return {
      slotId: this.stringValue(template.slotId, defaultTemplate.slotId),
      label: this.stringValue(template.label, defaultTemplate.label),
      category: this.stringValue(template.category, defaultTemplate.category),
      base: this.stringValue(template.base, ''),
      rarity: this.stringValue(template.rarity, 'rare'),
      groupType: this.groupTypeValue(template.groupType),
      countMin: this.numberValue(template.countMin, null),
      groupMin: this.numberValue(template.groupMin, DEFAULT_GROUP_MIN),
      groupMax: this.numberValue(template.groupMax, null),
      priorities: this.normalizePriorities(
        Array.isArray(template.priorities) ? template.priorities : defaultTemplate.priorities
      ),
    };
  }

  private mergeTemplates(persistedTemplates: BuildSearchGearSlotTemplate[]): BuildSearchGearSlotTemplate[] {
    return DEFAULT_TEMPLATES.map((defaultTemplate) => {
      const persistedTemplate = persistedTemplates.find(({slotId}) => slotId === defaultTemplate.slotId);

      return this.normalizeTemplate({
        ...defaultTemplate,
        ...persistedTemplate,
      });
    });
  }

  private cloneTemplate(template: BuildSearchGearSlotTemplate): BuildSearchGearSlotTemplate {
    return {
      ...template,
      priorities: template.priorities.map((templatePriority) => ({...templatePriority})),
    };
  }

  private normalizePriorities(priorities: Array<Partial<BuildSearchPriority>>): BuildSearchPriority[] {
    return STAT_OPTIONS.map((statOption) => {
      const priorityOverride = priorities.find(({statKey}) => statKey === statOption.key);

      return {
        statKey: statOption.key,
        label: statOption.label,
        enabled: Boolean(priorityOverride?.enabled),
        weight: priorityOverride?.weight === undefined ? statOption.defaultWeight : priorityOverride.weight,
        min: priorityOverride?.min === undefined ? null : priorityOverride.min,
        max: priorityOverride?.max === undefined ? null : priorityOverride.max,
      };
    });
  }

  private stringValue(value: string | undefined, fallback: string) {
    return value || fallback;
  }

  private groupTypeValue(value: BuildSearchGroupType | undefined): BuildSearchGroupType {
    return value === 'weight2' ? 'weight2' : DEFAULT_GROUP_TYPE;
  }

  private numberValue(value: number | null | undefined, fallback: number | null) {
    return value === undefined ? fallback : value;
  }
}

declare module '@ember/service' {
  interface Registry {
    'build-searches/templates': BuildSearchesTemplates;
  }
}
