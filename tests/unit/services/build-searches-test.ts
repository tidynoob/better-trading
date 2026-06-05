// Vendor
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

// Types
import BuildSearches from 'better-trading/services/build-searches';
import {BookmarksFolderPoE2ItemIcon} from 'better-trading/types/bookmarks';
import {BuildSearchPreviewSlot, BuildSearchTradeQuery} from 'better-trading/types/build-searches';

describe('Unit | Services | Build Searches', () => {
  setupTest();

  let service: BuildSearches;
  let bookmarksMock: sinon.SinonMock;
  let tradeApiMock: sinon.SinonMock;

  beforeEach(function () {
    service = this.owner.lookup('service:build-searches');
    bookmarksMock = sinon.mock(service.bookmarks);
    tradeApiMock = sinon.mock(service.tradeApi);
  });

  afterEach(() => {
    bookmarksMock.verify();
    tradeApiMock.verify();
  });

  it('saves successful imported preview rows as PoE2 bookmark trade locations', async () => {
    const bootsPreviewSlot = previewSlot('boots');
    const glovesPreviewSlot = previewSlot('gloves');

    tradeApiMock.expects('createSearch').once().withArgs('poe2/Standard', bootsPreviewSlot.query).returns('boots-slug');
    tradeApiMock
      .expects('createSearch')
      .once()
      .withArgs('poe2/Standard', glovesPreviewSlot.query)
      .returns('gloves-slug');
    bookmarksMock.expects('initializeFolderStruct').once().withArgs('2').returns({
      version: '2',
      title: '',
      icon: null,
      archivedAt: null,
    });
    const persistFolder = bookmarksMock.expects('persistFolder').once().returns(Promise.resolve('folder-1'));
    const persistTrades = bookmarksMock.expects('persistTrades').once().returns(Promise.resolve());

    const result = await service.savePreview({
      folderTitle: 'Build: Titan Warrior',
      league: 'poe2/Standard',
      previewSlots: [bootsPreviewSlot, glovesPreviewSlot],
    });

    const [[folder]] = persistFolder.args;
    const [[trades, folderId]] = persistTrades.args;
    expect(folder.title).to.equal('Build: Titan Warrior');
    expect(folder.icon).to.equal(BookmarksFolderPoE2ItemIcon.WAYSTONE);
    expect(folderId).to.equal('folder-1');
    expect(trades).to.deep.equal([
      {
        title: 'Boots search',
        completedAt: null,
        location: {
          version: '2',
          type: 'search',
          slug: 'boots-slug',
        },
      },
      {
        title: 'Gloves search',
        completedAt: null,
        location: {
          version: '2',
          type: 'search',
          slug: 'gloves-slug',
        },
      },
    ]);
    expect(result.folderId).to.equal('folder-1');
    expect(result.saved.map(({slotId}) => slotId)).to.deep.equal(['boots', 'gloves']);
    expect(result.failed).to.deep.equal([]);
  });

  it('saves successful slots and reports failed slots on partial failure', async () => {
    const bootsPreviewSlot = previewSlot('boots');
    const glovesPreviewSlot = previewSlot('gloves');

    tradeApiMock.expects('createSearch').once().withArgs('poe2/Standard', bootsPreviewSlot.query).returns('boots-slug');
    tradeApiMock
      .expects('createSearch')
      .once()
      .withArgs('poe2/Standard', glovesPreviewSlot.query)
      .throws(new Error('Trade API rejected the query.'));
    bookmarksMock.expects('initializeFolderStruct').once().returns({
      version: '2',
      title: '',
      icon: null,
      archivedAt: null,
    });
    bookmarksMock.expects('persistFolder').once().returns(Promise.resolve('folder-1'));
    bookmarksMock.expects('persistTrades').once().returns(Promise.resolve());

    const result = await service.savePreview({
      folderTitle: 'Build: Titan Warrior',
      league: 'poe2/Standard',
      previewSlots: [bootsPreviewSlot, glovesPreviewSlot],
    });

    expect(result.folderId).to.equal('folder-1');
    expect(result.saved.map(({slotId}) => slotId)).to.deep.equal(['boots']);
    expect(result.failed).to.deep.equal([
      {
        slotId: 'gloves',
        title: 'Gloves search',
        message: 'Trade API rejected the query.',
      },
    ]);
  });

  it('does not create a bookmark folder when every eligible slot fails', async () => {
    const bootsPreviewSlot = previewSlot('boots');

    tradeApiMock
      .expects('createSearch')
      .once()
      .withArgs('poe2/Standard', bootsPreviewSlot.query)
      .throws(new Error('Trade API rejected the query.'));
    bookmarksMock.expects('initializeFolderStruct').never();
    bookmarksMock.expects('persistFolder').never();
    bookmarksMock.expects('persistTrades').never();

    const result = await service.savePreview({
      folderTitle: 'Build: Titan Warrior',
      league: 'poe2/Standard',
      previewSlots: [bootsPreviewSlot],
    });

    expect(result.folderId).to.be.null;
    expect(result.saved).to.deep.equal([]);
    expect(result.failed[0].slotId).to.equal('boots');
  });

  it('uses a fallback generated folder title for blank build names', () => {
    expect(service.folderTitle('   ')).to.equal('Build: Unnamed build');
  });
});

const tradeQuery = (slotId: string): BuildSearchTradeQuery => ({
  query: {
    slotId,
  },
  sort: {
    price: 'asc',
  },
});

const previewSlot = (slotId: string): BuildSearchPreviewSlot => ({
  slotId,
  title: `${slotId[0].toUpperCase()}${slotId.slice(1)} search`,
  category: '',
  base: '',
  groupMin: null,
  groupMax: null,
  mappedStats: [],
  unmappedStats: [],
  errors: [],
  warnings: [],
  query: tradeQuery(slotId),
});
