import { act, render } from '@testing-library/react-native';
import { AdaptiveVideoPlayer } from '../components/AdaptiveVideoPlayer';
import { NativeTrackedVideoPlayer } from '../components/NativeTrackedVideoPlayer';
import { TrackedVideoPlayer } from '../components/TrackedVideoPlayer';

jest.mock('../components/NativeTrackedVideoPlayer', () => ({ NativeTrackedVideoPlayer: jest.fn(() => null) }));
jest.mock('../components/TrackedVideoPlayer', () => ({ TrackedVideoPlayer: jest.fn(() => null) }));
jest.mock('../storage/preferences', () => ({ preferences: { getPlaybackEngine: () => null, setPlaybackEngine: jest.fn() } }));

it('switches once at the last confirmed position rather than the original resume point', async () => {
  const view = await render(<AdaptiveVideoPlayer mediaId="movie" mediaKind="movie" name="Film" resumeSeconds={120} uri="https://example.test/film.mp4" />);
  const native = jest.mocked(NativeTrackedVideoPlayer).mock.calls.at(-1)![0];
  await act(async () => { native.onProgress?.(750); native.onFatalError?.('decode error'); native.onFatalError?.('duplicate error'); });
  const vlc = jest.mocked(TrackedVideoPlayer).mock.calls.at(-1)![0];
  expect(vlc.resumeSeconds).toBe(750);
  await act(async () => { vlc.onReady?.(); vlc.onFatalError?.('failed again'); });
  expect(jest.mocked(TrackedVideoPlayer).mock.calls.at(-1)![0].resumeSeconds).toBe(750);
  expect(jest.mocked(NativeTrackedVideoPlayer).mock.calls).toHaveLength(1);
  await view.unmount();
});
