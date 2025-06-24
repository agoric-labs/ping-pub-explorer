import { defineStore } from 'pinia';
import { LoadingStatus } from '@/stores/useDashboard';
import { get } from '@/libs/http';

export type Filters = Partial<{
  blockHeight: number;
  currentPage: number;
  endTime: string;
  limit: number;
  runId: string;
  startTime: string;
}>;

export type Interaction = {
  argSize: number;
  blockHeight: number;
  crankNum: number;
  elapsed: number;
  method: string;
  promiseId: string;
  runId: string;
  sourceVat: string;
  targetVat: string;
  targetId: string;
  time: number;
  type: string;
};

export type Vat = {
  vatID: string;
  name: string;
  time: number;
};

type ChunkFilters = { offset: number; limit: number };

const API_BASE = '/rest/causeway';

export const useCauseway = defineStore('causeway', {
  actions: {
    async loadData(filters: Filters, loadCount: boolean) {
      if (this.$state.status === LoadingStatus.Loading)
        return console.error(
          `[FATAL]: Attempted network call when a previous call is already in progress`
        );

      this.$state.status = LoadingStatus.Loading;

      const [interactions, vats, { interactionsCount }] = await Promise.all([
        this.loadInteractions(filters),
        this.loadVats(filters),
        loadCount
          ? this.loadInteractionsCount(filters)
          : Promise.resolve({
              interactionsCount: this.$state.data.interactionsCount,
            }),
      ]);

      this.$state.data = { interactions, interactionsCount, vats };
      this.$state.status = LoadingStatus.Loaded;
    },
    loadInteractions: async (filters: Filters) => {
      let route = `${API_BASE}/interactions?`;
      route += Object.entries(filters)
        .map(([key, value]) => value && `${key}=${value}`)
        .filter(Boolean)
        .join('&');

      return get<Array<Interaction>>(route);
    },
    loadInteractionsCount: async (filters: Filters) => {
      let route = `${API_BASE}/interactions/count?`;
      route += Object.entries(filters)
        .map(([key, value]) => value && `${key}=${value}`)
        .filter(Boolean)
        .join('&');

      return get<{ interactionsCount: number }>(route);
    },
    loadVats: async (filters: Filters) => {
      let route = `${API_BASE}/vats?`;
      route += Object.entries(filters)
        .map(([key, value]) => value && `${key}=${value}`)
        .filter(Boolean)
        .join('&');

      return get<Array<Vat>>(route);
    },
  },
  state: (): {
    data: {
      interactions: Array<Interaction>;
      interactionsCount: number;
      vats: Array<Vat>;
    };
    status: LoadingStatus;
  } => ({
    data: { interactions: [], interactionsCount: 0, vats: [] },
    status: LoadingStatus.Empty,
  }),
});
