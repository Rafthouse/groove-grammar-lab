export default [
  {
    files: ["**/*.js", "**/*.mjs"],
    ignores: ["node_modules/**", "dist/**", "dist-web/**", "release/**"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        AudioContext: "readonly",
        Blob: "readonly",
        Buffer: "readonly",
        DataView: "readonly",
        Date: "readonly",
        Electron: "readonly",
        Math: "readonly",
        OfflineAudioContext: "readonly",
        Promise: "readonly",
        Set: "readonly",
        Uint8Array: "readonly",
        URL: "readonly",
        __dirname: "readonly",
        atob: "readonly",
        btoa: "readonly",
        cancelAnimationFrame: "readonly",
        clearInterval: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        document: "readonly",
        fetch: "readonly",
        globalThis: "readonly",
        localStorage: "readonly",
        location: "readonly",
        module: "readonly",
        navigator: "readonly",
        process: "readonly",
        require: "readonly",
        requestAnimationFrame: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        structuredClone: "readonly",
        window: "readonly",
        webkitAudioContext: "readonly",
        webkitOfflineAudioContext: "readonly"
      }
    },
    rules: {
      "no-debugger": "error",
      "no-undef": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }]
    }
  }
];
