<route>{ meta: { i18n: 'causeway' } }</route>

<script lang="ts">
import mermaid from 'mermaid';
import { IS_NUMBER_REGEX, MERMAID_CONTAINER_PADDING } from '@/constants';

const LOCALE_PREFIX = 'causeway';

mermaid.initialize({
  flowchart: {
    curve: 'basis',
    diagramPadding: 8,
  },
  fontFamily: 'monospace',
  fontSize: 16,
  logLevel: 'error',
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  sequence: {
    arrowMarkerAbsolute: true,
    actorFontSize: 16,
    bottomMarginAdj: 0,
    boxMargin: 8,
    diagramMarginX: 8,
    diagramMarginY: 8,
    messageFontSize: 16,
    messageMargin: 60,
    mirrorActors: true,
    noteFontSize: 14,
    noteMargin: 8,
    rightAngles: false,
    showSequenceNumbers: false,
    useMaxWidth: true,
    width: 150,
    wrap: true,
  },
});

const getTimestampFromDate = (date: string) =>
  new Date(date.match(IS_NUMBER_REGEX) ? Number(date) : date).getTime();
</script>

<script lang="ts" setup>
import 'vue-multiselect/dist/vue-multiselect.min.css';

import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';
import VueSelect from 'vue-multiselect';
import { type LocationQuery, useRoute, useRouter } from 'vue-router';

import LoadingIcon from '@/icons/loading.svg';
import WarningIcon from '@/icons/warning.svg';
import {
  generateMermaidSequenceDiagram,
  getSanitizedPageSize,
  renderDiagram,
} from '@/libs/mermaid';
import { useCauseway } from '@/stores/useCauseway';
import type { Vat } from '@/stores/useCauseway';
import { LoadingStatus } from '@/stores/useDashboard';

const causeway = useCauseway();
const route = useRoute();
const router = useRouter();

const routerPageSize = computed(() =>
  getSanitizedPageSize(String(route.query.pageSize || ''))
);

const blockHeight = ref(
  String(route.query.blockHeight || '').match(IS_NUMBER_REGEX)
    ? String(route.query.blockHeight)
    : ''
);
const containerHeight = ref(0);
const endTime = ref(
  isNaN(getTimestampFromDate(String(route.query.endTime || '')))
    ? ''
    : String(route.query.endTime)
);
const mermaidRef = ref<HTMLDivElement | null>(null);
const pageSize = ref(String(routerPageSize.value));
const startTime = ref(
  isNaN(getTimestampFromDate(String(route.query.startTime || '')))
    ? ''
    : String(route.query.startTime)
);
const { status, data } = storeToRefs(causeway);

const extractAllValuesFromQueryForKey = (key: string, query: LocationQuery) =>
  (!query[key]
    ? []
    : !Array.isArray(query[key])
      ? [query[key]]
      : query[key]) as Array<string>;

const extractRunIdsFromQuery = (query: LocationQuery) => {
  const runIdsInQuery = extractAllValuesFromQueryForKey('runId', query);
  if (!(status.value === LoadingStatus.Loaded && runIdsInQuery.length))
    return [];
  const runIdsSet = new Set(runIdsInQuery);

  return data.value.runIds.filter((runId) => runIdsSet.has(runId));
};

const extractVatsFromQuery = (query: LocationQuery) => {
  const vatsInQuery = extractAllValuesFromQueryForKey('vat', query);
  if (!(status.value === LoadingStatus.Loaded && vatsInQuery.length)) return [];
  const vatsSet = new Set(vatsInQuery);

  return data.value.vats.filter(({ vatID }) => vatsSet.has(vatID));
};

const currentPage = computed(() =>
  Math.max((Number(route.query.currentPage || '') || 1) - 1, 0)
);
const inputsMeta = [
  {
    name: 'block-height-input-label',
    ref: blockHeight,
  },
  {
    name: 'start-time-input-label',
    ref: startTime,
  },
  {
    name: 'end-time-input-label',
    ref: endTime,
  },
  {
    name: 'page-size-input-label',
    ref: pageSize,
  },
];
const totalPages = computed(() =>
  Math.ceil(data.value.interactionsCount / routerPageSize.value)
);

const selectedRunIds = ref(extractRunIdsFromQuery(route.query));
const selectedVats = ref(extractVatsFromQuery(route.query));

