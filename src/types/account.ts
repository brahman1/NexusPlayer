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
  maxConcurrentStreams?: number;
  plan: string | null;
  provider: 'app-store' | 'play-store' | 'manual' | null;
};

export type SubscriptionPlanId = 'free' | 'premium' | 'family' | 'local-lifetime';

export type SubscriptionPlan = {
  ads: boolean;
  cloudSync: boolean;
  id: SubscriptionPlanId;
  maxConcurrentStreams: number;
  maxDevices: number;
  maxProfiles: number;
  maxSources: number | null;
};
