// Vendor
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {beforeEach, describe, it} from 'mocha';

// Types
import PageBuildSearches from 'better-trading/pods/components/page/build-searches/component';
import {BuildSearchSlotState} from 'better-trading/types/build-searches';

declare const require: (moduleName: string) => any;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {ARGS_SET} = require('@glimmer/component/-private/component');

describe('Unit | Component | Page | Build Searches', () => {
  setupTest();

  let component: PageBuildSearches;

  beforeEach(function () {
    const args = {};
    ARGS_SET.set(args, true);
    component = new PageBuildSearches(this.owner, args);
    component.buildFileImporter = this.owner.lookup('service:build-searches/build-file-importer');
    component.buildFileSlotMapper = this.owner.lookup('service:build-searches/build-file-slot-mapper');
  });

  it('imports a .build draft without changing manual slot state', () => {
    const manualSlots = [slotState('weapon', 'Weapon', false), slotState('boots', 'Boots', true)];
    component.slotStates = manualSlots;
    component.previewSlots = [
      {
        slotId: 'boots',
        title: 'Boots search',
        category: 'armour.boots',
        base: '',
        groupType: 'count',
        countMin: null,
        groupMin: 80,
        groupMax: null,
        mappedStats: [],
        unmappedStats: [],
        errors: [],
        warnings: [],
        query: null,
      },
    ];
    component.saveResult = {
      folderId: 'folder-1',
      saved: [],
      failed: [],
    };
    component.importJson = JSON.stringify({
      name: 'Imported Titan',
      ascendancy: 'Warrior1',
      // eslint-disable-next-line camelcase
      inventory_slots: [{inventory_id: 'Weapon1', additional_text: 'Stat Priority'}],
    });

    component.importPastedBuild();

    expect(component.buildName).to.equal('Imported Titan');
    expect(component.ascendancy).to.equal('Warrior1');
    expect(component.slotStates.find(({slotId}) => slotId === 'weapon')?.selected).to.be.true;
    expect(component.slotStates.find(({slotId}) => slotId === 'boots')).to.deep.equal(manualSlots[1]);
    expect(component.importDraft?.inventorySlots[0].inventoryId).to.equal('Weapon1');
    expect(component.previewSlots).to.be.null;
    expect(component.saveResult).to.be.null;
  });

  it('clears stale preview and save state when an imported slot is edited', () => {
    component.slotStates = [slotState('boots', 'Boots', true)];
    component.previewSlots = [
      {
        slotId: 'boots',
        title: 'Boots search',
        category: 'armour.boots',
        base: '',
        groupType: 'count',
        countMin: null,
        groupMin: 80,
        groupMax: null,
        mappedStats: [],
        unmappedStats: [],
        errors: [],
        warnings: [],
        query: null,
      },
    ];
    component.saveResult = {
      folderId: 'folder-1',
      saved: [],
      failed: [],
    };

    component.updateSlotBase('boots', {target: {value: 'Expert Greaves'}} as any);

    expect(component.slotStates[0].base).to.equal('Expert Greaves');
    expect(component.previewSlots).to.be.null;
    expect(component.saveResult).to.be.null;
  });

  it('clears imported draft state when returning to manual Build Searches', () => {
    const manualSlots = [slotState('boots', 'Boots', true)];
    component.slotStates = manualSlots;
    component.importDraft = {
      buildName: 'Imported Titan',
      ascendancy: 'Warrior1',
      inventorySlots: [],
    };
    component.importWarnings = ['Ring2 maps to Ring, which is already imported.'];
    component.importError = 'Choose a .build file.';
    component.previewSlots = [
      {
        slotId: 'boots',
        title: 'Boots search',
        category: 'armour.boots',
        base: '',
        groupType: 'count',
        countMin: null,
        groupMin: 80,
        groupMax: null,
        mappedStats: [],
        unmappedStats: [],
        errors: [],
        warnings: [],
        query: null,
      },
    ];
    component.saveResult = {
      folderId: 'folder-1',
      saved: [],
      failed: [],
    };

    component.clearImportedBuild();

    expect(component.importDraft).to.be.null;
    expect(component.importWarnings).to.deep.equal([]);
    expect(component.importError).to.equal('');
    expect(component.slotStates).to.deep.equal(manualSlots);
    expect(component.previewSlots).to.be.null;
    expect(component.saveResult).to.be.null;
  });
});

const slotState = (slotId: string, label: string, selected: boolean): BuildSearchSlotState => ({
  selected,
  slotId,
  label,
  category: slotId === 'boots' ? 'armour.boots' : 'weapon',
  base: slotId === 'boots' ? 'Expert Greaves' : '',
  rarity: 'rare',
  groupType: 'count',
  countMin: null,
  groupMin: 80,
  groupMax: null,
  priorities: [
    {
      statKey: 'maximumLife',
      label: 'Maximum life',
      enabled: true,
      weight: 1,
      min: 50,
      max: null,
    },
  ],
});
