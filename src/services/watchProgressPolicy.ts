export function shouldKeepProgress(positionSeconds: number, durationSeconds: number) {
  return Number.isFinite(positionSeconds)
    && Number.isFinite(durationSeconds)
    && durationSeconds > 0
    && positionSeconds >= 10
    && positionSeconds / durationSeconds < 0.95
    && durationSeconds - positionSeconds > 20;
}
