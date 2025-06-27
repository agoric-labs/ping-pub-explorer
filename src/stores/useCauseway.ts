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

type Loadable<T> = {
  data: T;
  status: LoadingStatus;
};

type State = {
  context: Loadable<{
    interactions: Awaited<ReturnType<typeof getInteractions>>;
    interactionsCount: Awaited<
      ReturnType<typeof getInteractionsCount>
    >['interactionsCount'];
    runIds: Awaited<ReturnType<typeof getRunIds>>;
    vats: Awaited<ReturnType<typeof getVats>>;
  }>;
  vats: Loadable<Awaited<ReturnType<typeof getVats>>>;
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

const getInteractions = async (filters: Filters) =>
  get<Array<Interaction>>(
    `${API_BASE}/interactions?${convertFiltersToQueryParameters(filters)}`
  );
const getInteractionsCount = async (filters: Filters) =>
  get<{ interactionsCount: number }>(
    `${API_BASE}/interactions/count?${convertFiltersToQueryParameters(filters)}`
  );
const getRunIds = async (filters: Filters) =>
  get<Array<string>>(
    `${API_BASE}/run-ids?${convertFiltersToQueryParameters(filters)}`
  );
const getVats = async (filters: Filters) =>
  get<Array<Vat>>(
    `${API_BASE}/vats?${convertFiltersToQueryParameters(filters)}`
  );

export const useCauseway = defineStore('causeway', {
  actions: {
    async loadContextData({
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
      if (this.$state.context.status === LoadingStatus.Loading)
        return console.error(
          `[FATAL]: Attempted network call when a previous call is already in progress`
        );

      this.$state.context.status = LoadingStatus.Loading;

      const [interactions, { interactionsCount }, runIds, vats] =
        await Promise.all([
          getInteractions(filters),
          loadCount
            ? getInteractionsCount(filters)
            : Promise.resolve({
                interactionsCount: this.$state.context.data.interactionsCount,
              }),
          loadRunIds
            ? getRunIds(filters)
            : Promise.resolve(this.$state.context.data.runIds),
          loadVats
            ? getVats(filters)
            : Promise.resolve(this.$state.context.data.vats),
        ]);

      this.$state.context = {
        data: {
          interactions,
          interactionsCount,
          runIds,
          vats: vats.sort(
            ({ vatID: firstVatID }, { vatID: secondVatID }) =>
              Number(EXTRACT_VAT_ID_REGEX.exec(firstVatID)![1]) -
              Number(EXTRACT_VAT_ID_REGEX.exec(secondVatID)![1])
          ),
        },
        status: LoadingStatus.Loaded,
      };
    },
    async loadVats(filters: Filters) {
      this.$state.vats.status = LoadingStatus.Loading;
      const vats = await getVats(filters);
      this.$state.vats.status = LoadingStatus.Loaded;
      this.$state.vats.data = vats;
    },
  },
  state: (): State => ({
    context: {
      data: {
        interactions: [],
        interactionsCount: 0,
        runIds: [],
        vats: [],
      },
      status: LoadingStatus.Empty,
    },
    vats: {
      data: [],
      status: LoadingStatus.Empty,
    },
  }),
});
