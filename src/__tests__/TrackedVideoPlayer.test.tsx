import { act, fireEvent, render } from '@testing-library/react-native';
import { LibVlcPlayerView, type LibVlcPlayerViewProps } from 'expo-libvlc-player';
import { TrackedVideoPlayer } from '../components/TrackedVideoPlayer';

const mockSeek = jest.fn().mockResolvedValue(undefined);
const mockPlay = jest.fn();
const mockSave = jest.fn().mockResolvedValue(undefined);
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-screen-orientation', () => ({ unlockAsync: jest.fn().mockResolvedValue(undefined), lockAsync: jest.fn(), OrientationLock: { LANDSCAPE: 1 } }));
jest.mock('@react-native-community/slider', () => 'Slider');
jest.mock('../repositories/WatchProgressRepository', () => ({ WatchProgressRepository: jest.fn().mockImplementation(() => ({ save: (...args: unknown[]) => mockSave(...args), clear: jest.fn().mockResolvedValue(undefined) })) }));
jest.mock('expo-libvlc-player', () => ({
  LibVlcPlayerView: jest.fn(function MockVlc(props) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useImperativeHandle(props.ref, () => ({ seek: mockSeek, play: mockPlay, stop: jest.fn() }));
    return null;
  }),
}));
const events = () => jest.mocked(LibVlcPlayerView).mock.calls.at(-1)![0] as LibVlcPlayerViewProps;

describe('VLC seek coordination', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
  afterEach(() => jest.useRealTimers());
  it('coalesces taps, ignores stale timestamps and saves only the confirmed target', async () => {
    const view = await render(<TrackedVideoPlayer mediaId="film" mediaKind="movie" name="Film" resumeSeconds={0} uri="https://example.test/movie.mp4" />);
    await act(async () => { events().onFirstPlay?.({ media: { length: 1000000, seekable: true } } as never); events().onTimeChanged?.({ value: 60000 }); });
    mockSave.mockClear();
    await fireEvent.press(view.getByLabelText('+30 s'));
    await fireEvent.press(view.getByLabelText('+30 s'));
    await act(async () => { jest.advanceTimersByTime(150); });
    expect(mockSeek).toHaveBeenCalledTimes(1);
    expect(mockSeek).toHaveBeenCalledWith(0.12, 'position');
    expect(mockPlay).not.toHaveBeenCalled();
    await act(async () => { events().onTimeChanged?.({ value: 61000 }); });
    expect(mockSave).not.toHaveBeenCalled();
    await act(async () => { events().onTimeChanged?.({ value: 120000 }); });
    expect(mockSave).toHaveBeenCalledWith('film', 'movie', 120, 1000);
    await view.unmount();
  });
  it('does not treat a buffering/playing event as proof that the seek completed', async () => {
    const view = await render(<TrackedVideoPlayer mediaId="film" mediaKind="movie" name="Film" resumeSeconds={0} uri="https://example.test/movie.mp4" />);
    await act(async () => { events().onFirstPlay?.({ media: { length: 1000000, seekable: true } } as never); });
    await fireEvent.press(view.getByLabelText('+30 s'));
    await act(async () => { jest.advanceTimersByTime(150); });
    await act(async () => { events().onPlaying?.(); events().onBuffering?.({ value: 100 }); jest.advanceTimersByTime(8000); });
    expect(view.getByText(/position demandée n’a pas été confirmée/)).toBeTruthy();
    await view.unmount();
  });
});
