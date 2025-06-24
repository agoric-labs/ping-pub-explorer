import { type Dirent, readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import AutoImport from 'unplugin-auto-import/vite';
import DefineOptions from 'unplugin-vue-define-options/vite';
import { type CommonServerOptions, defineConfig } from 'vite';
import Pages from 'vite-plugin-pages';
import Layouts from 'vite-plugin-vue-layouts';

import colors from './colors';

interface Asset {
  base: string;
  coingecko_id: string;
  exponent: string;
  logo: string;
  symbol: string;
}

interface ChainConfig {
  addr_prefix: string;
  api: Array<string>;
  assets: Asset[];
  chain_name: string;
  coin_type: string;
  coingecko: string;
  logo: string;
  min_tx_fee: string;
  rpc: Array<string>;
  sdk_version: string;
  theme_color: string;
}

const __fileName = fileURLToPath(import.meta.url);
const ENCODING = 'utf-8';

const __dirname = dirname(__fileName);

const config = defineConfig(async ({ command, mode }) => {
  const isNotBuildMode = !(command === 'build' && mode === 'production');

  if (!process.env.PORT && isNotBuildMode)
    throw Error(`Expected a number in PORT env, got '${process.env.PORT}'`);

  if (isNotBuildMode) await updatePortsInChainConfigs();

  const serverConfig: CommonServerOptions = {
    host: true,
    port: Number(process.env.PORT),
    proxy: {
      '^/api/.*': {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api*/g, ''),
        // target: `http://${process.env.RPCNODES_SERVICE_HOST}:${process.env.RPCNODES_SERVICE_PORT_API}`,
        target: 'https://devnet.api.agoric.net',
      },
      '^/rpc/.*': {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc*/g, ''),
        // target: `http://${process.env.RPCNODES_SERVICE_HOST}:${process.env.RPCNODES_SERVICE_PORT_RPC}`,
        target: 'https://devnet.rpc.agoric.net',
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
});

const updatePortsInChainConfig = async ({ name, path }: Dirent) => {
  const filePath = `${path}/${name}`;
  const fileContent: ChainConfig = JSON.parse(
    await readFile(filePath, { encoding: ENCODING })
  );
  fileContent.api = fileContent.api.map(
    () => `http://localhost:${process.env.PORT}/api`
  );
  fileContent.rpc = fileContent.rpc.map(
    () => `http://localhost:${process.env.PORT}/rpc`
  );
  fileContent.theme_color = colors.primary;
  return writeFile(filePath, JSON.stringify(fileContent, undefined, 4), {
    encoding: ENCODING,
  });
};

const updatePortsInChainConfigs = () => {
  const chains = readdirSync(`${__dirname}/chains/mainnet`, {
    withFileTypes: true,
  });
  return Promise.all(
    chains.filter((entry) => entry.isFile()).map(updatePortsInChainConfig)
  );
};

export default config;
