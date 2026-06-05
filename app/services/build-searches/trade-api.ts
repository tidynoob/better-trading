// Vendor
import Service from '@ember/service';

// Types
import {BuildSearchTradeQuery} from 'better-trading/types/build-searches';

interface TradeSearchResponse {
  id?: string;
  error?: {
    message?: string;
  };
}

// Constants
const TRADE2_SEARCH_URL = 'https://www.pathofexile.com/api/trade2/search';

export default class BuildSearchesTradeApi extends Service {
  async createSearch(league: string, query: BuildSearchTradeQuery): Promise<string> {
    const response = await fetch(`${TRADE2_SEARCH_URL}/${this.formatLeaguePath(league)}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    let payload: TradeSearchResponse = {};

    try {
      payload = (await response.json()) as TradeSearchResponse;
    } catch (_error) {
      payload = {};
    }

    if (!response.ok || !payload.id) {
      throw new Error(payload.error?.message || 'The trade search could not be created.');
    }

    return payload.id;
  }

  private formatLeaguePath(league: string) {
    const leaguePath = league.includes('/') ? league : `poe2/${league}`;

    return leaguePath
      .split('/')
      .map((leaguePart) => encodeURIComponent(leaguePart))
      .join('/');
  }
}

declare module '@ember/service' {
  interface Registry {
    'build-searches/trade-api': BuildSearchesTradeApi;
  }
}
