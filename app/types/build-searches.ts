export interface BuildSearchStatOption {
  key: string;
  label: string;
  tradeStatId: string;
  defaultWeight: number;
}

export interface BuildSearchPriority {
  statKey: string;
  label: string;
  enabled: boolean;
  weight: number;
  min: number | null;
  max: number | null;
}

export interface BuildSearchGearSlotTemplate {
  slotId: string;
  label: string;
  category: string;
  base: string;
  rarity: string;
  groupMin: number | null;
  groupMax: number | null;
  priorities: BuildSearchPriority[];
}

export interface BuildSearchSlotState extends BuildSearchGearSlotTemplate {
  selected: boolean;
}

export interface BuildSearchBuildFileInventorySlot {
  inventoryId: string;
  slotX: number | null;
  slotY: number | null;
  levelInterval: number | number[] | null;
  uniqueName: string;
  additionalText: string;
}

export interface BuildSearchImportDraft {
  buildName: string;
  ascendancy: string;
  inventorySlots: BuildSearchBuildFileInventorySlot[];
}

export interface BuildSearchImportSlotMappingResult {
  slotStates: BuildSearchSlotState[];
  warnings: string[];
}

export interface BuildSearchMappedStat {
  statKey: string;
  label: string;
  tradeStatId: string;
  weight: number;
  min: number | null;
  max: number | null;
}

export interface BuildSearchUnmappedStat {
  statKey: string;
  label: string;
  reason: string;
}

export interface BuildSearchTradeQuery {
  query: object;
  sort: {
    price: string;
  };
}

export interface BuildSearchPreviewSlot {
  slotId: string;
  title: string;
  category: string;
  base: string;
  groupMin: number | null;
  groupMax: number | null;
  mappedStats: BuildSearchMappedStat[];
  unmappedStats: BuildSearchUnmappedStat[];
  errors: string[];
  warnings: string[];
  query: BuildSearchTradeQuery | null;
}

export interface BuildSearchPostedSearch {
  slotId: string;
  title: string;
  slug: string;
}

export interface BuildSearchFailedSearch {
  slotId: string;
  title: string;
  message: string;
}

export interface BuildSearchSaveResult {
  folderId: string | null;
  saved: BuildSearchPostedSearch[];
  failed: BuildSearchFailedSearch[];
}
