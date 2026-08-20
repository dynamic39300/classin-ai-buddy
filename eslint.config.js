import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.agents', '.scratch', 'dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/pages/teacher/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@pages/student/**'],
          message: '教师页面不能导入学生页面内部实现；共享能力应下沉到公开 Feature、Domain 或 Design System。',
        }],
      }],
    },
  },
  {
    files: ['src/pages/student/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@pages/teacher/**'],
          message: '学生页面不能导入教师页面内部实现；共享能力应下沉到公开 Feature、Domain 或 Design System。',
        }],
      }],
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    ignores: ['src/domain/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['react', 'react-dom', '@app/**', '@pages/**', '@features/**', '@mocks/**', '@design-system/**'],
          message: 'Domain 只能依赖纯领域或契约模块，不能依赖 UI、浏览器组合根、Mock 或具体 Adapter。',
        }],
      }],
    },
  },
);
