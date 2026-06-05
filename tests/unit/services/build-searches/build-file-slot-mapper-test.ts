// Vendor
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {beforeEach, describe, it} from 'mocha';

// Types
import BuildSearchesBuildFileSlotMapper from 'better-trading/services/build-searches/build-file-slot-mapper';
import {BuildSearchImportDraft, BuildSearchSlotState} from 'better-trading/types/build-searches';

describe('Unit | Services | Build Searches | Build File Slot Mapper', () => {
  setupTest();

  let service: BuildSearchesBuildFileSlotMapper;

  beforeEach(function () {
    service = this.owner.lookup('service:build-searches/build-file-slot-mapper');
  });

  it('maps known .build inventory IDs to selected gear slots', () => {
    const result = service.mapDraftToSlotStates(
      draft([
        {inventoryId: 'Weapon1', uniqueName: "Kalandra's Touch"},
        {inventoryId: 'Helm1'},
        {inventoryId: 'BodyArmour1'},
        {inventoryId: 'Gloves1'},
        {inventoryId: 'Boots1'},
        {inventoryId: 'Belt1'},
        {inventoryId: 'Ring1'},
        {inventoryId: 'Amulet1'},
        {inventoryId: 'Shield1'},
        {inventoryId: 'Focus1'},
      ]),
      slotStates()
    );

    expect(selectedSlotIds(result.slotStates)).to.deep.equal([
      'weapon',
      'helmet',
      'bodyArmour',
      'gloves',
      'boots',
      'belt',
      'ring',
      'amulet',
      'shield',
      'focus',
    ]);
    expect(result.slotStates.find(({slotId}) => slotId === 'weapon')?.base).to.equal("Kalandra's Touch");
    expect(result.warnings).to.deep.equal([]);
  });

  it('keeps one editable gear slot for duplicate ring and weapon-style inventory IDs', () => {
    const result = service.mapDraftToSlotStates(
      draft([
        {inventoryId: 'Weapon1'},
        {inventoryId: 'Weapon2'},
        {inventoryId: 'Ring1'},
        {inventoryId: 'Ring2'},
      ]),
      slotStates()
    );

    expect(selectedSlotIds(result.slotStates)).to.deep.equal(['weapon', 'ring']);
    expect(result.warnings).to.deep.equal([
      'Weapon2 maps to Weapon, which is already imported.',
      'Ring2 maps to Ring, which is already imported.',
    ]);
  });

  it('returns a warning for unknown inventory IDs', () => {
    const result = service.mapDraftToSlotStates(draft([{inventoryId: 'Charm1'}]), slotStates());

    expect(selectedSlotIds(result.slotStates)).to.deep.equal([]);
    expect(result.warnings).to.deep.equal(['Charm1 is not a supported .build inventory slot.']);
  });

  it('ignores empty inventory slots', () => {
    const result = service.mapDraftToSlotStates(
      draft([{inventoryId: 'Boots1', additionalText: '', uniqueName: ''}]),
      slotStates()
    );

    expect(selectedSlotIds(result.slotStates)).to.deep.equal([]);
    expect(result.warnings).to.deep.equal([]);
  });

  it('parses imported gear notes into editable Gear Slot Priorities', () => {
    const result = service.mapDraftToSlotStates(
      draft([{inventoryId: 'Boots1', additionalText: '1. 50+ Maximum Life\n2. Level of all melee skills'}]),
      slotStates()
    );
    const boots = result.slotStates.find(({slotId}) => slotId === 'boots') as BuildSearchSlotState;
    const maximumLife = boots.priorities.find(({statKey}) => statKey === 'maximumLife');
    const unmappedStat = boots.priorities.find(({statKey}) => statKey.startsWith('imported-unmapped:'));

    expect(maximumLife?.enabled).to.be.true;
    expect(maximumLife?.min).to.equal(50);
    expect(unmappedStat?.label).to.equal('Level of all melee skills');
    expect(unmappedStat?.enabled).to.be.true;
  });
});

const draft = (
  slots: Array<{
    inventoryId: string;
    additionalText?: string;
    uniqueName?: string;
  }>
): BuildSearchImportDraft => ({
  buildName: 'Imported build',
  ascendancy: '',
  inventorySlots: slots.map((slot) => ({
    inventoryId: slot.inventoryId,
    slotX: null,
    slotY: null,
    levelInterval: null,
    uniqueName: slot.uniqueName || '',
    additionalText: slot.additionalText === undefined ? 'Stat Priority' : slot.additionalText,
  })),
});

const slotStates = (): BuildSearchSlotState[] =>
  [
    ['weapon', 'Weapon'],
    ['helmet', 'Helmet'],
    ['bodyArmour', 'Body armour'],
    ['gloves', 'Gloves'],
    ['boots', 'Boots'],
    ['belt', 'Belt'],
    ['ring', 'Ring'],
    ['amulet', 'Amulet'],
    ['shield', 'Shield'],
    ['focus', 'Focus'],
  ].map(([slotId, label]) => ({
    selected: false,
    slotId,
    label,
    category: '',
    base: '',
    rarity: 'rare',
    groupMin: 80,
    groupMax: null,
    priorities:
      slotId === 'boots'
        ? [
            {
              statKey: 'maximumLife',
              label: 'Maximum life',
              enabled: true,
              weight: 1,
              min: null,
              max: null,
            },
          ]
        : [],
  }));

const selectedSlotIds = (slots: BuildSearchSlotState[]) =>
  slots.filter((slot) => slot.selected).map((slot) => slot.slotId);