const applyFilters = (currentPage = 0) =>
  router.push({
    path: route.path,
    query: {
      blockHeight: blockHeight.value,
      currentPage:
        Number(pageSize.value) !== routerPageSize.value ? 1 : currentPage + 1,
      endTime: endTime.value,
      pageSize: pageSize.value,
      runId: selectedRunIds.value,
      startTime: startTime.value,
      vat: selectedVats.value.map(({ vatID }) => vatID),
    },
  });

const loadData = ({
  loadCount,
  loadRunIds,
  loadVats,
  query,
}: {
  loadCount: boolean;
  loadRunIds: boolean;
  loadVats: boolean;
  query: LocationQuery;
}) => {
  const endTimestamp = getTimestampFromDate(String(query.endTime || ''));
  const startTimestamp = getTimestampFromDate(String(query.startTime || ''));
  const pageSize = getSanitizedPageSize(String(query.pageSize || ''));

  causeway.loadData({
    filters: {
      blockHeight: String(query.blockHeight || '').match(IS_NUMBER_REGEX)
        ? Number(blockHeight.value)
        : 0,
      currentPage: currentPage.value,
      endTime: isNaN(endTimestamp) ? '' : String(endTimestamp / 1000),
      limit: String(pageSize),
      runIds: extractAllValuesFromQueryForKey('runId', query).join(','),
      startTime: isNaN(startTimestamp) ? '' : String(startTimestamp / 1000),
      vats: extractAllValuesFromQueryForKey('vat', query).join(','),
    },
    loadCount,
    loadRunIds,
    loadVats,
  });
};

const onRunIdSelection = (value: Array<string>) =>
  (selectedRunIds.value = value);

const onVatSelection = (value: Array<Vat>) => (selectedVats.value = value);

onMounted(() => {
  (blockHeight.value ||
    endTime.value ||
    extractAllValuesFromQueryForKey('runId', route.query).length ||
    startTime.value ||
    extractAllValuesFromQueryForKey('vat', route.query).length) &&
    loadData({
      loadCount: true,
      loadRunIds: true,
      loadVats: true,
      query: route.query,
    });
  containerHeight.value = mermaidRef.value?.getBoundingClientRect().height || 0;
});

watch(
  status,
  (newStatus) => {
    if (newStatus === LoadingStatus.Loading)
      document.body.classList.add('h-screen', 'overflow-hidden');
    else document.body.classList.remove('h-screen', 'overflow-hidden');

    if (!(newStatus === LoadingStatus.Loaded && data.value.interactions.length))
      return;

    selectedRunIds.value = extractRunIdsFromQuery(route.query);
    selectedVats.value = extractVatsFromQuery(route.query);

    const code = generateMermaidSequenceDiagram(
      data.value.interactions,
      data.value.vats
    );
    renderDiagram({
      code,
      containerHeight: containerHeight.value,
      interactions: data.value.interactions,
      mermaidRef,
      vats: data.value.vats,
    });
  },
  { deep: true }
);

watch(
  () => route.query,
  (query, oldQuery) => {
    const blockHeightChanged = query.blockHeight !== oldQuery.blockHeight;
    const endTimeChanged = query.endTime !== oldQuery.endTime;
    const newRunIds = extractAllValuesFromQueryForKey('runId', query);
    const newVatIds = extractAllValuesFromQueryForKey('vat', query);
    const oldRunIds = extractAllValuesFromQueryForKey('runId', oldQuery);
    const oldVatIds = extractAllValuesFromQueryForKey('vat', oldQuery);
    const startTimeChanged = query.startTime !== oldQuery.startTime;

    const runIdChanged =
      oldRunIds.length !== newRunIds.length ||
      newRunIds.some((vatID) => !oldRunIds.includes(vatID));
    const vatIdsChanged =
      oldVatIds.length !== newVatIds.length ||
      newVatIds.some((vatID) => !oldVatIds.includes(vatID));

    return (
      (query.blockHeight ||
        query.currentPage ||
        query.endTime ||
        query.startTime ||
        !!newVatIds.length) &&
      loadData({
        loadCount:
          blockHeightChanged ||
          endTimeChanged ||
          runIdChanged ||
          startTimeChanged ||
          vatIdsChanged,
        loadRunIds:
          blockHeightChanged ||
          endTimeChanged ||
          runIdChanged ||
          startTimeChanged ||
          vatIdsChanged,
        loadVats:
          blockHeightChanged ||
          endTimeChanged ||
          runIdChanged ||
          startTimeChanged ||
          vatIdsChanged,
        query,
      })
    );
  },
  { deep: true }
);
</script>

