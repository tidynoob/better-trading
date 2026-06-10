// Vendor
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

// Fixtures
import fakeBookmarkFolder from 'better-trading/tests/fixtures/bookmark-folder';
import fakeBookmarkTrade from 'better-trading/tests/fixtures/bookmark-trade';

// Types
import BookmarksFolder from 'better-trading/pods/components/page/bookmarks/folder/component';
import {BookmarksFolderStruct, BookmarksTradeStruct} from 'better-trading/types/bookmarks';

declare const require: (moduleName: string) => any;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {ARGS_SET} = require('@glimmer/component/-private/component');

const FOLDER_ID = 'fake-folder-id';

const componentArgs = (folder: Required<BookmarksFolderStruct>, expandedFolderIds: string[]) => {
  const args = {
    folder,
    dragHandle: null,
    expandedFolderIds,
    onEdit: () => undefined,
    onDelete: () => undefined,
    onExpansionToggle: () => undefined,
    onArchiveToggle: () => undefined,
  };

  ARGS_SET.set(args, true);

  return args;
};

const checkboxEvent = (checked: boolean) => ({target: {checked}} as any);

describe('Unit | Component | Page | Bookmarks | Folder', () => {
  setupTest();

  let component: BookmarksFolder;
  let folder: Required<BookmarksFolderStruct>;
  let searchTrade: BookmarksTradeStruct;
  let exchangeTrade: BookmarksTradeStruct;
  let otherSearchTrade: BookmarksTradeStruct;

  beforeEach(function () {
    folder = fakeBookmarkFolder({id: FOLDER_ID}) as Required<BookmarksFolderStruct>;

    searchTrade = fakeBookmarkTrade({
      title: 'Search trade',
      location: {version: '1', type: 'search', slug: 'search-slug'},
    });
    exchangeTrade = fakeBookmarkTrade({
      title: 'Exchange trade',
      location: {version: '1', type: 'exchange', slug: 'exchange-slug'},
    });
    otherSearchTrade = fakeBookmarkTrade({
      title: 'Other search trade',
      location: {version: '2', type: 'search', slug: 'other-search-slug'},
    });

    component = new BookmarksFolder(this.owner, componentArgs(folder, [FOLDER_ID]));
    component.trades = [searchTrade, exchangeTrade, otherSearchTrade];
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('snipeableTrades', () => {
    it('only includes search-type trades', () => {
      expect(component.snipeableTrades).to.deep.equal([searchTrade, otherSearchTrade]);
    });

    it('is empty while trades have not been loaded yet', () => {
      component.trades = null;

      expect(component.snipeableTrades).to.deep.equal([]);
    });
  });

  describe('canStartSnipe', () => {
    it('is true when the expanded folder has search-type trades', () => {
      expect(component.canStartSnipe).to.be.true;
    });

    it('is false while already sniping', () => {
      component.startSnipe();

      expect(component.canStartSnipe).to.be.false;
    });

    it('is false without any search-type trades', () => {
      component.trades = [exchangeTrade];

      expect(component.canStartSnipe).to.be.false;
    });

    it('is false when the folder is collapsed', function () {
      const collapsedComponent = new BookmarksFolder(this.owner, componentArgs(folder, []));
      collapsedComponent.trades = [searchTrade];

      expect(collapsedComponent.canStartSnipe).to.be.false;
    });
  });

  describe('startSnipe', () => {
    it('builds an entry for each search-type trade, all selected', () => {
      component.startSnipe();

      expect(component.isSniping).to.be.true;
      expect(component.snipeEntries).to.have.length(2);
      expect(component.snipeEntries.map(({trade}) => trade)).to.deep.equal([searchTrade, otherSearchTrade]);
      expect(component.snipeEntries.every(({selected}) => selected)).to.be.true;
    });

    it('does nothing while trades are being reordered', () => {
      component.isReorderingTrades = true;

      component.startSnipe();

      expect(component.isSniping).to.be.false;
      expect(component.snipeEntries).to.deep.equal([]);
    });

    it('does nothing without any search-type trades', () => {
      component.trades = [exchangeTrade];

      component.startSnipe();

      expect(component.isSniping).to.be.false;
      expect(component.snipeEntries).to.deep.equal([]);
    });
  });

  describe('toggleSnipeTrade', () => {
    it('flips only the toggled entry and replaces the tracked entries array', () => {
      component.startSnipe();
      const initialEntries = component.snipeEntries;

      component.toggleSnipeTrade(initialEntries[0], checkboxEvent(false));

      expect(component.snipeEntries).to.not.equal(initialEntries);
      expect(component.snipeEntries[0].trade).to.equal(searchTrade);
      expect(component.snipeEntries[0].selected).to.be.false;
      expect(component.snipeEntries[1].selected).to.be.true;
    });

    it('can re-select a deselected entry', () => {
      component.startSnipe();

      component.toggleSnipeTrade(component.snipeEntries[0], checkboxEvent(false));
      component.toggleSnipeTrade(component.snipeEntries[0], checkboxEvent(true));

      expect(component.snipeEntries[0].selected).to.be.true;
      expect(component.snipeEntries[1].selected).to.be.true;
    });
  });

  describe('selectedSnipeCount', () => {
    it('counts only the selected entries', () => {
      component.startSnipe();
      expect(component.selectedSnipeCount).to.equal(2);

      component.toggleSnipeTrade(component.snipeEntries[0], checkboxEvent(false));
      expect(component.selectedSnipeCount).to.equal(1);

      component.toggleSnipeTrade(component.snipeEntries[1], checkboxEvent(false));
      expect(component.selectedSnipeCount).to.equal(0);
    });
  });

  describe('openSnipeTrades', () => {
    let openTabsStub: sinon.SinonStub;
    let getTradeUrlStub: sinon.SinonStub;

    beforeEach(() => {
      component.currentLeague = 'Standard';

      openTabsStub = sinon.stub(component.extensionBackground, 'openTabs');
      getTradeUrlStub = sinon
        .stub(component.tradeLocation, 'getTradeUrl')
        .callsFake((version, type, slug, league) => `https://fake-trade.test/${version}/${type}/${league}/${slug}`);
    });

    it('opens a live search URL for each selected entry and resets the snipe state', () => {
      component.startSnipe();

      component.openSnipeTrades();

      expect(getTradeUrlStub).to.have.been.calledTwice;
      expect(getTradeUrlStub.firstCall).to.have.been.calledWithExactly('1', 'search', 'search-slug', 'Standard');
      expect(getTradeUrlStub.secondCall).to.have.been.calledWithExactly('2', 'search', 'other-search-slug', 'Standard');
      expect(openTabsStub).to.have.been.calledOnceWithExactly([
        'https://fake-trade.test/1/search/Standard/search-slug/live',
        'https://fake-trade.test/2/search/Standard/other-search-slug/live',
      ]);
      expect(component.isSniping).to.be.false;
      expect(component.snipeEntries).to.deep.equal([]);
    });

    it('skips deselected entries', () => {
      component.startSnipe();
      component.toggleSnipeTrade(component.snipeEntries[0], checkboxEvent(false));

      component.openSnipeTrades();

      expect(openTabsStub).to.have.been.calledOnceWithExactly([
        'https://fake-trade.test/2/search/Standard/other-search-slug/live',
      ]);
    });

    it('does nothing without a current league', () => {
      component.currentLeague = null;
      component.startSnipe();

      component.openSnipeTrades();

      expect(openTabsStub).to.not.have.been.called;
      expect(component.isSniping).to.be.true;
    });

    it('does nothing when every entry is deselected', () => {
      component.startSnipe();
      component.toggleSnipeTrade(component.snipeEntries[0], checkboxEvent(false));
      component.toggleSnipeTrade(component.snipeEntries[1], checkboxEvent(false));

      component.openSnipeTrades();

      expect(openTabsStub).to.not.have.been.called;
      expect(component.isSniping).to.be.true;
    });
  });

  describe('cancelSnipe', () => {
    it('resets the snipe state', () => {
      component.startSnipe();

      component.cancelSnipe();

      expect(component.isSniping).to.be.false;
      expect(component.snipeEntries).to.deep.equal([]);
    });
  });
});
