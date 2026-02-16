import { resolve } from 'node:path'

import { defineConfig } from 'vite'

import { cloudflare } from '@cloudflare/vite-plugin'
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import VueDevTools from 'vite-plugin-vue-devtools'
import VueRouter from 'vue-router/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    Vue(),
    VueJsx(),
    VueRouter({
      dts: 'src/typed-router.d.ts',
      routesFolder: ['src/pages'],
      extensions: ['.vue', '.tsx'],
    }),
    VueDevTools(),
    AutoImport({
      dirs: [
        'src/composables',
        'src/stores',
        'src/utils',
        'src/models',
        'src/hooks',
      ],
      imports: ['vue', 'vue-router', '@vueuse/core', 'pinia'],
      dts: 'src/auto-imports.d.ts',
      vueDirectives: true,
      vueTemplate: true,
    }),
    Components({
      dirs: ['src/components'],
      dts: 'src/components.d.ts',
    }),
    UnoCSS(),
    cloudflare({}),
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
})
