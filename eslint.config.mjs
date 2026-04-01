import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const ignoreRules = {
  ignores: [".next/**", ".open-next/**", ".wrangler/**", "next-env.d.ts"],
};

const boundaryRules = {
  files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/lib/ai/*", "!@/lib/ai", "!@/lib/ai/index"],
            message: "请通过 @/lib/ai 的受控导出访问 AI 模块。",
          },
          {
            group: ["@/lib/document/*", "!@/lib/document", "!@/lib/document/index"],
            message: "请通过 @/lib/document 的受控导出访问文档模块。",
          },
          {
            group: ["@/lib/network/*", "!@/lib/network", "!@/lib/network/index"],
            message: "请通过 @/lib/network 的受控导出访问网络模块。",
          },
          {
            group: ["@/lib/transcript/*", "!@/lib/transcript", "!@/lib/transcript/index"],
            message: "请通过 @/lib/transcript 的受控导出访问字幕模块。",
          },
        ],
      },
    ],
  },
};

const eslintConfig = [
  ignoreRules,
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  boundaryRules,
];

export default eslintConfig;
