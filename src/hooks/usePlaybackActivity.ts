import { useCallback, useEffect, useRef, useState } from 'react';
import { PlaybackActivity } from '../services/playbackActivity';

export function usePlaybackActivity() {
  const activity = useRef(new PlaybackActivity());
  const [buffering, setBuffering] = useState(true);
  useEffect(() => {
    const timer = setInterval(() => setBuffering(activity.current.isBuffering(Date.now())), 500);
    return () => clearInterval(timer);
  }, []);
  const onBuffering = useCallback((value: number) => {
    activity.current.buffering(value);
    if (value >= 100) setBuffering(false);
  }, []);
  const onPlaying = useCallback(() => { activity.current.playing(Date.now()); setBuffering(false); }, []);
  const onProgress = useCallback((seconds: number) => {
    const advanced = activity.current.progress(seconds, Date.now());
    if (advanced) setBuffering(false);
    return advanced;
  }, []);
  return { buffering, onBuffering, onPlaying, onProgress };
}
