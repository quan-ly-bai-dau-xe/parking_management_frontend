// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import pluginPromise from 'eslint-plugin-promise'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'storybook-static']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      pluginPromise.configs['flat/recommended'],
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // P0: Empty catch & empty block guardrail
      'no-empty': ['error', { allowEmptyCatch: false }],
      // P0: Promise handling & unhandled rejection guardrails
      'promise/catch-or-return': ['error', { allowFinally: true }],
      'promise/always-return': 'off', // Không ép buộc return trong .then() vì nhiều tác vụ chỉ thực hiện side-effects
      'promise/no-nesting': 'warn',
    },
  },
  ...storybook.configs["flat/recommended"]
])
