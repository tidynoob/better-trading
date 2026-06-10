// Vendor
import Service, {inject as service} from '@ember/service';

// Services
import Bookmarks from 'better-trading/services/bookmarks';
import BuildSearchesTradeApi from 'better-trading/services/build-searches/trade-api';

// Types
import {
  BuildSearchFailedSearch,
  BuildSearchPreviewSlot,
  BuildSearchSaveResult,
  BuildSearchTradeQuery,
} from 'better-trading/types/build-searches';
import {BookmarksFolderPoE2ItemIcon, BookmarksTradeStruct} from 'better-trading/types/bookmarks';

interface SavePreviewOptions {
  folderTitle: string;
  league: string;
  previewSlots: BuildSearchPreviewSlot[];
}

export default class BuildSearches extends Service {
  @service('bookmarks')
  bookmarks: Bookmarks;

  @service('build-searches/trade-api')
  tradeApi: BuildSearchesTradeApi;

  folderTitle(buildName: string) {
    return `Build: ${buildName.trim() || 'Unnamed build'}`;
  }

  async savePreview({folderTitle, league, previewSlots}: SavePreviewOptions): Promise<BuildSearchSaveResult> {
    const eligibleSlots = previewSlots.filter((previewSlot) => Boolean(previewSlot.query));
    const saved: Array<{slotId: string; title: string; slug: string}> = [];
    const failed: BuildSearchFailedSearch[] = [];

    for (const previewSlot of eligibleSlots) {
      try {
        const slug = await this.tradeApi.createSearch(league, previewSlot.query as BuildSearchTradeQuery);

        saved.push({
          slotId: previewSlot.slotId,
          title: previewSlot.title,
          slug,
        });
      } catch (error) {
        failed.push({
          slotId: previewSlot.slotId,
          title: previewSlot.title,
          message: error instanceof Error ? error.message : 'The trade search could not be created.',
        });
      }
    }

    if (saved.length === 0) {
      return {
        folderId: null,
        saved,
        failed,
      };
    }

    const folderId = await this.bookmarks.persistFolder({
      ...this.bookmarks.initializeFolderStruct('2'),
      title: folderTitle,
      icon: BookmarksFolderPoE2ItemIcon.WAYSTONE,
    });

    const trades: BookmarksTradeStruct[] = saved.map((savedSearch) => ({
      title: savedSearch.title,
      completedAt: null,
      location: {
        version: '2',
        type: 'search',
        slug: savedSearch.slug,
      },
    }));

    await this.bookmarks.persistTrades(trades, folderId);

    return {
      folderId,
      saved,
      failed,
    };
  }
}

declare module '@ember/service' {
  interface Registry {
    'build-searches': BuildSearches;
  }
}
