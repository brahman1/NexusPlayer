export const MAX_LIVE_RECONNECT_ATTEMPTS = 4;

const DELAYS_MS = [1_000, 2_000, 4_000, 8_000] as const;

export function liveReconnectDelay(attempt: number) {
  return DELAYS_MS[Math.min(Math.max(attempt, 0), DELAYS_MS.length - 1)] ?? 8_000;
}

export function isRecoverableLiveError(message?: string | null) {
  const value = message?.toLowerCase() ?? '';
  if (/\b(401|403|404)\b|unauthori[sz]ed|forbidden|not found|access denied/.test(value)) return false;
  if (/codec|decoder|format|unsupported|not supported/.test(value)) return false;
  return true;
}
