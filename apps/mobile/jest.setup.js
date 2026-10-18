/* eslint-env jest */
// Mock React Native async storage
const mockAsyncStorageStore = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((k, v) => Promise.resolve(mockAsyncStorageStore.set(k, v))),
  getItem: jest.fn((k) => Promise.resolve(mockAsyncStorageStore.get(k) || null)),
  removeItem: jest.fn((k) => Promise.resolve(mockAsyncStorageStore.delete(k))),
  clear: jest.fn(() => Promise.resolve(mockAsyncStorageStore.clear())),
  getAllKeys: jest.fn(() => Promise.resolve(Array.from(mockAsyncStorageStore.keys()))),
  multiGet: jest.fn((keys) =>
    Promise.resolve(keys.map((k) => [k, mockAsyncStorageStore.get(k) || null]))
  ),
  multiSet: jest.fn((entries) => {
    entries.forEach(([k, v]) => mockAsyncStorageStore.set(k, v));
    return Promise.resolve();
  }),
}));

// Mock Google Sign-In
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({ data: { idToken: 'mock-id-token' } }),
    signOut: jest.fn().mockResolvedValue(undefined),
    isSignedIn: jest.fn().mockResolvedValue(false),
    getCurrentUser: jest.fn().mockResolvedValue(null),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

// Mock Keychain
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
}));

// Mock Firebase Messaging & App
jest.mock('@react-native-firebase/app', () => ({
  app: jest.fn(),
}));

const mockMessagingInstance = {
  requestPermission: jest.fn().mockResolvedValue(1),
  hasPermission: jest.fn().mockResolvedValue(1),
  getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
  onMessage: jest.fn(() => () => {}),
  onNotificationOpenedApp: jest.fn(() => () => {}),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  setBackgroundMessageHandler: jest.fn(),
};

jest.mock('@react-native-firebase/messaging', () => {
  const messagingFn = () => mockMessagingInstance;
  return {
    __esModule: true,
    default: messagingFn,
    getMessaging: () => mockMessagingInstance,
    AuthorizationStatus: {
      NOT_DETERMINED: -1,
      DENIED: 0,
      AUTHORIZED: 1,
      PROVISIONAL: 2,
    },
  };
});

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mSocket = {
    connected: true,
    id: 'mock-socket-id',
    auth: {},
    connect: jest.fn().mockReturnThis(),
    disconnect: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    emit: jest.fn().mockReturnThis(),
    once: jest.fn((event, cb) => {
      if (event === 'connect') setTimeout(cb, 0);
      return mSocket;
    }),
  };
  return {
    io: jest.fn(() => mSocket),
    Socket: jest.fn(() => mSocket),
  };
});

// Mock React Native Maps
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  const MockMapView = (props) => <View {...props} testID="mock-map-view" />;
  const MockMarker = (props) => <View {...props} testID="mock-marker" />;
  const MockPolyline = (props) => <View {...props} testID="mock-polyline" />;
  const MockCircle = (props) => <View {...props} testID="mock-circle" />;
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
    Circle: MockCircle,
    PROVIDER_GOOGLE: 'google',
  };
});

// Mock Safe Area Context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const SafeAreaInsetsContext = React.createContext(inset);
  const SafeAreaFrameContext = React.createContext(frame);
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(inset),
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
  };
});

// Mock Vector Icons
jest.mock('react-native-vector-icons/Feather', () => 'FeatherIcon');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// Mock Nitro Sound
jest.mock('react-native-nitro-sound', () => ({
  Sound: jest.fn().mockImplementation(() => ({
    play: jest.fn(),
    stop: jest.fn(),
    release: jest.fn(),
  })),
}));

// Mock Geolocation
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
}));

// Mock Device Info
jest.mock('react-native-device-info', () => ({
  getBatteryLevel: jest.fn().mockResolvedValue(0.95),
  getModel: jest.fn().mockReturnValue('iPhone 15 Pro'),
  getSystemVersion: jest.fn().mockReturnValue('17.0'),
  isBatteryCharging: jest.fn().mockResolvedValue(false),
}));

// Mock Image Picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn().mockResolvedValue({ assets: [] }),
  launchImageLibrary: jest.fn().mockResolvedValue({ assets: [] }),
}));

// Mock WebView
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props) => <View {...props} testID="mock-webview" />,
    WebView: (props) => <View {...props} testID="mock-webview" />,
  };
});

// Mock react-native-config
jest.mock('react-native-config', () => ({
  API_BASE_URL: 'http://localhost:3000',
  WS_URL: 'ws://localhost:3000',
}));

// Mock NativeModules.SafeWalkService
const { NativeModules } = require('react-native');
NativeModules.SafeWalkService = {
  playLiveAudioChunk: jest.fn().mockResolvedValue(true),
  stopLiveAudio: jest.fn().mockResolvedValue(true),
  isLiveAudioPlaying: jest.fn().mockResolvedValue(false),
  playSiren: jest.fn().mockResolvedValue(true),
  stopSiren: jest.fn().mockResolvedValue(true),
  isSirenPlaying: jest.fn().mockResolvedValue(false),
  startWithDetails: jest.fn().mockResolvedValue(true),
  stop: jest.fn().mockResolvedValue(true),
  isRunning: jest.fn().mockResolvedValue(false),
  recordSosAudio: jest.fn().mockResolvedValue(true),
  startEmergencyAudio: jest.fn().mockResolvedValue(true),
  stopEmergencyAudio: jest.fn().mockResolvedValue(true),
  playFakeCall: jest.fn().mockResolvedValue(true),
  stopFakeCall: jest.fn().mockResolvedValue(true),
};


