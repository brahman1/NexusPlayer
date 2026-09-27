import { isRecoverableLiveError, liveReconnectDelay, MAX_LIVE_RECONNECT_ATTEMPTS } from '../services/liveReconnect';

describe('reconnexion du direct', () => {
  it('applique une temporisation progressive et plafonnée', () => {
    expect(Array.from({ length: MAX_LIVE_RECONNECT_ATTEMPTS }, (_, attempt) => liveReconnectDelay(attempt))).toEqual([1_000, 2_000, 4_000, 8_000]);
    expect(liveReconnectDelay(99)).toBe(8_000);
  });

  it.each(['network unavailable', 'socket closed', 'request timed out', undefined])('réessaie une panne temporaire : %s', (message) => {
    expect(isRecoverableLiveError(message)).toBe(true);
  });

  it.each(['HTTP 403 forbidden', '404 not found', 'unsupported codec'])('ne boucle pas sur une panne permanente : %s', (message) => {
    expect(isRecoverableLiveError(message)).toBe(false);
  });
});
