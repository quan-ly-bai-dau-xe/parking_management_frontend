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
      'no-alert': 'error',
      // Guardrail: cảnh báo comment TODO/FIXME/HACK né sửa lỗi gốc rễ
      'no-warning-comments': ['warn', { terms: ['todo', 'fixme', 'hack'], location: 'start' }],
    },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    rules: {
      // Guardrail: cảnh báo file quá lớn
      'max-lines': [
        'warn',
        {
          max: 200,
          skipBlankLines: true,
          skipComments: true,
        },
      ],

      // Guardrail: hạn chế useEffect không cần thiết
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "CallExpression[callee.name='useEffect'], CallExpression[callee.object.name='React'][callee.property.name='useEffect']",
          message:
            'Hãy cân nhắc liệu useEffect có thực sự cần thiết. Ưu tiên derived state, event handlers hoặc custom hooks khi phù hợp. Chỉ dùng useEffect để đồng bộ với hệ thống bên ngoài.',
        },
      ],
    },
  },
  ...storybook.configs["flat/recommended"]
])
