import { defineStore } from 'pinia';
import { EXTRACT_VAT_ID_REGEX } from '@/constants';
import { get } from '@/libs/http';
import { LoadingStatus } from '@/stores/useDashboard';

export type Filters = Partial<{
  blockHeight: number;
  currentPage: number;
  endTime: string;
  limit: string;
  runIds: string;
  startTime: string;
  vats: string;
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

type State = {
  data: {
    interactions: Array<Interaction>;
    interactionsCount: number;
    runIds: Array<string>;
    vats: Array<Vat>;
  };
  status: LoadingStatus;
};

export type Vat = {
  vatID: string;
  name: string;
  time: number;
};

const API_BASE = '/rest/causeway';

const convertFiltersToQueryParameters = (filters: Filters) =>
  Object.entries(filters)
    .map(([key, value]) => value && `${key}=${value}`)
    .filter(Boolean)
    .join('&');

export const useCauseway = defineStore('causeway', {
  actions: {
    async loadData({
      filters,
      loadCount,
      loadRunIds,
      loadVats,
    }: {
      filters: Filters;
      loadCount: boolean;
      loadRunIds: boolean;
      loadVats: boolean;
    }) {
      if (this.$state.status === LoadingStatus.Loading)
        return console.error(
          `[FATAL]: Attempted network call when a previous call is already in progress`
        );

      this.$state.status = LoadingStatus.Loading;

      const [interactions, { interactionsCount }, runIds, vats] =
        await Promise.all([
          this.loadInteractions(filters),
          loadCount
            ? this.loadInteractionsCount(filters)
            : Promise.resolve({
                interactionsCount: this.$state.data.interactionsCount,
              }),
          loadRunIds
            ? this.loadRunIds(filters)
            : Promise.resolve(this.$state.data.runIds),
          loadVats
            ? this.loadVats(filters)
            : Promise.resolve(this.$state.data.vats),
        ]);

      this.$state.data = {
        interactions,
        interactionsCount,
        runIds,
        vats: vats.sort(
          ({ vatID: firstVatID }, { vatID: secondVatID }) =>
            Number(EXTRACT_VAT_ID_REGEX.exec(firstVatID)![1]) -
            Number(EXTRACT_VAT_ID_REGEX.exec(secondVatID)![1])
        ),
      };
      this.$state.status = LoadingStatus.Loaded;
    },
    loadInteractions: async (filters: Filters) =>
      get<State['data']['interactions']>(
        `${API_BASE}/interactions?${convertFiltersToQueryParameters(filters)}`
      ),
    loadInteractionsCount: async (filters: Filters) =>
      get<{ interactionsCount: State['data']['interactionsCount'] }>(
        `${API_BASE}/interactions/count?${convertFiltersToQueryParameters(filters)}`
      ),
    loadRunIds: async (filters: Filters) =>
      get<State['data']['runIds']>(
        `${API_BASE}/run-ids?${convertFiltersToQueryParameters(filters)}`
      ),
    loadVats: async (filters: Filters) =>
      get<State['data']['vats']>(
        `${API_BASE}/vats?${convertFiltersToQueryParameters(filters)}`
      ),
  },
  state: (): State => ({
    data: { interactions: [], interactionsCount: 0, runIds: [], vats: [] },
    status: LoadingStatus.Empty,
  }),
});
