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
import { useI18n } from 'vue-i18n';
import VueSelect from 'vue-multiselect';
import { type LocationQuery, useRoute, useRouter } from 'vue-router';

import CrossIcon from '@/icons/cross.svg';
import FullscreenIcon from '@/icons/fullscreen.svg';
import LoadingIcon from '@/icons/loading.svg';
import WarningIcon from '@/icons/warning.svg?raw';
import {
  generateMermaidSequenceDiagram,
  getSanitizedPageSize,
  renderDiagram,
  sanitizeVatName,
} from '@/libs/mermaid';
import { useCauseway } from '@/stores/useCauseway';
import type { Vat } from '@/stores/useCauseway';
import { LoadingStatus } from '@/stores/useDashboard';

const { t } = useI18n();
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
const showFullScreen = ref(false);
const startTime = ref(
  isNaN(getTimestampFromDate(String(route.query.startTime || '')))
    ? ''
    : String(route.query.startTime)
);
const { context, vats } = storeToRefs(causeway);

const extractAllValuesFromQueryForKey = (key: string, query: LocationQuery) =>
  (!query[key]
    ? []
    : !Array.isArray(query[key])
      ? [query[key]]
      : query[key]) as Array<string>;

const extractRunIdsFromQuery = (query: LocationQuery) => {
  const runIdsInQuery = extractAllValuesFromQueryForKey('runId', query);
  if (!(context.value.status === LoadingStatus.Loaded && runIdsInQuery.length))
    return [];
  const runIdsSet = new Set(runIdsInQuery);

  return context.value.data.runIds.filter((runId) => runIdsSet.has(runId));
};

const extractVatsFromQuery = (query: LocationQuery) => {
  const vatsInQuery = extractAllValuesFromQueryForKey('vat', query);
  if (!(context.value.status === LoadingStatus.Loaded && vatsInQuery.length))
    return [];
  const vatsSet = new Set(vatsInQuery);

  return context.value.data.vats.filter(({ vatID }) => vatsSet.has(vatID));
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
  Math.ceil(context.value.data.interactionsCount / routerPageSize.value)
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

  causeway.loadContextData({
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

const renderNoResultMessage = () => {
  if (!mermaidRef.value)
    return console.error('[FATAL]: Container reference is undefined');

  const ref = mermaidRef.value;

  ref.innerHTML = `
    <div class="dark:text-gray-400 flex flex-col gap-y-4 h-full items-center justify-center text-gray-500 w-full">
      ${WarningIcon}
      <h4>${t(`${LOCALE_PREFIX}.no-data-found-message`)}</h4>
    </div>
  `;
  ref.querySelector('svg')?.classList.add('h-16', 'w-16');
};

onMounted(() => {
  {
    if (
      blockHeight.value ||
      endTime.value ||
      extractAllValuesFromQueryForKey('runId', route.query).length ||
      startTime.value ||
      extractAllValuesFromQueryForKey('vat', route.query).length
    )
      loadData({
        loadCount: true,
        loadRunIds: true,
        loadVats: true,
        query: route.query,
      });

    causeway.loadVats({});
  }
  containerHeight.value = mermaidRef.value?.getBoundingClientRect().height || 0;
});

watch(
  () => context.value.status,
  (newStatus) => {
    if (newStatus === LoadingStatus.Loading)
      document.body.classList.add('h-screen', 'overflow-hidden');
    else document.body.classList.remove('h-screen', 'overflow-hidden');

    if (newStatus !== LoadingStatus.Loaded) return;

    selectedRunIds.value = extractRunIdsFromQuery(route.query);
    selectedVats.value = extractVatsFromQuery(route.query);

    if (!context.value.data.interactions.length) renderNoResultMessage();
    else {
      const code = generateMermaidSequenceDiagram(
        context.value.data.interactions,
        context.value.data.vats
      );
      renderDiagram({
        code,
        containerHeight: containerHeight.value,
        interactions: context.value.data.interactions,
        mermaidRef,
        vats: context.value.data.vats,
      });
    }
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
      v-if="
        context.status === LoadingStatus.Loading ||
        vats.status === LoadingStatus.Loading
      "
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
            :disabled="
              !(vats.status === LoadingStatus.Loaded && !!vats.data.length)
            "
            :options="
              vats.data.map(({ name, vatID, ...rest }) => ({
                name: `${vatID}: ${sanitizeVatName(name)}`,
                vatID,
                ...rest,
              }))
            "
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
              !(
                context.status === LoadingStatus.Loaded &&
                !!context.data.runIds.length
              )
            "
            :options="context.data.runIds"
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
        :disabled="context.status === LoadingStatus.Loading"
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
      :class="`${
        context.status === LoadingStatus.Loading ||
        vats.status === LoadingStatus.Loading
          ? 'opacity-10'
          : 'opacity-100'
      } bg-gray-100 dark:bg-gray-dark-100 grow rounded-sm shrink ${showFullScreen ? 'absolute left-0 min-h-screen right-0 top-0 w-screen' : 'border border-base-100 border-solid dark:border-white max-w-full relative'}`"
      :style="`padding: ${MERMAID_CONTAINER_PADDING}px; z-index: 100`"
    >
      <button
        className="absolute no-outline p-4 right-0 top-0"
        @click="() => (showFullScreen = !showFullScreen)"
        :disabled="
          context.status === LoadingStatus.Loading ||
          vats.status === LoadingStatus.Loading
        "
      >
        <CrossIcon class="fill-primary h-4 w-4" v-if="showFullScreen" />
        <FullscreenIcon class="fill-primary h-4 w-4" v-else />
      </button>
      <div
        class="bg-transparent grow no-scrollbar overflow-scroll shrink"
        ref="mermaidRef"
      />
    </div>
  </div>
</template>
