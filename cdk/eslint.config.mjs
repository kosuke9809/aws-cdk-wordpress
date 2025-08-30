import pluginJs from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importsPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    plugins: {
      import: importsPlugin,
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },
  { languageOptions: { globals: globals.node } },
  { ignores: ['**/cdk.out/**', '**/node_modules/**'] },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
];
