import { SubscriptionClient } from '../services/subscriptionClient';
import { getOrCreateDeviceIdentity, loadAccountSession } from '../storage/accountVault';

jest.mock('../storage/accountVault', () => ({ getOrCreateDeviceIdentity: jest.fn(), loadAccountSession: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(loadAccountSession).mockResolvedValue({ accessToken: 'secret-token', expiresAt: '2030-01-01T00:00:00.000Z', userId: 'user' });
});

it('registers a generated installation id and never sends a MAC address', async () => {
  jest.mocked(getOrCreateDeviceIdentity).mockResolvedValue({ createdAt: '2026-01-01T00:00:00.000Z', installationId: 'device_123456789' });
  const fetcher = jest.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'one' }), { status: 200 }));
  const client = new SubscriptionClient('https://api.example.test/', fetcher);
  await client.registerCurrentDevice('Salon');
  const [, init] = fetcher.mock.calls[0]!;
  expect(init.body).toContain('device_123456789');
  expect(init.body).not.toMatch(/mac/i);
  expect(init.headers.Authorization).toBe('Bearer secret-token');
});

it('requires a signed-in account before contacting the backend', async () => {
  jest.mocked(loadAccountSession).mockResolvedValue(null);
  const fetcher = jest.fn();
  await expect(new SubscriptionClient('https://api.example.test', fetcher).entitlement()).rejects.toThrow('Connexion');
  expect(fetcher).not.toHaveBeenCalled();
});
