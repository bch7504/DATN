import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "out/**",
      "build/**",
      "*.cjs",
      "tests/**",
      "mvp.html",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
