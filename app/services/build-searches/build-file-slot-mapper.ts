// Vendor
import Service, {inject as service} from '@ember/service';

// Services
import BuildSearchesBuildFilePriorityParser from 'better-trading/services/build-searches/build-file-priority-parser';

// Types
import {
  BuildSearchBuildFileInventorySlot,
  BuildSearchImportDraft,
  BuildSearchImportSlotMappingResult,
  BuildSearchPriority,
  BuildSearchSlotState,
} from 'better-trading/types/build-searches';

interface InventorySlotMapping {
  inventoryIds: string[];
  slotId: string;
  label: string;
}

const INVENTORY_SLOT_MAPPINGS: InventorySlotMapping[] = [
  {inventoryIds: ['Weapon1', 'Weapon2', 'MainHand1', 'MainHand2'], slotId: 'weapon', label: 'Weapon'},
  {inventoryIds: ['Helm1', 'Helmet1'], slotId: 'helmet', label: 'Helmet'},
  {inventoryIds: ['BodyArmour1', 'BodyArmor1', 'Chest1'], slotId: 'bodyArmour', label: 'Body armour'},
  {inventoryIds: ['Gloves1'], slotId: 'gloves', label: 'Gloves'},
  {inventoryIds: ['Boots1'], slotId: 'boots', label: 'Boots'},
  {inventoryIds: ['Belt1'], slotId: 'belt', label: 'Belt'},
  {inventoryIds: ['Ring1', 'Ring2'], slotId: 'ring', label: 'Ring'},
  {inventoryIds: ['Amulet1'], slotId: 'amulet', label: 'Amulet'},
  {inventoryIds: ['Shield1', 'Shield2', 'Offhand1', 'Offhand2'], slotId: 'shield', label: 'Shield'},
  {inventoryIds: ['Focus1', 'Focus2'], slotId: 'focus', label: 'Focus'},
  {inventoryIds: ['Quiver1'], slotId: 'quiver', label: 'Quiver'},
];

export default class BuildSearchesBuildFileSlotMapper extends Service {
  @service('build-searches/build-file-priority-parser')
  priorityParser: BuildSearchesBuildFilePriorityParser;

  mapDraftToSlotStates(
    draft: BuildSearchImportDraft,
    slotStates: BuildSearchSlotState[]
  ): BuildSearchImportSlotMappingResult {
    let mappedSlotStates = slotStates.map((slotState) => ({...slotState}));
    const importedSlotIds = new Set<string>();
    const warnings: string[] = [];

    draft.inventorySlots.forEach((inventorySlot) => {
      if (!this.hasSlotHint(inventorySlot)) return;

      const mapping = this.mappingForInventoryId(inventorySlot.inventoryId);

      if (!mapping) {
        warnings.push(`${inventorySlot.inventoryId} is not a supported .build inventory slot.`);

        return;
      }

      if (importedSlotIds.has(mapping.slotId)) {
        warnings.push(`${inventorySlot.inventoryId} maps to ${mapping.label}, which is already imported.`);

        return;
      }

      const slotExists = mappedSlotStates.some((slotState) => slotState.slotId === mapping.slotId);

      if (!slotExists) {
        warnings.push(`${inventorySlot.inventoryId} maps to ${mapping.label}, which is not available here.`);

        return;
      }

      importedSlotIds.add(mapping.slotId);
      mappedSlotStates = mappedSlotStates.map((slotState) => {
        if (slotState.slotId !== mapping.slotId) return slotState;

        return {
          ...slotState,
          selected: true,
          base: inventorySlot.uniqueName || slotState.base,
          priorities: this.mergeImportedPriorities(
            slotState.priorities,
            this.priorityParser.parsePriorities(inventorySlot.additionalText)
          ),
        };
      });
    });

    return {
      slotStates: mappedSlotStates,
      warnings,
    };
  }

  private hasSlotHint(inventorySlot: BuildSearchBuildFileInventorySlot): boolean {
    return Boolean(inventorySlot.uniqueName.trim() || inventorySlot.additionalText.trim());
  }

  private mergeImportedPriorities(
    existingPriorities: BuildSearchPriority[],
    importedPriorities: BuildSearchPriority[]
  ): BuildSearchPriority[] {
    const existingPriorityKeys = new Set(existingPriorities.map(({statKey}) => statKey));
    const updatedExistingPriorities = existingPriorities.map((priority) => {
      const importedPriority = importedPriorities.find(({statKey}) => statKey === priority.statKey);

      if (!importedPriority) {
        return {
          ...priority,
          enabled: false,
        };
      }

      return {
        ...priority,
        enabled: true,
        weight: importedPriority.weight,
        min: importedPriority.min,
        max: importedPriority.max,
      };
    });
    const customPriorities = importedPriorities.filter(({statKey}) => !existingPriorityKeys.has(statKey));

    return updatedExistingPriorities.concat(customPriorities);
  }

  private mappingForInventoryId(inventoryId: string): InventorySlotMapping | null {
    const normalizedInventoryId = inventoryId.toLowerCase();

    return (
      INVENTORY_SLOT_MAPPINGS.find((mapping) =>
        mapping.inventoryIds.some((mappedInventoryId) => mappedInventoryId.toLowerCase() === normalizedInventoryId)
      ) || null
    );
  }
}

declare module '@ember/service' {
  interface Registry {
    'build-searches/build-file-slot-mapper': BuildSearchesBuildFileSlotMapper;
  }
}
