module.exports = {
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  // ignorePatterns: ['.github/actions/**/dist/'],
  parserOptions: { project: '../../../tsconfig.json' },
  rules: {
    'import/extensions': 0,
    'import/no-import-module-exports': 0,
    'no-underscore-dangle': 0,
    'import/prefer-default-export': 0,
    'max-len': ['error', { code: 140, comments: 140 }],
    '@typescript-eslint/no-use-before-define': 0,

    // enforce that dependencies are listed in the ci/package.json (not in the package.json of the package itself)
    "import/no-extraneous-dependencies": ["error", {"packageDir": ['./../../..', './']}],
    '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    'no-await-in-loop': 0,
  },
};
