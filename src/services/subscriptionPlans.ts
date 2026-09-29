import type { SubscriptionEntitlement, SubscriptionPlan, SubscriptionPlanId } from '../types/account';

export const subscriptionPlans: Record<SubscriptionPlanId, SubscriptionPlan> = {
  free: { ads: true, cloudSync: false, id: 'free', maxConcurrentStreams: 1, maxDevices: 1, maxProfiles: 1, maxSources: 1 },
  premium: { ads: false, cloudSync: true, id: 'premium', maxConcurrentStreams: 1, maxDevices: 3, maxProfiles: 1, maxSources: null },
  family: { ads: false, cloudSync: true, id: 'family', maxConcurrentStreams: 3, maxDevices: 6, maxProfiles: 5, maxSources: null },
  'local-lifetime': { ads: false, cloudSync: false, id: 'local-lifetime', maxConcurrentStreams: 1, maxDevices: 1, maxProfiles: 1, maxSources: null },
};

const planAliases: Record<string, SubscriptionPlanId> = {
  free: 'free',
  premium: 'premium',
  plus: 'premium',
  family: 'family',
  local: 'local-lifetime',
  lifetime: 'local-lifetime',
  'local-lifetime': 'local-lifetime',
};

export function entitlementPlan(entitlement: SubscriptionEntitlement | null, now = new Date()): SubscriptionPlan {
  if (!entitlement?.active) return subscriptionPlans.free;
  if (entitlement.expiresAt && new Date(entitlement.expiresAt).getTime() <= now.getTime()) return subscriptionPlans.free;
  const id = entitlement.plan ? planAliases[entitlement.plan.toLowerCase()] : undefined;
  const base = subscriptionPlans[id ?? 'free'];
  return {
    ...base,
    maxConcurrentStreams: entitlement.maxConcurrentStreams ?? base.maxConcurrentStreams,
    maxDevices: entitlement.maxDevices > 0 ? entitlement.maxDevices : base.maxDevices,
  };
}

export function canRegisterDevice(entitlement: SubscriptionEntitlement | null, registeredDevices: number) {
  return registeredDevices < entitlementPlan(entitlement).maxDevices;
}

export function isCloudPlan(entitlement: SubscriptionEntitlement | null) {
  return entitlementPlan(entitlement).cloudSync;
}
