import App from '@/App.vue';
import i18n from '@/plugins/i18n';
import router from '@/router';
import { useBaseStore } from '@/stores/useBaseStore';
import '@/style.css';
import LazyLoad from 'lazy-load-vue3';
import { createPinia } from 'pinia';
import { createApp, ref } from 'vue';

const app = createApp(App);

app.use(i18n);
app.use(createPinia());
app.use(router);
app.use(LazyLoad, { component: true });

app.mount('#app');

const blockStore = useBaseStore();
const requestCounter = ref(0);

setInterval(() => {
  requestCounter.value += 1;
  if (requestCounter.value < 5)
    blockStore.fetchLatest().finally(() => (requestCounter.value -= 1));
}, 6000);
