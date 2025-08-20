import { dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import AutoImport from 'unplugin-auto-import/vite';
import DefineOptions from 'unplugin-vue-define-options/vite';
import { defineConfig } from 'vite';
import type { CommonServerOptions, UserConfigFnPromise } from 'vite';
import Pages from 'vite-plugin-pages';
import Layouts from 'vite-plugin-vue-layouts';
import svgLoader from 'vite-svg-loader';

const __fileName = fileURLToPath(import.meta.url);

const __dirname = dirname(__fileName);

const configCreator: UserConfigFnPromise = async ({ command, mode }) => {
  const isNotBuildMode = !(command === 'build' && mode === 'production');

  if (!process.env.PORT && isNotBuildMode)
    throw Error(`Expected a number in PORT env, got '${process.env.PORT}'`);

  const serverConfig: CommonServerOptions = {
    host: true,
    port: Number(process.env.PORT),
    proxy: {
      '^/api/.*': {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api*/g, ''),
        target:
          process.env.API_ENDPOINT ||
          `http://${process.env.RPCNODES_SERVICE_HOST}:${process.env.RPCNODES_SERVICE_PORT_API}`,
      },
      '^/rpc/.*': {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc*/g, ''),
        target:
          process.env.RPC_ENDPOINT ||
          `http://${process.env.RPCNODES_SERVICE_HOST}:${process.env.RPCNODES_SERVICE_PORT_RPC}`,
      },
      '^/rest/.*': {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rest*/g, ''),
        target:
          process.env.REST_ENDPOINT ||
          `http://${process.env.RPCNODES_SERVICE_HOST}:${process.env.RPCNODES_SERVICE_PORT_SIDEKICK}`,
      },
    },
    strictPort: true,
  };

  return {
    define: {
      'process.env': {},
    },
    optimizeDeps: {
      entries: [`${__dirname}/src/**/*.vue`],
    },
    plugins: [
      AutoImport({
        imports: [
          '@vueuse/core',
          '@vueuse/math',
          'pinia',
          'vue',
          'vue-i18n',
          'vue-router',
        ],
        vueTemplate: true,
      }),
      DefineOptions(),
      Layouts({
        layoutsDirs: `${__dirname}/src/layouts`,
      }),
      Pages({
        dirs: [`${__dirname}/src/modules`, `${__dirname}/src/pages`],
        exclude: ['**/*.ts'], // only load .vue as modules
      }),
      svgLoader(),
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) =>
              [
                'ping-connect-wallet',
                'ping-token-convert',
                'ping-tx-dialog',
              ].includes(tag),
          },
        },
      }),
      VueI18nPlugin({
        compositionOnly: true,
        include: [
          fileURLToPath(
            new URL(`${__dirname}/src/plugins/i18n/locales/**`, import.meta.url)
          ),
        ],
        runtimeOnly: true,
      }),
      vueJsx(),
    ],
    preview: serverConfig,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL(`${__dirname}/src`, import.meta.url)),
        '~': fileURLToPath(new URL(__dirname, import.meta.url)),
      },
    },
    server: serverConfig,
  };
};

const config = defineConfig(configCreator);

export default config;
