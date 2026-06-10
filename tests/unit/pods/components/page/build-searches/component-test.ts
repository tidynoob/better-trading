// Vendor
import {settled} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

// Types
import PageBuildSearches from 'better-trading/pods/components/page/build-searches/component';
import {BuildSearchPreviewSlot, BuildSearchSlotState} from 'better-trading/types/build-searches';
import {Task} from 'better-trading/types/ember-concurrency';

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

  it('seeds default gear slots when importing a .build before templates have loaded', function () {
    component.gearSlotTemplates = this.owner.lookup('service:build-searches/templates');
    component.slotStates = [];
    component.importJson = JSON.stringify({
      name: 'Imported Titan',
      ascendancy: 'Warrior1',
      // eslint-disable-next-line camelcase
      inventory_slots: [{inventory_id: 'Boots1', additional_text: 'Stat Priority'}],
    });

    component.importPastedBuild();

    expect(component.slotStates).to.have.length(11);
    expect(component.slotStates.find(({slotId}) => slotId === 'boots')?.selected).to.be.true;
    expect(component.importWarnings).to.deep.equal([]);
    expect(component.importError).to.equal('');
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

  describe('preview row adjustments', () => {
    let generatePreviewStub: sinon.SinonStub;
    let regeneratedPreview: BuildSearchPreviewSlot[];

    beforeEach(function () {
      component.queryGenerator = this.owner.lookup('service:build-searches/query-generator');
      regeneratedPreview = [previewSlot({countMin: 2})];
      generatePreviewStub = sinon.stub(component.queryGenerator, 'generatePreview').resolves(regeneratedPreview);
    });

    it('updates the modifier count and regenerates the preview without clearing it', async () => {
      component.slotStates = [slotState('boots', 'Boots', true)];
      const initialPreview = [previewSlot()];
      component.previewSlots = initialPreview;
      component.saveResult = {
        folderId: 'folder-1',
        saved: [],
        failed: [],
      };

      component.updatePreviewSlotNumber('boots', 'countMin', {target: {value: '2'}} as any);

      expect(component.previewSlots).to.equal(initialPreview);
      await settled();

      expect(component.slotStates[0].countMin).to.equal(2);
      expect(generatePreviewStub).to.have.been.calledOnceWith(component.selectedSlots);
      expect(component.previewSlots).to.equal(regeneratedPreview);
      expect(component.saveResult).to.be.null;
    });

    it('clamps the preview modifier count to at least 1 and treats a blank value as all modifiers', async () => {
      component.slotStates = [slotState('boots', 'Boots', true)];
      component.previewSlots = [previewSlot()];

      component.updatePreviewSlotNumber('boots', 'countMin', {target: {value: '0'}} as any);
      await settled();

      expect(component.slotStates[0].countMin).to.equal(1);

      component.updatePreviewSlotNumber('boots', 'countMin', {target: {value: ''}} as any);
      await settled();

      expect(component.slotStates[0].countMin).to.be.null;
    });

    it('updates a stat weight and regenerates the preview without clearing it', async () => {
      component.slotStates = [slotState('boots', 'Boots', true, {groupType: 'weight2'})];
      const initialPreview = [previewSlot({groupType: 'weight2'})];
      component.previewSlots = initialPreview;

      component.updatePreviewPriorityWeight('boots', 'maximumLife', {target: {value: '0.5'}} as any);

      expect(component.previewSlots).to.equal(initialPreview);
      await settled();

      expect(component.slotStates[0].priorities[0].weight).to.equal(0.5);
      expect(generatePreviewStub).to.have.been.calledOnceWith(component.selectedSlots);
      expect(component.previewSlots).to.equal(regeneratedPreview);
    });

    it('falls back to a zero weight when the preview weight input is not numeric', async () => {
      component.slotStates = [slotState('boots', 'Boots', true, {groupType: 'weight2'})];
      component.previewSlots = [previewSlot({groupType: 'weight2'})];

      component.updatePreviewPriorityWeight('boots', 'maximumLife', {target: {value: 'abc'}} as any);
      await settled();

      expect(component.slotStates[0].priorities[0].weight).to.equal(0);
    });

    it('updates the weighted score range from the preview row', async () => {
      component.slotStates = [slotState('boots', 'Boots', true, {groupType: 'weight2'})];
      component.previewSlots = [previewSlot({groupType: 'weight2'})];

      component.updatePreviewSlotNumber('boots', 'groupMin', {target: {value: '90'}} as any);
      await settled();
      component.updatePreviewSlotNumber('boots', 'groupMax', {target: {value: '120'}} as any);
      await settled();

      expect(component.slotStates[0].groupMin).to.equal(90);
      expect(component.slotStates[0].groupMax).to.equal(120);
      expect(generatePreviewStub).to.have.been.calledTwice;
      expect(component.previewSlots).to.equal(regeneratedPreview);
    });

    it('keeps the preview unsaveable while it is regenerating', async () => {
      component.slotStates = [slotState('boots', 'Boots', true)];
      component.previewSlots = [previewSlot()];
      let resolvePreview: (slots: BuildSearchPreviewSlot[]) => void = () => undefined;
      generatePreviewStub.callsFake(
        async () =>
          new Promise<BuildSearchPreviewSlot[]>((resolve) => {
            resolvePreview = resolve;
          })
      );

      component.updatePreviewSlotNumber('boots', 'countMin', {target: {value: '2'}} as any);

      expect(component.previewCanBeSaved).to.be.false;

      resolvePreview(regeneratedPreview);
      await settled();

      expect(component.previewCanBeSaved).to.be.true;
      expect(component.previewSlots).to.equal(regeneratedPreview);
    });

    it('saves the regenerated preview after an inline adjustment', async function () {
      component.buildSearches = this.owner.lookup('service:build-searches');
      component.flashMessages = this.owner.lookup('service:flash-messages');
      component.intl = this.owner.lookup('service:intl');
      const savePreviewStub = sinon.stub(component.buildSearches, 'savePreview').resolves({
        folderId: 'folder-1',
        saved: [{slotId: 'boots', title: 'Boots search', slug: 'abc123'}],
        failed: [],
      });
      sinon.stub(component.flashMessages, 'success');
      sinon.stub(component.intl, 't').returns('');

      component.slotStates = [slotState('boots', 'Boots', true)];
      component.previewSlots = [previewSlot()];

      component.updatePreviewSlotNumber('boots', 'countMin', {target: {value: '2'}} as any);
      await settled();

      await (component.savePreviewTask as Task).perform();

      expect(savePreviewStub).to.have.been.calledOnceWith({
        folderTitle: component.folderTitle,
        league: component.league,
        previewSlots: regeneratedPreview,
      });
    });
  });
});

const slotState = (
  slotId: string,
  label: string,
  selected: boolean,
  overrides: Partial<BuildSearchSlotState> = {}
): BuildSearchSlotState => ({
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
  ...overrides,
});

const previewSlot = (overrides: Partial<BuildSearchPreviewSlot> = {}): BuildSearchPreviewSlot => ({
  slotId: 'boots',
  title: 'Boots search',
  category: 'armour.boots',
  base: 'Expert Greaves',
  groupType: 'count',
  countMin: 1,
  groupMin: 80,
  groupMax: null,
  mappedStats: [
    {
      statKey: 'maximumLife',
      label: 'Maximum life',
      tradeStatId: 'pseudo.pseudo_total_life',
      weight: 1,
      min: 50,
      max: null,
    },
  ],
  unmappedStats: [],
  errors: [],
  warnings: [],
  query: {
    query: {},
    sort: {price: 'asc'},
  },
  ...overrides,
});
