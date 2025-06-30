<script lang="ts" setup>
import { watch } from 'vue';
import { JsonViewer } from 'vue3-json-viewer';
import 'vue3-json-viewer/dist/index.css';

import DynamicComponent from '@/components/dynamic/DynamicComponent.vue';
import { BRIDGE_ID, WALLET_SPEND_ACTION_MESSAGE } from '@/constants';
import { useBaseStore, useBlockchain, useFormatter } from '@/stores';
import { getRunIdsForTransactionId } from '@/stores/useCauseway';
import type { Tx, TxResponse } from '@/types';
import { computed, ref } from '@vue/reactivity';

const props = defineProps(['hash', 'chain']);

const baseStore = useBaseStore();
const blockchain = useBlockchain();
const format = useFormatter();
const runIds = ref<Awaited<ReturnType<typeof getRunIdsForTransactionId>>>([]);
const tx = ref(
  {} as {
    tx: Tx;
    tx_response: TxResponse;
  }
);

if (props.hash) blockchain.rpc.getTx(props.hash).then((x) => (tx.value = x));

const messages = computed(
  () =>
    tx.value.tx?.body.messages.map((x) => {
      if (x.packet?.data)
        // @ts-ignore
        x.message = format.base64ToString(x.packet.data);
      return x;
    }) || []
);

watch(
  tx,
  (transaction) =>
    transaction.tx?.body.messages.some(
      (message) => message['@type'] === WALLET_SPEND_ACTION_MESSAGE
    ) &&
    getRunIdsForTransactionId({
      sourceTrigger: BRIDGE_ID.WALLET,
      transactionId: props.hash,
    }).then((_runIds) => (runIds.value = _runIds))
);
</script>

<template>
  <div class="flex flex-col gap-y-4 w-full">
    <div class="tabs tabs-boxed bg-transparent">
      <RouterLink
        class="tab text-gray-400 uppercase"
        :to="`/${chain}/tx/?tab=recent`"
        >{{ $t('block.recent') }}</RouterLink
      >
      <RouterLink
        class="tab text-gray-400 uppercase"
        :to="`/${chain}/tx/?tab=search`"
        >Search</RouterLink
      >
      <a class="tab text-gray-400 uppercase tab-active">Transaction</a>
    </div>

    <div v-if="tx.tx_response" class="bg-base-100 gap-y-2 p-4 rounded shadow">
      <div class="flex items-center justify-between w-full">
        <h2 class="card-title truncate">{{ $t('tx.title') }}</h2>
        <RouterLink
          :to="`/${blockchain.chainName}/causeway?${runIds.map((runId) => `runId=${runId}`).join('&')}`"
          class="btn btn-primary btn-sm p-1"
          v-if="!!runIds.length"
        >
          {{ $t('causeway.visualize-block-label') }}
        </RouterLink>
      </div>
      <div class="overflow-hidden">
        <table class="table text-sm">
          <tbody>
            <tr>
              <td>{{ $t('tx.tx_hash') }}</td>
              <td class="overflow-hidden">{{ tx.tx_response.txhash }}</td>
            </tr>
            <tr>
              <td>{{ $t('account.height') }}</td>
              <td>
                <RouterLink
                  :to="`/${props.chain}/block/${tx.tx_response.height}`"
                  class="text-primary dark:invert"
                  >{{ tx.tx_response.height }}
                </RouterLink>
              </td>
            </tr>
            <tr>
              <td>{{ $t('staking.status') }}</td>
              <td>
                <span
                  class="text-xs truncate relative py-2 px-4 w-fit mr-2 rounded"
                  :class="`text-${
                    tx.tx_response.code === 0 ? 'success' : 'error'
                  }`"
                >
                  <span
                    class="inset-x-0 inset-y-0 opacity-10 absolute"
                    :class="`bg-${
                      tx.tx_response.code === 0 ? 'success' : 'error'
                    }`"
                  ></span>
                  {{ tx.tx_response.code === 0 ? 'Success' : 'Failed' }}
                </span>
                <span>
                  {{
                    tx.tx_response.code === 0 ? '' : tx?.tx_response?.raw_log
                  }}
                </span>
              </td>
            </tr>
            <tr>
              <td>{{ $t('account.time') }}</td>
              <td>
                {{ format.toLocaleDate(tx.tx_response.timestamp) }} ({{
                  format.toDay(tx.tx_response.timestamp, 'from')
                }})
              </td>
            </tr>
            <tr>
              <td>{{ $t('tx.gas') }}</td>
              <td>
                {{ tx.tx_response.gas_used }} / {{ tx.tx_response.gas_wanted }}
              </td>
            </tr>
            <tr>
              <td>{{ $t('tx.fee') }}</td>
              <td>
                {{
                  format.formatTokens(
                    tx.tx?.auth_info?.fee?.amount,
                    true,
                    '0,0.[00]'
                  )
                }}
              </td>
            </tr>
            <tr>
              <td>{{ $t('tx.memo') }}</td>
              <td>{{ tx.tx.body.memo }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="tx.tx_response"
      class="bg-base-100 px-4 pt-3 pb-4 rounded shadow"
    >
      <h2 class="card-title truncate mb-2">
        {{ $t('account.messages') }}: ({{ messages.length }})
      </h2>
      <div v-for="(msg, i) in messages">
        <div class="border border-slate-400 rounded-md mt-4">
          <DynamicComponent :value="msg" />
        </div>
      </div>
      <div v-if="messages.length === 0">{{ $t('tx.no_messages') }}</div>
    </div>

    <div
      v-if="tx.tx_response"
      class="bg-base-100 px-4 pt-3 pb-4 rounded shadow"
    >
      <h2 class="card-title truncate mb-2">JSON</h2>
      <JsonViewer
        :value="tx"
        :theme="baseStore.theme"
        style="background: transparent"
        copyable
        boxed
        sort
        expand-depth="5"
      />
    </div>
  </div>
</template>
