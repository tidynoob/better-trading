// Vendor
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

// Types
import BuildSearchesQueryGenerator from 'better-trading/services/build-searches/query-generator';
import {BuildSearchSlotState} from 'better-trading/types/build-searches';

// Constants
const TYPE_FILTERS_KEY = 'type_filters';

describe('Unit | Services | Build Searches | Query Generator', () => {
  setupTest();

  let service: BuildSearchesQueryGenerator;
  let statMappingMock: sinon.SinonMock;

  beforeEach(function () {
    service = this.owner.lookup('service:build-searches/query-generator');
    statMappingMock = sinon.mock(service.statMapping);
  });

  afterEach(() => {
    statMappingMock.verify();
  });

  it('generates a count-of-modifiers PoE2 trade query by default', async () => {
    statMappingMock
      .expects('fetchValidTradeStatIds')
      .once()
      .returns(Promise.resolve(['pseudo.pseudo_total_life']));
    statMappingMock.expects('getMapping').once().withArgs('maximumLife').returns({
      key: 'maximumLife',
      label: 'Maximum life',
      tradeStatId: 'pseudo.pseudo_total_life',
      defaultWeight: 1,
    });

    const [previewSlot] = await service.generatePreview([slotWithPriorities()]);

    expect(previewSlot.errors).to.deep.equal([]);
    expect(previewSlot.groupType).to.equal('count');
    expect(previewSlot.countMin).to.equal(1);
    expect(previewSlot.query).to.deep.equal({
      query: {
        status: {
          option: 'online',
        },
        type: 'Expert Greaves',
        stats: [
          {
            type: 'count',
            value: {
              min: 1,
            },
            filters: [
              {
                id: 'pseudo.pseudo_total_life',
                value: {
                  min: 50,
                },
              },
            ],
          },
        ],
        filters: {
          [TYPE_FILTERS_KEY]: {
            filters: {
              category: {
                option: 'armour.boots',
              },
              rarity: {
                option: 'rare',
              },
            },
          },
        },
      },
      sort: {
        price: 'asc',
      },
    });
  });

  it('clamps an explicit modifier count to the mapped stat count', async () => {
    statMappingMock
      .expects('fetchValidTradeStatIds')
      .once()
      .returns(Promise.resolve(['pseudo.pseudo_total_life']));
    statMappingMock.expects('getMapping').once().withArgs('maximumLife').returns({
      key: 'maximumLife',
      label: 'Maximum life',
      tradeStatId: 'pseudo.pseudo_total_life',
      defaultWeight: 1,
    });

    const [previewSlot] = await service.generatePreview([slotWithPriorities({countMin: 5})]);

    expect(previewSlot.countMin).to.equal(1);
  });

  it('generates a weighted sum v2 PoE2 trade query for mapped stats', async () => {
    statMappingMock
      .expects('fetchValidTradeStatIds')
      .once()
      .returns(Promise.resolve(['pseudo.pseudo_total_life']));
    statMappingMock.expects('getMapping').once().withArgs('maximumLife').returns({
      key: 'maximumLife',
      label: 'Maximum life',
      tradeStatId: 'pseudo.pseudo_total_life',
      defaultWeight: 1,
    });

    const [previewSlot] = await service.generatePreview([slotWithPriorities({groupType: 'weight2'})]);

    expect(previewSlot.errors).to.deep.equal([]);
    expect(previewSlot.groupType).to.equal('weight2');
    expect(previewSlot.query).to.deep.equal({
      query: {
        status: {
          option: 'online',
        },
        type: 'Expert Greaves',
        stats: [
          {
            type: 'weight2',
            value: {
              min: 80,
            },
            filters: [
              {
                id: 'pseudo.pseudo_total_life',
                value: {
                  min: 50,
                  weight: 1,
                },
              },
            ],
          },
        ],
        filters: {
          [TYPE_FILTERS_KEY]: {
            filters: {
              category: {
                option: 'armour.boots',
              },
              rarity: {
                option: 'rare',
              },
            },
          },
        },
      },
      sort: {
        'statgroup.0': 'desc',
      },
    });
  });

  it('blocks a slot when none of its priorities map to valid trade stats', async () => {
    statMappingMock
      .expects('fetchValidTradeStatIds')
      .once()
      .returns(Promise.resolve(['pseudo.pseudo_total_life']));
    statMappingMock.expects('getMapping').once().withArgs('maximumLife').returns(null);

    const [previewSlot] = await service.generatePreview([slotWithPriorities()]);

    expect(previewSlot.query).to.be.null;
    expect(previewSlot.unmappedStats.length).to.equal(1);
    expect(previewSlot.errors).to.deep.equal(['At least one mapped stat is required.']);
  });

  it('keeps imported slots eligible when at least one imported stat is mapped', async () => {
    statMappingMock
      .expects('fetchValidTradeStatIds')
      .once()
      .returns(Promise.resolve(['pseudo.pseudo_total_life']));
    statMappingMock.expects('getMapping').once().withArgs('maximumLife').returns({
      key: 'maximumLife',
      label: 'Maximum life',
      tradeStatId: 'pseudo.pseudo_total_life',
      defaultWeight: 1,
    });
    statMappingMock.expects('getMapping').once().withArgs('imported-unmapped:level-of-all-melee-skills:1').returns(null);

    const [previewSlot] = await service.generatePreview([
      slotWithPriorities({
        priorities: [
          {
            statKey: 'maximumLife',
            label: 'Maximum life',
            enabled: true,
            weight: 1,
            min: 50,
            max: null,
          },
          {
            statKey: 'imported-unmapped:level-of-all-melee-skills:1',
            label: 'Level of all melee skills',
            enabled: true,
            weight: 0,
            min: null,
            max: null,
          },
        ],
      }),
    ]);

    expect(previewSlot.query).not.to.be.null;
    expect(previewSlot.mappedStats.map(({statKey}) => statKey)).to.deep.equal(['maximumLife']);
    expect(previewSlot.unmappedStats.map(({label}) => label)).to.deep.equal(['Level of all melee skills']);
    expect(previewSlot.warnings).to.deep.equal(['Unmapped stats will be skipped.']);
  });
});

const slotWithPriorities = (overrides?: Partial<BuildSearchSlotState>): BuildSearchSlotState => {
  return {
    selected: true,
    slotId: 'boots',
    label: 'Boots',
    category: 'armour.boots',
    base: 'Expert Greaves',
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
  };
};
