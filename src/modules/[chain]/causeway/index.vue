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
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';
import { type LocationQuery, useRoute, useRouter } from 'vue-router';

import LoadingIcon from '@/icons/loading.svg';
import WarningIcon from '@/icons/warning.svg';
import {
  generateMermaidSequenceDiagram,
  getSanitizedPageSize,
  renderDiagram,
} from '@/libs/mermaid';
import { useCauseway } from '@/stores/useCauseway';
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

const applyFilters = (currentPage = 0) =>
  router.push({
    path: route.path,
    query: {
      blockHeight: blockHeight.value,
      currentPage:
        Number(pageSize.value) !== routerPageSize.value ? 1 : currentPage + 1,
      endTime: endTime.value,
      pageSize: pageSize.value,
      startTime: startTime.value,
    },
  });

const loadData = (loadCount: boolean, query: LocationQuery) => {
  const endTimestamp = getTimestampFromDate(String(query.endTime || ''));
  const startTimestamp = getTimestampFromDate(String(query.startTime || ''));
  const pageSize = getSanitizedPageSize(String(query.pageSize || ''));

  causeway.loadData(
    {
      blockHeight: String(query.blockHeight || '').match(IS_NUMBER_REGEX)
        ? Number(blockHeight.value)
        : 0,
      currentPage: currentPage.value,
      endTime: isNaN(endTimestamp) ? '' : String(endTimestamp / 1000),
      limit: String(pageSize),
      startTime: isNaN(startTimestamp) ? '' : String(startTimestamp / 1000),
    },
    loadCount
  );
};

onMounted(() => {
  (blockHeight.value || endTime.value || startTime.value) &&
    loadData(true, route.query);
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
  (query, oldQuery) =>
    (query.blockHeight ||
      query.endTime ||
      query.startTime ||
      query.currentPage) &&
    loadData(
      query.blockHeight !== oldQuery.blockHeight ||
        query.endTime !== oldQuery.endTime ||
        query.startTime !== oldQuery.startTime,
      query
    ),
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
    <div class="flex flex-col gap-y-2 items-center w-full">
      <div class="flex gap-x-3 items-center w-full">
        <div
          class="flex flex-col gap-2 grow"
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
