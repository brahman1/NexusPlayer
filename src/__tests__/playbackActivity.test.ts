import { PlaybackActivity, reachedSeekTarget } from '../services/playbackActivity';

describe('playback activity', () => {
  it('ignores late buffering notifications while the stream advances', () => {
    const activity = new PlaybackActivity();
    activity.playing(0);
    activity.progress(10, 0);
    activity.progress(11, 1000);
    activity.buffering(0);
    expect(activity.isBuffering(1500)).toBe(false);
    activity.progress(12, 2000);
    expect(activity.isBuffering(2500)).toBe(false);
  });
  it('shows a genuine stall even if identical timestamps keep arriving', () => {
    const activity = new PlaybackActivity();
    activity.progress(10, 0);
    activity.progress(11, 1000);
    activity.buffering(20);
    activity.progress(11, 2400);
    expect(activity.isBuffering(2600)).toBe(true);
    activity.progress(12, 2700);
    expect(activity.isBuffering(2700)).toBe(false);
  });
  it('keeps seeking until a timestamp near the requested keyframe arrives', () => {
    expect(reachedSeekTarget(60, 900)).toBe(false);
    expect(reachedSeekTarget(898, 900)).toBe(true);
    expect(reachedSeekTarget(NaN, 900)).toBe(false);
  });
});
