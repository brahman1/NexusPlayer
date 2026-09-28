import { Platform } from 'react-native';

import { getOrCreateDeviceIdentity, loadAccountSession } from '../storage/accountVault';
import type { RegisteredDevice, SubscriptionEntitlement } from '../types/account';

type Fetcher = typeof fetch;

export class SubscriptionClient {
  constructor(private readonly baseUrl: string, private readonly fetcher: Fetcher = fetch) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const session = await loadAccountSession();
    if (!session) throw new Error('Connexion au compte requise.');
    const response = await this.fetcher(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: { Accept: 'application/json', Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json', ...init?.headers },
    });
    if (response.status === 401) throw new Error('La session a expiré. Reconnectez-vous.');
    if (!response.ok) throw new Error('Le service d’abonnement est momentanément indisponible.');
    return response.json() as Promise<T>;
  }

  async registerCurrentDevice(label: string) {
    const identity = await getOrCreateDeviceIdentity();
    return this.request<RegisteredDevice>('/v1/devices', {
      body: JSON.stringify({ installationId: identity.installationId, label, platform: Platform.OS }),
      method: 'POST',
    });
  }

  entitlement() {
    return this.request<SubscriptionEntitlement>('/v1/entitlement');
  }

  devices() {
    return this.request<RegisteredDevice[]>('/v1/devices');
  }

  removeDevice(deviceId: string) {
    return this.request<void>(`/v1/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
  }
}

export function configuredSubscriptionClient() {
  const url = process.env.EXPO_PUBLIC_NEXUS_API_URL?.trim();
  return url ? new SubscriptionClient(url) : null;
}
