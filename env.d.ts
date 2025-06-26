/// <reference types="vite/client" />
/// <reference types="vite-svg-loader" />

declare module '@personaxyz/ad-sdk';

declare module '~pages' {
  import type { RouteRecordRaw } from 'vue-router';
  const pages: Array<RouteRecordRaw>;
  export default pages;
}

declare module 'virtual:generated-layouts' {
  import type { RouteRecordRaw } from 'vue-router';
  export function setupLayouts(
    routes: Array<RouteRecordRaw>
  ): Array<RouteRecordRaw>;
}