<template>
  <div class="flex flex-col gap-y-4 h-full w-full">
    <div
      class="absolute bg-base-200 flex h-screen inset-0 items-center justify-center opacity-60 w-screen"
      style="z-index: 100"
      v-if="status === LoadingStatus.Loading"
    >
      <LoadingIcon class="animate-spin fill-primary h-8 w-8" />
    </div>

    <div class="flex flex-col gap-y-3 items-center w-full">
      <div class="flex flex-wrap gap-3 items-center xl:flex-nowrap w-full">
        <div
          class="basis-1/3 flex flex-col gap-2 grow"
          v-for="({ name }, index) in inputsMeta"
          :key="name"
        >
          <h4 class="font-semibold">{{ $t(`${LOCALE_PREFIX}.${name}`) }}</h4>
          <input
            class="flex-shrink-0 input w-full"
            :name="name"
            v-model="inputsMeta[index].ref.value"
          />
        </div>

        <div class="basis-1/3 flex flex-col gap-2 grow">
          <h4 class="font-semibold">
            {{ $t(`${LOCALE_PREFIX}.vat-filter-input-label`) }}
          </h4>
          <VueSelect
            class="dark:placeholder-gray-300 dark:text-gray-300 h-12 placeholder-gray-500 rounded-lg text-gray-500 w-full"
            label="name"
            multiple
            track-by="vatID"
            :close-on-select="false"
            :disabled="!(status === LoadingStatus.Loaded && !!data.vats.length)"
            :options="data.vats"
            :modelValue="selectedVats"
            @update:modelValue="onVatSelection"
          >
            <template #selection="{ values }">
              <span class="multiselect__placeholder" v-if="values.length">{{
                `${values.length} options selected`
              }}</span>
            </template>
          </VueSelect>
        </div>

        <div class="basis-1/3 flex flex-col gap-2 grow">
          <h4 class="font-semibold">
            {{ $t(`${LOCALE_PREFIX}.run-id-filter-input-label`) }}
          </h4>
          <VueSelect
            class="dark:placeholder-gray-300 dark:text-gray-300 h-12 placeholder-gray-500 rounded-lg text-gray-500 w-full"
            multiple
            :close-on-select="false"
            :disabled="
              !(status === LoadingStatus.Loaded && !!data.runIds.length)
            "
            :options="data.runIds"
            :modelValue="selectedRunIds"
            @update:modelValue="onRunIdSelection"
          >
            <template #selection="{ values }">
              <span class="multiselect__placeholder" v-if="values.length">{{
                `${values.length} options selected`
              }}</span>
            </template>
          </VueSelect>
        </div>
      </div>

      <button
        class="btn btn-primary max-w-32 w-full"
        @click="() => applyFilters()"
        :disabled="status === LoadingStatus.Loading"
      >
        {{ $t(`${LOCALE_PREFIX}.fetch-button-label`) }}
      </button>
    </div>

    <div
      className="flex items-center justify-between px-3 w-full"
      v-if="totalPages > 1"
    >
      <button
        className="btn btn-primary"
        @click="() => currentPage && applyFilters(currentPage - 1)"
        :disabled="!currentPage"
      >
        <span>{{ '←' }}</span>
        <span class="hidden lg:!inline">{{
          $t(`${LOCALE_PREFIX}.previous-page-button-label`)
        }}</span>
      </button>
      <span className="font-bold px-4">
        {{ `Page ${currentPage + 1} of ${totalPages}` }}
      </span>
      <button
        className="btn"
        @click="
          () => currentPage < totalPages - 1 && applyFilters(currentPage + 1)
        "
        :disabled="currentPage === totalPages - 1"
      >
        <span class="hidden lg:!inline">{{
          $t(`${LOCALE_PREFIX}.next-page-button-label`)
        }}</span>
        <span>{{ '→' }}</span>
      </button>
    </div>

    <div
      class="bg-transparent border border-gray-L300 border-solid grow max-w-full no-scrollbar overflow-scroll rounded-sm shrink"
      ref="mermaidRef"
      :style="`padding: ${MERMAID_CONTAINER_PADDING}px`"
    >
      <div
        class="dark:text-gray-400 flex flex-col gap-y-4 h-full items-center justify-center text-gray-500 w-full"
        v-if="status === LoadingStatus.Loaded && !data.interactions.length"
      >
        <WarningIcon class="h-16 w-16" />
        <h4>{{ $t(`${LOCALE_PREFIX}.no-data-found-message`) }}</h4>
      </div>
    </div>
  </div>
</template>
