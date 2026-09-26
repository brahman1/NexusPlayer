import { createMMKV, type MMKV } from 'react-native-mmkv';

const ACTIVE_PLAYLIST_KEY = 'activePlaylistId';
const LANGUAGE_KEY = 'language';
const LAST_CHANNEL_PREFIX = 'lastFocusedChannel.';
const HIGH_CONTRAST_KEY = 'accessibility.highContrast';
const REDUCE_MOTION_KEY = 'accessibility.reduceMotion';
const TEXT_SCALE_KEY = 'accessibility.textScale';
const SUBTITLE_SIZE_KEY = 'subtitles.size';

let storage: MMKV | null = null;

function getStorage() {
  if (!storage) {
    storage = createMMKV({ id: 'nexusplayer.preferences' });
  }

  return storage;
}

export const preferences = {
  getActivePlaylistId: () => getStorage().getString(ACTIVE_PLAYLIST_KEY) ?? null,
  setActivePlaylistId: (playlistId: string | null) => {
    if (playlistId) {
      getStorage().set(ACTIVE_PLAYLIST_KEY, playlistId);
      return;
    }

    getStorage().remove(ACTIVE_PLAYLIST_KEY);
  },
  getLanguage: () => getStorage().getString(LANGUAGE_KEY) ?? 'fr',
  setLanguage: (language: 'fr' | 'en') => getStorage().set(LANGUAGE_KEY, language),
  getLastFocusedChannel: (playlistId: string) =>
    getStorage().getString(`${LAST_CHANNEL_PREFIX}${playlistId}`) ?? null,
  setLastFocusedChannel: (playlistId: string, channelId: string) =>
    getStorage().set(`${LAST_CHANNEL_PREFIX}${playlistId}`, channelId),
  getHighContrast: () => getStorage().getBoolean(HIGH_CONTRAST_KEY) ?? false,
  setHighContrast: (enabled: boolean) => getStorage().set(HIGH_CONTRAST_KEY, enabled),
  getReduceMotion: () => getStorage().getBoolean(REDUCE_MOTION_KEY) ?? false,
  setReduceMotion: (enabled: boolean) => getStorage().set(REDUCE_MOTION_KEY, enabled),
  getTextScale: () => getStorage().getNumber(TEXT_SCALE_KEY) ?? 1,
  setTextScale: (scale: number) => getStorage().set(TEXT_SCALE_KEY, scale),
  getSubtitleSize: () => getStorage().getNumber(SUBTITLE_SIZE_KEY) ?? 1,
  setSubtitleSize: (scale: number) => getStorage().set(SUBTITLE_SIZE_KEY, scale),
};
