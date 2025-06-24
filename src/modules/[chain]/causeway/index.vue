<route>{ meta: { i18n: 'causeway' } }</route>

<script lang="ts">
import mermaid from 'mermaid';

const INTERACTIONS_PER_PAGE = 20;
const IS_NUMBER_REGEX = /^[0-9]+(.[0-9]*)?$/;
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
import { generateMermaidSequenceDiagram, renderDiagram } from '@/libs/mermaid';
import { useCauseway } from '@/stores/useCauseway';
import { LoadingStatus } from '@/stores/useDashboard';

const causeway = useCauseway();
const route = useRoute();
const router = useRouter();

const blockHeight = ref(
  String(route.query.blockHeight || '').match(IS_NUMBER_REGEX)
    ? String(route.query.blockHeight)
    : ''
);
const endTime = ref(
  isNaN(getTimestampFromDate(String(route.query.endTime || '')))
    ? ''
    : String(route.query.endTime)
);
const mermaidRef = ref<HTMLDivElement | null>(null);
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
];
const totalPages = computed(() =>
  Math.ceil(data.value.interactionsCount / INTERACTIONS_PER_PAGE)
);

const applyFilters = (currentPage = 0) =>
  router.push({
    path: route.path,
    query: {
      blockHeight: blockHeight.value,
      currentPage: currentPage + 1,
      endTime: endTime.value,
      startTime: startTime.value,
    },
  });

const loadData = (loadCount: boolean, query: LocationQuery) => {
  const endTimestamp = getTimestampFromDate(String(query.endTime || ''));
  const startTimestamp = getTimestampFromDate(String(query.startTime || ''));

  causeway.loadData(
    {
      blockHeight: String(query.blockHeight || '').match(IS_NUMBER_REGEX)
        ? Number(blockHeight.value)
        : 0,
      currentPage: currentPage.value,
      endTime: isNaN(endTimestamp) ? '' : String(endTimestamp / 1000),
      limit: INTERACTIONS_PER_PAGE,
      startTime: isNaN(startTimestamp) ? '' : String(startTimestamp / 1000),
    },
    loadCount
  );
};

onMounted(
  () =>
    (blockHeight.value || endTime.value || startTime.value) &&
    loadData(true, route.query)
);

watch(
  status,
  (newStatus) => {
    if (newStatus === LoadingStatus.Loading)
      document.body.classList.add('h-screen', 'overflow-hidden');
    else document.body.classList.remove('h-screen', 'overflow-hidden');

    if (newStatus !== LoadingStatus.Loaded) return;
    const code = generateMermaidSequenceDiagram(
      data.value.interactions,
      data.value.vats,
      INTERACTIONS_PER_PAGE
    );
    renderDiagram({
      interactions: data.value.interactions,
      mermaidRef,
      code,
    });
  },
  { deep: true }
);

watch(
  () => route.query,
  (query, oldQuery) =>
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
        {{ `← ${$t(`${LOCALE_PREFIX}.previous-page-button-label`)}` }}
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
        {{ `${$t(`${LOCALE_PREFIX}.next-page-button-label`)} →` }}
      </button>
    </div>

    <div
      class="bg-transparent border border-gray-L300 border-solid grow max-w-full no-scrollbar overflow-scroll p-4 rounded-sm shrink"
      ref="mermaidRef"
    ></div>
  </div>
</template>
