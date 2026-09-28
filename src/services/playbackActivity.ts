// Progress takes precedence over buffering events: VLC can report both together.
export class PlaybackActivity {
  private position: number | null = null;
  private advancedAt = -Infinity;
  private bufferingRequested = true;

  buffering(value: number) { this.bufferingRequested = value < 100; }
  playing(now: number) { this.advancedAt = now; this.bufferingRequested = false; }
  progress(seconds: number, now: number) {
    if (!Number.isFinite(seconds)) return false;
    const advanced = this.position !== null && seconds !== this.position;
    this.position = seconds;
    if (advanced) this.advancedAt = now;
    return advanced;
  }
  isBuffering(now: number) { return this.bufferingRequested && now - this.advancedAt > 1500; }
}

export function reachedSeekTarget(position: number, target: number) {
  return Number.isFinite(position) && Math.abs(position - target) <= 3;
}
