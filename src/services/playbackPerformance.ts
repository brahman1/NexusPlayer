export type PlaybackLaunchStage = 'catalog-ready' | 'media-ready' | 'url-ready' | 'engine-ready' | 'first-progress';

export type PlaybackLaunchSummary = {
  kind: 'movie' | 'episode';
  resumeRequested: boolean;
  stagesMs: Partial<Record<PlaybackLaunchStage, number>>;
};

const clock = () => globalThis.performance?.now?.() ?? Date.now();

/** Measures startup without retaining media ids, titles, credentials or URLs. */
export class PlaybackLaunchTrace {
  private readonly startedAt = clock();
  private readonly stages = new Map<PlaybackLaunchStage, number>();

  private resumeRequested = false;

  constructor(private readonly kind: 'movie' | 'episode') {}

  setResumeRequested(value: boolean) {
    this.resumeRequested = value;
  }

  mark(stage: PlaybackLaunchStage) {
    if (!this.stages.has(stage)) this.stages.set(stage, Math.round(clock() - this.startedAt));
  }

  summary(): PlaybackLaunchSummary {
    return {
      kind: this.kind,
      resumeRequested: this.resumeRequested,
      stagesMs: Object.fromEntries(this.stages) as PlaybackLaunchSummary['stagesMs'],
    };
  }

  report() {
    if (__DEV__) console.info('[NexusPlayer playback]', this.summary());
  }
}
