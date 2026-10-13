import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

jest.mock('react-native-screens', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    enableScreens: jest.fn(),
    ScreenContainer: View,
    Screen: View,
    NativeScreen: View,
    NativeScreenContainer: View,
    ScreenStack: View,
    ScreenStackItem: View,
    ScreenStackHeaderConfig: View,
    ScreenStackHeaderSubview: View,
    ScreenStackHeaderBackButtonImage: View,
    ScreenStackHeaderRightView: View,
    ScreenStackHeaderLeftView: View,
    ScreenStackHeaderCenterView: View,
    SearchBar: View,
    shouldUseActivityState: jest.fn(),
    compatibilityFlags: {},
  };
});

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    execute: jest.fn(async () => ({ rows: [], rowsAffected: 0 })),
    executeBatch: jest.fn(async () => {}),
    transaction: jest.fn(async (cb) => cb({ execute: jest.fn() })),
    closeAsync: jest.fn(async () => {}),
  })),
}));

jest.mock('react-native-udp', () => ({
  createSocket: jest.fn(() => ({
    bind: jest.fn((port, addr, cb) => cb && cb()),
    send: jest.fn((data, offset, length, port, addr, cb) => cb && cb()),
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn((opts, cb) => {
    if (cb) cb();
    return {
      on: jest.fn(),
      destroy: jest.fn(),
    };
  }),
}));

jest.mock('react-native-zeroconf', () => {
  return jest.fn().mockImplementation(() => ({
    scan: jest.fn(),
    stop: jest.fn(),
    on: jest.fn(),
  }));
});

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(async () => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {
      ipAddress: '192.168.1.100',
      subnet: '255.255.255.0',
    },
  })),
  addEventListener: jest.fn(() => jest.fn()),
}));

const mockKeychainMemory = new Map();
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(async (username, password, options) => {
    const service = options?.service || 'default';
    mockKeychainMemory.set(service, { username, password });
    return true;
  }),
  getGenericPassword: jest.fn(async (options) => {
    const service = options?.service || 'default';
    const val = mockKeychainMemory.get(service);
    return val ? { username: val.username, password: val.password } : false;
  }),
  resetGenericPassword: jest.fn(async (options) => {
    const service = options?.service || 'default';
    mockKeychainMemory.delete(service);
    return true;
  }),
}));

jest.mock('@dylankenneally/react-native-ssh-sftp', () => {
  const MockClientInstance = {
    connect: jest.fn(async () => {}),
    execute: jest.fn(async (cmd) => `Output of: ${cmd}\nstatus: OK`),
    disconnect: jest.fn(async () => {}),
  };
  const MockClient: any = jest.fn().mockImplementation((host, port, username, password, callback) => {
    if (callback) callback(null);
    return MockClientInstance;
  });
  MockClient.connectWithPassword = jest.fn(async () => MockClientInstance);
  MockClient.connectWithKey = jest.fn(async () => MockClientInstance);
  return {
    __esModule: true,
    default: MockClient,
    SSHClient: MockClient,
  };
});

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn((success) =>
    success({
      coords: {
        latitude: -32.4825,
        longitude: -58.2321,
        accuracy: 4.5,
      },
    })
  ),
  requestAuthorization: jest.fn(),
  setRNConfiguration: jest.fn(),
}));

jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Camera: View,
    useCameraDevice: jest.fn(() => ({ id: 'back', position: 'back' })),
    useCameraPermission: jest.fn(() => ({
      hasPermission: true,
      requestPermission: jest.fn(async () => true),
    })),
    useCodeScanner: jest.fn(() => ({})),
  };
});

jest.mock('react-native-html-to-pdf', () => ({
  convert: jest.fn(async (options) => ({
    filePath: `/data/user/0/com.fcyt.netdiag/files/${options.fileName || 'report'}.pdf`,
    base64: 'JVBERi0xLjQK...',
    numberOfPages: 1,
  })),
}));

jest.mock('react-native-pdf', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props, ref) => React.createElement(View, { ...props, testID: 'mock-pdf-view' }));
});

jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: {
      DocumentDir: '/data/user/0/com.fcyt.netdiag/files',
      DownloadDir: '/storage/emulated/0/Download',
    },
    cp: jest.fn(async () => true),
  },
}));

jest.mock('react-native-vision-camera-barcode-scanner', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CodeScanner: (props) => React.createElement(View, { ...props, testID: 'mock-code-scanner' }),
    useBarcodeScanner: jest.fn(() => ({ scanCodes: jest.fn(() => []) })),
    useBarcodeScannerOutput: jest.fn(() => ({})),
  };
});



