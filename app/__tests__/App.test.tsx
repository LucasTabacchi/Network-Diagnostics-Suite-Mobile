import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { initDatabase } from '../src/store';

jest.mock('../src/store', () => ({ initDatabase: jest.fn() }));
jest.mock('../src/sync/SyncWorker', () => ({
  SyncWorker: { startAutoSync: jest.fn(), stopAutoSync: jest.fn() },
}));
jest.mock('../src/core/navigation/RootNavigator', () => {
  const ReactForMock = require('react');
  const { View } = require('react-native');
  return { RootNavigator: () => ReactForMock.createElement(View, { testID: 'root-navigator' }) };
});

const mockInitDatabase = initDatabase as jest.Mock;

beforeEach(() => {
  mockInitDatabase.mockReset();
});

test('waits for database initialization before mounting navigation', async () => {
  let resolveInitialization!: (value: any) => void;
  mockInitDatabase.mockReturnValue(new Promise((resolve) => { resolveInitialization = resolve; }));
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<App />); });
  expect(renderer.root.findAllByProps({ testID: 'root-navigator' })).toHaveLength(0);

  await ReactTestRenderer.act(async () => { resolveInitialization({}); });
  expect(renderer.root.findAllByProps({ testID: 'root-navigator' }).length).toBeGreaterThan(0);
  await ReactTestRenderer.act(async () => { renderer.unmount(); });
});

test('shows a retry action when initialization fails', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockInitDatabase.mockRejectedValueOnce(new Error('database unavailable')).mockResolvedValueOnce({});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<App />); });
  expect(renderer.root.findAllByProps({ testID: 'root-navigator' })).toHaveLength(0);
  const retry = renderer.root.findByProps({ accessibilityLabel: 'Reintentar inicialización' });
  await ReactTestRenderer.act(async () => { retry.props.onPress(); });
  expect(renderer.root.findAllByProps({ testID: 'root-navigator' }).length).toBeGreaterThan(0);
  await ReactTestRenderer.act(async () => { renderer.unmount(); });
  warn.mockRestore();
});
