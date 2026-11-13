import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          // 与组件同文件导出的白名单：
          // - context 的 hook/provider 配对（useApp/useConfirm）
          // - shadcn/ui 上游文件的工具导出（拆分会偏离上游）
          allowExportNames: [
            "useApp",
            "useConfirm",
            "useSidebar",
            "navigationMenuTriggerStyle",
            "toast",
            "useToastManager",
            "createToastManager",
            "badgeVariants",
            "buttonVariants",
            "STICKER_BOUNDS",
            "groupStats",
            "STAT_FIELDS",
          ],
        },
      ],
      // 与 tsc 的 noUnusedLocals / noUnusedParameters 保持一致即可，避免双份噪音
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["vite.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
);
