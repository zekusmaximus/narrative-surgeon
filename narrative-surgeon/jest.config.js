module.exports = {
  preset: "react-native",
  setupFilesAfterEnv: [
    "<rootDir>/src/__tests__/setup.ts"
  ],
  testMatch: [
    "<rootDir>/src/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)",
    "<rootDir>/src/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)",
  ],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/android/",
    "<rootDir>/ios/",
  ],
  transformIgnorePatterns: [
    "node_modules/(?\!(react-native|@react-native|@tauri-apps)/)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "\!src/**/*.d.ts",
    "\!src/__tests__/**/*",
    "\!src/**/index.ts",
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "lcov", "html"],
  testEnvironment: "jsdom",
  moduleNameMapping: {
    "\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\.(gif|ttf|eot|svg|png)$": "<rootDir>/src/__tests__/__mocks__/fileMock.js",
  },
  globals: {
    __DEV__: true,
  },
  testTimeout: 10000,
  maxWorkers: 4,
  verbose: true,
  errorOnDeprecated: true,
};
