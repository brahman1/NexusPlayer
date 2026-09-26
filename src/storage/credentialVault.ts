import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

import type { SourceCredentials } from '../types/domain';

const credentialSchema = z.union([
  z.object({
    username: z.string(),
    password: z.string(),
  }),
  z.object({
    macAddress: z.string(),
    token: z.string().optional(),
  }),
]);

function keyFor(sourceId: string) {
  return `nexusplayer.source.${sourceId}.credentials`;
}

export async function saveCredentials(sourceId: string, credentials: SourceCredentials) {
  await SecureStore.setItemAsync(keyFor(sourceId), JSON.stringify(credentials), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadCredentials(sourceId: string): Promise<SourceCredentials | null> {
  const stored = await SecureStore.getItemAsync(keyFor(sourceId));
  if (!stored) {
    return null;
  }

  return credentialSchema.parse(JSON.parse(stored));
}

export async function deleteCredentials(sourceId: string) {
  await SecureStore.deleteItemAsync(keyFor(sourceId));
}
