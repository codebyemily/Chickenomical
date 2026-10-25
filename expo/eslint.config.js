// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/components/nearby-map.tsx', 'src/components/nearby-map.web.tsx'],
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
    },
  },
]);
