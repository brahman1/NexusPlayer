export type AccountSession = {
  accessToken: string;
  expiresAt: string;
  userId: string;
};

export type DeviceIdentity = {
  createdAt: string;
  installationId: string;
};

export type RegisteredDevice = {
  id: string;
  installationId: string;
  label: string;
  lastSeenAt: string;
  platform: string;
};

export type SubscriptionEntitlement = {
  active: boolean;
  expiresAt: string | null;
  maxDevices: number;
  plan: string | null;
  provider: 'app-store' | 'play-store' | 'manual' | null;
};
