import { createI18n } from 'vue-i18n';

const messages = Object.fromEntries(
  Object.entries(
    import.meta.glob<{ default: any }>('./locales/*.json', { eager: true })
  ).map(([key, value]) => [key.slice(10, -5), value.default])
);

export default createI18n({
  legacy: false,
  locale: localStorage.getItem('lang') || 'en',
  fallbackLocale: 'en',
  messages,
});
