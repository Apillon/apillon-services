module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: '.',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'sonarjs',
    'security',
    'promise',
    'prettier',
  ],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:sonarjs/recommended',
    'plugin:security/recommended',
    'plugin:promise/recommended',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'webpack.config.js', 'dist/*', '**/*.js', 'node_modules/*'],
  rules: {
    semi: [2, 'always'],
    quotes: [1, 'single', { allowTemplateLiterals: true }],
    curly: [2, 'all'],
    "spaced-comment": ["error", "always", { "exceptions": ["-", "+"] }],
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: false },
    ],
    'security/detect-non-literal-regexp': 0,
    'security/detect-object-injection': 0,
    'promise/always-return': 0,
    'promise/no-callback-in-promise': 0,
    'sonarjs/cognitive-complexity': [2, 50],
    'sonarjs/no-duplicate-string': 0,
    'sonarjs/no-useless-catch': 1,
    'sonarjs/no-nested-template-literals': 0,
    'sonarjs/prefer-single-boolean-return': 1,
    '@typescript-eslint/no-unused-vars': [
      1,
      { argsIgnorePattern: '^_|^returns$|^of$|^type$' },
    ],
    'prettier/prettier': [
      'error',
      {
        printWidth: 80,
        singleQuote: true,
        trailingComma: 'all',
        endOfLine: 'auto',
        bracketSpacing: true,
      },
      {
        usePrettierrc: false,
      },
    ],
    "no-restricted-imports": ["error", {
      "patterns": ["**/dist/**"]
    }]
  },
};
