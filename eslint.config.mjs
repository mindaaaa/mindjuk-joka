// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import importPlugin from "eslint-plugin-import";

export default tseslint.config({
  ignores: [
    "**/dist/**",
    "**/coverage/**",
    "**/generated/**",
    "**/jest.config.*",
    "**/jest.setup.*",
    "**/openapi-ts.config.*",
    "**/vite.config.*",
    "**/test/**",
  ],
}, eslint.configs.recommended, ...tseslint.configs.recommended, {
  files: ["**/*.{ts,tsx,js,jsx}"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      project: ["./tsconfig.json", "./packages/*/tsconfig.json", "./apps/*/tsconfig.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
  plugins: {
    "@typescript-eslint": tseslint.plugin,
    import: importPlugin,
    prettier: prettierPlugin,
  },
  rules: {
    "prettier/prettier": "error",
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", ["parent", "sibling"], "index", "object"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_" },
    ],
    eqeqeq: ["error", "always", { null: "ignore" }],
    curly: ["error", "all"],
  },
}, prettier, storybook.configs["flat/recommended"]);
