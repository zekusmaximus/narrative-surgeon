import '@testing-library/jest-native/extend-expect';
import { jest } from '@jest/globals';

// Mock React Native modules that don't work in Node environment
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  })),
}));

// Mock Tauri API
const mockTauriApi = {
  invoke: jest.fn(),
  listen: jest.fn(),
  emit: jest.fn(),
  convertFileSrc: jest.fn((path: string) => `file://${path}`),
};

Object.defineProperty(window, 'tauri', {
  value: mockTauriApi,
  writable: true,
});

Object.defineProperty(window, '__tauri__', {
  value: mockTauriApi,
  writable: true,
});

// Mock fetch for any HTTP requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  })
) as jest.MockedFunction<typeof fetch>;

// Mock timers
jest.useFakeTimers({
  legacyFakeTimers: true,
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.log = originalConsole.log;
});

// Global test utilities
global.flushPromises = () => new Promise(setImmediate);

global.mockTauri = mockTauriApi;

// Setup global mocks for React Native components
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  return {
    ...RN,
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Platform: {
      OS: 'web',
      select: jest.fn((obj) => obj.web || obj.default),
    },
    Alert: {
      alert: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
    },
    Share: {
      share: jest.fn(() => Promise.resolve()),
    },
    Clipboard: {
      setString: jest.fn(),
      getString: jest.fn(() => Promise.resolve('')),
    },
    Keyboard: {
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
      dismiss: jest.fn(),
    },
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => {
  const RN = require('react-native');
  return {
    ...RN,
    PanGestureHandler: RN.View,
    TapGestureHandler: RN.View,
    LongPressGestureHandler: RN.View,
    PinchGestureHandler: RN.View,
    RotationGestureHandler: RN.View,
    State: {},
    Directions: {},
  };
});

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset Tauri mocks
  mockTauriApi.invoke.mockReset();
  mockTauriApi.listen.mockReset();
  mockTauriApi.emit.mockReset();
  
  // Clear localStorage
  localStorage.clear();
  sessionStorage.clear();
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.runOnlyPendingTimers();
});

// Global error handler for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};