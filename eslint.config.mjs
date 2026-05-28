import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const compat = new FlatCompat({
  recommendedConfig: js.configs.recommended
});

const config = [
  { ignores: [".next/**", "node_modules/**", "storage/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript")
];

export default config;
