// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    // Never lint generated/build output.
    ignores: ["dist/**", ".angular/**", "out-tsc/**", "coverage/**", "node_modules/**"],
  },
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: ["dl", "app"], style: "camelCase" },
      ],
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: ["dl", "app"], style: "kebab-case" },
      ],
      // Scaffold uses constructor DI on purpose for the NgModule / Angular 9–13
      // compatibility surface (see scheduler-plan.md §5). Don't force inject().
      "@angular-eslint/prefer-inject": "off",
      // `_`-prefixed params are intentional unused interface params (abstract impls).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // `any` is banned only in the PUBLIC surface (CLAUDE.md house style). The
      // remaining uses are internal provider guards / test generics → warn, not error.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
