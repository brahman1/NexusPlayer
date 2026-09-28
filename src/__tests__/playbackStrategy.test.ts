import { alternateEngine, engineOrder, liveMarkerCandidates, mediaExtension, playbackPreferenceKey, redactPlaybackUri } from '../services/playbackStrategy';

describe('playback strategy', () => {
  it('selects the native engine for standard adaptive and MP4 media', () => {
    expect(engineOrder('https://media.test/live/1.m3u8', 'live')).toEqual(['native', 'vlc']);
    expect(engineOrder('https://media.test/movie/1.mp4', 'movie')).toEqual(['native', 'vlc']);
  });

  it('selects VLC first for transport streams and unusual containers', () => {
    expect(engineOrder('https://media.test/live/1.ts', 'live')).toEqual(['vlc', 'native']);
    expect(engineOrder('https://media.test/movie/1.mkv', 'movie')).toEqual(['vlc', 'native']);
  });

  it('honours a remembered engine while retaining one fallback', () => {
    expect(engineOrder('https://media.test/movie/1.mp4', 'movie', 'vlc')).toEqual(['vlc', 'native']);
    expect(alternateEngine('native')).toBe('vlc');
  });

  it('builds platform-specific live variants without exposing credentials', () => {
    expect(liveMarkerCandidates('xtream://live/42.ts', 'ios')).toEqual(['xtream://live/42.m3u8', 'xtream://live/42.ts']);
    expect(liveMarkerCandidates('xtream://live/42.m3u8', 'android')).toEqual(['xtream://live/42.ts', 'xtream://live/42.m3u8']);
    const uri = 'http://example.test/live/private-user/private-password/42.ts?token=secret';
    expect(redactPlaybackUri(uri)).toBe('http://example.test/…/42.ts');
    expect(playbackPreferenceKey(uri, 'live', 'ios')).toBe('ios:live:example.test');
    expect(mediaExtension(uri)).toBe('ts');
  });
});
