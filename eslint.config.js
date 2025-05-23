import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";
import globals from "globals";

export default [
  eslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ...reactRecommended,
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "prettier/prettier": "error",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  eslintPluginPrettierRecommended,
];
