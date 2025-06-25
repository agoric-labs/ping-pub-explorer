<script setup lang="ts">
import { themeChange } from 'theme-change';
import { onMounted } from 'vue';
import TxDialog from '@/components/TxDialog.vue';

onMounted(() => themeChange(false));
</script>

<template>
  <RouterView />
  <TxDialog />
</template>
