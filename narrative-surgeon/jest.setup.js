// Mock Expo modules for testing
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => ({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(() => []),
    getFirstAsync: jest.fn(),
    closeAsync: jest.fn(),
  })),
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(() => ({ exists: true })),
  readAsStringAsync: jest.fn(() => 'mock file content'),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => ({
    canceled: false,
    assets: [{ uri: 'mock://file.txt', mimeType: 'text/plain' }],
  })),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Mock React Native components
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
}));

// Mock UUID generation
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));