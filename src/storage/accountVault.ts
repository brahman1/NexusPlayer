import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

import type { AccountSession, DeviceIdentity } from '../types/account';
import { createId } from '../utils/ids';

const DEVICE_KEY = 'nexusplayer.account.device.v1';
const SESSION_KEY = 'nexusplayer.account.session.v1';

const deviceSchema = z.object({ createdAt: z.string(), installationId: z.string().min(12) });
const sessionSchema = z.object({ accessToken: z.string().min(1), expiresAt: z.string(), userId: z.string().min(1) });

export async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const stored = await SecureStore.getItemAsync(DEVICE_KEY);
  if (stored) {
    const parsed = deviceSchema.safeParse(JSON.parse(stored));
    if (parsed.success) return parsed.data;
  }
  const identity: DeviceIdentity = { createdAt: new Date().toISOString(), installationId: createId('device') };
  await SecureStore.setItemAsync(DEVICE_KEY, JSON.stringify(identity), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return identity;
}

export async function loadAccountSession(): Promise<AccountSession | null> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;
  const parsed = sessionSchema.safeParse(JSON.parse(stored));
  return parsed.success ? parsed.data : null;
}

export async function saveAccountSession(session: AccountSession) {
  const value = sessionSchema.parse(session);
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(value), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function clearAccountSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
