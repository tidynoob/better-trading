// Vendor
import Service from '@ember/service';

// Types
import {
  BuildSearchBuildFileInventorySlot,
  BuildSearchImportDraft,
} from 'better-trading/types/build-searches';

interface BuildFileInput {
  name: string;
  text: () => Promise<string>;
}

type BuildFilePayload = Record<string, unknown>;

export class BuildSearchBuildFileImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildSearchBuildFileImportError';
  }
}

export default class BuildSearchesBuildFileImporter extends Service {
  importText(text: string): BuildSearchImportDraft {
    const trimmedText = text.trim();

    if (this.isUnsupportedLink(trimmedText)) {
      throw new BuildSearchBuildFileImportError(
        'Build links are not supported yet. Paste .build JSON or choose a .build file.'
      );
    }

    let payload: unknown;

    try {
      payload = JSON.parse(trimmedText);
    } catch (_error) {
      throw new BuildSearchBuildFileImportError('The .build JSON could not be parsed.');
    }

    if (!this.isObject(payload)) {
      throw new BuildSearchBuildFileImportError('The .build JSON must be a root object.');
    }

    return this.normalizeBuild(payload);
  }

  async importFile(file: BuildFileInput): Promise<BuildSearchImportDraft> {
    if (!file.name.toLowerCase().endsWith('.build')) {
      throw new BuildSearchBuildFileImportError('Choose a .build file.');
    }

    return this.importText(await file.text());
  }

  private normalizeBuild(payload: BuildFilePayload): BuildSearchImportDraft {
    return {
      buildName: this.stringValue(payload.name),
      ascendancy: this.stringValue(payload.ascendancy),
      inventorySlots: this.inventorySlots(payload.inventory_slots),
    };
  }

  private inventorySlots(value: unknown): BuildSearchBuildFileInventorySlot[] {
    if (!Array.isArray(value)) return [];

    return value.filter((slot): slot is BuildFilePayload => this.isObject(slot)).map((slot) => ({
      inventoryId: this.stringValue(slot.inventory_id),
      slotX: this.numberValue(slot.slot_x),
      slotY: this.numberValue(slot.slot_y),
      levelInterval: this.levelIntervalValue(slot.level_interval),
      uniqueName: this.stringValue(slot.unique_name),
      additionalText: this.stringValue(slot.additional_text),
    }));
  }

  private isUnsupportedLink(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  private isObject(value: unknown): value is BuildFilePayload {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private numberValue(value: unknown): number | null {
    return typeof value === 'number' ? value : null;
  }

  private levelIntervalValue(value: unknown): number | number[] | null {
    if (typeof value === 'number') return value;

    if (Array.isArray(value) && value.every((level) => typeof level === 'number')) {
      return value;
    }

    return null;
  }
}

declare module '@ember/service' {
  interface Registry {
    'build-searches/build-file-importer': BuildSearchesBuildFileImporter;
  }
}
