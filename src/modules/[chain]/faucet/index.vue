<route>{ meta: { i18n: 'faucet' } }</route>

<script lang="ts" setup>
import 'vue-multiselect/dist/vue-multiselect.min.css';

import { ref, onMounted, computed } from 'vue';
import VueSelect from 'vue-multiselect';

import CrossIcon from '@/icons/cross.svg';
import LoadingIcon from '@/icons/loading.svg';
import { get } from '@/libs';
import { useBlockchain, useFormatter } from '@/stores';

interface FaucetResponse {
  errorMessage: string;
  result: string;
}

const DEFAULT_FAUCET_RESPONSE: FaucetResponse = {
  errorMessage: '',
  result: '',
};
const DEFAULT_FAUCET_TYPE = 'SEND_BLD/IBC';
const CUSTOM_FAUCET_TYPE = 'CUSTOM_DENOMS_LIST';

const FAUCET_TYPE = {
  [CUSTOM_FAUCET_TYPE]: 'custom_denoms_list',
  [DEFAULT_FAUCET_TYPE]: 'send_bld_ibc',
};

const TRANSACTION_STATUS = {
  FAILED: 1000,
  NOT_FOUND: 1001,
  SUCCESSFUL: 1002,
};

const chainStore = useBlockchain();
const format = useFormatter();

const address = ref('');
const balances = ref<Array<{ amount: string; denom: string }>>([]);
const configChecker = ref('');
const denoms = ref<Array<string>>([]);
const faucet = ref('');
const faucetModal = ref(false);
const faucetResponse = ref(DEFAULT_FAUCET_RESPONSE);
const faucetType = ref<keyof typeof FAUCET_TYPE>(DEFAULT_FAUCET_TYPE);

const checklist = computed(() => {
  const endpoint = chainStore.current?.endpoints?.rest;
  const bs = !!balances.value.length;
  return [
    { title: 'Rest Endpoint', status: endpoint && endpoint[0].address !== '' },
    {
      title: 'Faucet Configured',
      status: !!chainStore.current?.faucet,
    },
    { title: 'Faucet Account', status: !!faucet.value },
    { title: 'Faucet Balance', status: bs },
  ];
});
const faucetUrl = computed(
  () =>
    chainStore.current?.faucet?.host ||
    `https://faucet.ping.pub/${chainStore.current?.chainName}`
);
const notReady = computed(() => checklist.value.some(({ status }) => !status));
const validAddress = computed(() =>
  address.value?.startsWith(chainStore.current?.bech32Prefix || '1')
);

const balance = () =>
  get(`${faucetUrl.value}/balance`)
    .then((res) => {
      balances.value = res?.balance;
      faucet.value = res?.address;
      balances.value = balances.value
        .map(({ amount, denom }) => ({
          amount: String(BigInt(amount) / BigInt(1e6)),
          denom,
        }))
        .filter(({ amount }) => Number(amount) >= 1);
    })
    .catch((err) => (configChecker.value = err?.toString()));

const claim = async () => {
  faucetResponse.value = DEFAULT_FAUCET_RESPONSE;
  if (!address.value) return;
  faucetModal.value = true;

  try {
    const { result } = await get<FaucetResponse>(
      `${faucetUrl.value}/send/${address.value}?command=${FAUCET_TYPE[faucetType.value]}&denoms=${denoms.value.join(',')}`
    );
    let errorMessage = '';
    let transactionStatus = TRANSACTION_STATUS.NOT_FOUND;

    while (transactionStatus === TRANSACTION_STATUS.NOT_FOUND) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      ({ errorMessage, transactionStatus } = await get<{
        errorMessage: string;
        transactionStatus: number;
      }>(`${faucetUrl.value}/transaction-status/${result}`));

      if (transactionStatus !== TRANSACTION_STATUS.FAILED) errorMessage = '';
    }

    faucetResponse.value = {
      errorMessage,
      result: errorMessage ? '' : result,
    };

    !errorMessage && balance();
  } catch (err) {
    faucetResponse.value = {
      errorMessage: err?.toString() || 'Unknown error',
      result: '',
    };
  }
};

const onDenomSelection = (selectedDenoms: Array<string>) =>
  (denoms.value = selectedDenoms);

const onFaucetTypeSelection = (
  selectedFaucetType: keyof typeof FAUCET_TYPE
) => {
  faucetType.value = selectedFaucetType;
  onDenomSelection([]);
};

