import * as SecureStore from 'expo-secure-store';

import { clearAccountSession, getOrCreateDeviceIdentity, loadAccountSession, saveAccountSession } from '../storage/accountVault';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

it('creates a durable installation identity without using a MAC address', async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  const identity = await getOrCreateDeviceIdentity();
  expect(identity.installationId).toMatch(/^device_/);
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.stringContaining('device'), expect.not.stringContaining('macAddress'), expect.any(Object));
});

it('stores and clears only the account session token', async () => {
  const session = { accessToken: 'token', expiresAt: '2030-01-01T00:00:00.000Z', userId: 'user' };
  await saveAccountSession(session);
  const serialized = jest.mocked(SecureStore.setItemAsync).mock.calls[0]?.[1] ?? '';
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(serialized);
  await expect(loadAccountSession()).resolves.toEqual(session);
  await clearAccountSession();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(expect.stringContaining('session'));
});
