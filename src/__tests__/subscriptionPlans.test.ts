import { canRegisterDevice, entitlementPlan, isCloudPlan, subscriptionPlans } from '../services/subscriptionPlans';

it('uses the ad-supported free plan without an active entitlement', () => {
  expect(entitlementPlan(null)).toEqual(subscriptionPlans.free);
  expect(canRegisterDevice(null, 1)).toBe(false);
});

it('resolves a valid premium entitlement and server device limits', () => {
  const plan = entitlementPlan({ active: true, expiresAt: '2027-01-01T00:00:00.000Z', maxDevices: 5, maxConcurrentStreams: 2, plan: 'plus', provider: 'app-store' }, new Date('2026-01-01T00:00:00.000Z'));
  expect(plan.id).toBe('premium');
  expect(plan.maxDevices).toBe(5);
  expect(plan.maxConcurrentStreams).toBe(2);
  expect(isCloudPlan({ active: true, expiresAt: null, maxDevices: 3, plan: 'premium', provider: 'manual' })).toBe(true);
});

it('falls back to free after expiration', () => {
  const plan = entitlementPlan({ active: true, expiresAt: '2025-12-31T23:59:59.000Z', maxDevices: 6, plan: 'family', provider: 'play-store' }, new Date('2026-01-01T00:00:00.000Z'));
  expect(plan.id).toBe('free');
});