onMounted(() => chainStore.current && chainStore.current.faucet && balance());
</script>

<template>
  <div class="flex flex-col gap-y-4 h-full w-full">
    <div class="flex flex-col items-center justify-center gap-4">
      <img
        class="w-16 rounded-md"
        :src="chainStore.current?.logo || '/logo.svg'"
      />
      <h1 class="text-primary text-3xl md:!text-6xl font-bold capitalize">
        {{ `${chainStore.chainName} Faucet` }}
      </h1>
    </div>

    <div
      class="bg-base-100 flex flex-col items-center p-4 rounded shadow w-full gap-y-4"
    >
      <div class="flex flex-row items-center justify-between gap-x-4 w-full">
        <h2 class="font-semibold text-xl">Get Tokens</h2>
        <VueSelect
          class="dark:placeholder-gray-300 dark:text-gray-300 h-12 placeholder-gray-500 border border-solid text-gray-500 !w-80"
          :disabled="notReady"
          :close-on-select="true"
          :options="Object.keys(FAUCET_TYPE)"
          :modelValue="faucetType"
          :searchable="false"
          @update:modelValue="onFaucetTypeSelection"
        />
        <VueSelect
          class="dark:placeholder-gray-300 dark:text-gray-300 h-12 placeholder-gray-500 border border-solid text-gray-500 !w-80"
          multiple
          :disabled="notReady"
          :close-on-select="false"
          :options="balances.map(({ denom }) => denom)"
          :modelValue="denoms"
          :searchable="false"
          @update:modelValue="onDenomSelection"
          v-if="faucetType === CUSTOM_FAUCET_TYPE"
        >
          <template #selection="{ values }">
            <span class="multiselect__placeholder" v-if="values.length">{{
              `${values.length} option(s) selected`
            }}</span>
          </template>
        </VueSelect>
      </div>

      <input
        class="w-full border border-gray-300 rounded-md p-2"
        :class="{ 'input-error': !validAddress }"
        :disabled="notReady"
        placeholder="Enter your address"
        name="address"
        type="text"
        v-model="address"
      />

      <button
        class="btn btn-primary bg-primary w-80 text-white"
        :disabled="notReady || !validAddress"
        @click="claim()"
      >
        Get Tokens
      </button>
    </div>

    <div class="bg-base-100 flex flex-col p-4 rounded shadow gap-y-4">
      <h2 class="font-semibold text-xl">Enable Faucet</h2>

      <span class="text-base"> 1. Submit chain configuration</span>
      <div class="mockup-code bg-gray-100 dark:bg-base-200 gap-4">
        <div v-for="it in checklist">
          <pre
            data-prefix=">"
          ><code class="text-gray-800 dark:invert">{{ it.title }}: </code>{{ it.status ? '✅' : '❌' }} </pre>
        </div>

        <pre v-if="!!configChecker" class="text-xs text-red-500">{{
          configChecker
        }}</pre>
      </div>

      <span class="text-base"> 2. Fund the faucet account</span>
      <div class="mockup-code bg-gray-100 dark:bg-base-200">
        <pre
          data-prefix=">"
        ><code class=" text-gray-800 dark:invert">Faucet Address: {{ faucet }} </code></pre>
        <pre
          data-prefix=">"
        ><code class="text-gray-800 dark:invert">Balances: {{ format.formatTokens(balances) }} </code></pre>
      </div>
    </div>

    <div
      class="modal"
      role="dialog"
      :style="`opacity: ${faucetModal ? '1' : '0'}; pointer-events: ${faucetModal ? 'all' : 'none'}; visibility: ${faucetModal ? 'visible' : 'hidden'}`"
    >
      <div class="modal-box">
        <div v-if="!!faucetResponse.errorMessage">
          <h3 class="font-bold text-red-500">Error</h3>
          <div>{{ faucetResponse.errorMessage }}</div>
        </div>

        <div v-else-if="!!faucetResponse.result">
          <h3 class="font-bold text-green-500">Token Sent!</h3>
          <div class="text-center mt-4">
            <RouterLink
              :to="`/${chainStore.chainName}/tx/${faucetResponse.result}`"
              >View Transaction</RouterLink
            >
          </div>
        </div>

        <LoadingIcon v-else class="animate-spin fill-primary h-8 mx-auto w-8" />

        <button
          className="absolute no-outline p-4 right-2 top-2"
          @click="() => (faucetModal = false)"
        >
          <CrossIcon class="fill-primary h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
