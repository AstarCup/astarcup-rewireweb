import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "src/lib/emoji-data.ts", "src/lib/debugMarkers.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // 本项目大量组件文件同时导出 variants / hooks，这条规则只影响 HMR 体验，关掉
      "react-refresh/only-export-components": "off",

      // 类型层面：any 先降级为提示，逐步收窄
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],

      // a11y：先作为提示，避免一次性大面积失败
      ...Object.fromEntries(
        Object.keys(jsxA11y.flatConfigs.recommended.rules ?? {}).map((rule) => [rule, "warn"]),
      ),
      // 下面几条规则对自定义组件（Label/Input/Select）识别不了嵌套关系，误报太多
      "jsx-a11y/label-has-for": "off",
      "jsx-a11y/label-has-associated-control": "off",
      "jsx-a11y/control-has-associated-label": "off",
      // onError/onLoad 这类非交互回调不算“交互”
      "jsx-a11y/no-noninteractive-element-interactions": [
        "warn",
        { handlers: ["onClick", "onMouseDown", "onMouseUp", "onKeyDown", "onKeyUp", "onKeyPress"] },
      ],
    },
  },
  {
    files: ["vite.config.ts", "scripts/**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
