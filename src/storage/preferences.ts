import { createMMKV, type MMKV } from 'react-native-mmkv';

const ACTIVE_PLAYLIST_KEY = 'activePlaylistId';
const LANGUAGE_KEY = 'language';
const LAST_CHANNEL_PREFIX = 'lastFocusedChannel.';
const LAST_PLAYING_CHANNEL_KEY = 'playback.lastPlayingChannel';
const HIGH_CONTRAST_KEY = 'accessibility.highContrast';
const REDUCE_MOTION_KEY = 'accessibility.reduceMotion';
const TEXT_SCALE_KEY = 'accessibility.textScale';
const SUBTITLE_SIZE_KEY = 'subtitles.size';
const VIDEO_CONTENT_FIT_KEY = 'playback.contentFit';
const PLAYBACK_ENGINE_PREFIX = 'playback.engine.';
const AUTO_SYNC_INTERVAL_KEY = 'sources.autoSyncIntervalHours';
const CONTENT_COUNTRIES_KEY = 'content.preferredCountries';
const CONTENT_LANGUAGES_KEY = 'content.preferredLanguages';
const CONTENT_THEMES_KEY = 'content.preferredThemes';
const RAW_CATEGORIES_KEY = 'content.showRawCategories';
const CATEGORY_OVERRIDES_KEY = 'content.categoryLabelOverrides';

export type AutoSyncIntervalHours = 0 | 1 | 6 | 12 | 24;
const AUTO_SYNC_INTERVALS: readonly AutoSyncIntervalHours[] = [0, 1, 6, 12, 24];

let storage: MMKV | null = null;

function getStorage() {
  if (!storage) {
    storage = createMMKV({ id: 'nexusplayer.preferences' });
  }

  return storage;
}

function readStringArray(key: string) {
  try {
    const value = JSON.parse(getStorage().getString(key) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

function readStringRecord(key: string) {
  try {
    const value = JSON.parse(getStorage().getString(key) ?? '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, string> : {};
  } catch { return {}; }
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
  getLanguage: (): 'fr' | 'en' => getStorage().getString(LANGUAGE_KEY) === 'en' ? 'en' : 'fr',
  setLanguage: (language: 'fr' | 'en') => getStorage().set(LANGUAGE_KEY, language),
  getLastFocusedChannel: (playlistId: string) =>
    getStorage().getString(`${LAST_CHANNEL_PREFIX}${playlistId}`) ?? null,
  setLastFocusedChannel: (playlistId: string, channelId: string) =>
    getStorage().set(`${LAST_CHANNEL_PREFIX}${playlistId}`, channelId),
  getLastPlayingChannel: () => getStorage().getString(LAST_PLAYING_CHANNEL_KEY) ?? null,
  setLastPlayingChannel: (channelId: string) => getStorage().set(LAST_PLAYING_CHANNEL_KEY, channelId),
  getHighContrast: () => getStorage().getBoolean(HIGH_CONTRAST_KEY) ?? false,
  setHighContrast: (enabled: boolean) => getStorage().set(HIGH_CONTRAST_KEY, enabled),
  getReduceMotion: () => getStorage().getBoolean(REDUCE_MOTION_KEY) ?? false,
  setReduceMotion: (enabled: boolean) => getStorage().set(REDUCE_MOTION_KEY, enabled),
  getTextScale: () => getStorage().getNumber(TEXT_SCALE_KEY) ?? 1,
  setTextScale: (scale: number) => getStorage().set(TEXT_SCALE_KEY, scale),
  getSubtitleSize: () => getStorage().getNumber(SUBTITLE_SIZE_KEY) ?? 1,
  setSubtitleSize: (scale: number) => getStorage().set(SUBTITLE_SIZE_KEY, scale),
  getVideoContentFit: (): 'contain' | 'cover' | 'fill' => {
    const value = getStorage().getString(VIDEO_CONTENT_FIT_KEY);
    return value === 'cover' || value === 'fill' ? value : 'contain';
  },
  setVideoContentFit: (value: 'contain' | 'cover' | 'fill') => getStorage().set(VIDEO_CONTENT_FIT_KEY, value),
  getPlaybackEngine: (key: string): 'native' | 'vlc' | null => {
    const value = getStorage().getString(`${PLAYBACK_ENGINE_PREFIX}${key}`);
    return value === 'native' || value === 'vlc' ? value : null;
  },
  setPlaybackEngine: (key: string, value: 'native' | 'vlc') => getStorage().set(`${PLAYBACK_ENGINE_PREFIX}${key}`, value),
  getAutoSyncIntervalHours: (): AutoSyncIntervalHours => {
    const value = getStorage().getNumber(AUTO_SYNC_INTERVAL_KEY);
    return AUTO_SYNC_INTERVALS.includes(value as AutoSyncIntervalHours)
      ? value as AutoSyncIntervalHours
      : 6;
  },
  setAutoSyncIntervalHours: (value: AutoSyncIntervalHours) =>
    getStorage().set(AUTO_SYNC_INTERVAL_KEY, value),
  getPreferredCountries: () => readStringArray(CONTENT_COUNTRIES_KEY),
  setPreferredCountries: (values: string[]) => getStorage().set(CONTENT_COUNTRIES_KEY, JSON.stringify([...new Set(values)])),
  getPreferredLanguages: () => readStringArray(CONTENT_LANGUAGES_KEY),
  setPreferredLanguages: (values: string[]) => getStorage().set(CONTENT_LANGUAGES_KEY, JSON.stringify([...new Set(values)])),
  getPreferredThemes: () => readStringArray(CONTENT_THEMES_KEY),
  setPreferredThemes: (values: string[]) => getStorage().set(CONTENT_THEMES_KEY, JSON.stringify([...new Set(values)])),
  getShowRawCategories: () => getStorage().getBoolean(RAW_CATEGORIES_KEY) ?? false,
  setShowRawCategories: (value: boolean) => getStorage().set(RAW_CATEGORIES_KEY, value),
  getCategoryLabelOverrides: () => readStringRecord(CATEGORY_OVERRIDES_KEY),
  setCategoryLabelOverride: (key: string, label: string | null) => {
    const values = readStringRecord(CATEGORY_OVERRIDES_KEY);
    if (label?.trim()) values[key] = label.trim();
    else delete values[key];
    getStorage().set(CATEGORY_OVERRIDES_KEY, JSON.stringify(values));
  },
};
