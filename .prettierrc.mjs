import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export default {
  trailingComma: 'es5',
  tabWidth: 2,
  semi: false,
  singleQuote: true,
  arrowParens: 'always',
  quoteProps: 'as-needed',
  endOfLine: 'auto',
  plugins: ['@trivago/prettier-plugin-sort-imports', '@prettier/plugin-pug'],
  // sort imports
  importOrder: [
    '^dotenv$',
    '^node:',
    '^(vite|vue)$',
    '^@/',
    '^~/',
    '^$utils/',
    '<THIRD_PARTY_MODULES>',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
}
