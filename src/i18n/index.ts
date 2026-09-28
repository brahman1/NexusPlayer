import { useCallback, useSyncExternalStore } from 'react';

export type AppLanguage = 'fr' | 'en';

let currentLanguage: AppLanguage = 'fr';
const listeners = new Set<() => void>();

export function initializeAppLanguage(language: AppLanguage) {
  currentLanguage = language;
}

export function getAppLanguage() {
  return currentLanguage;
}

export function setAppLanguage(language: AppLanguage) {
  if (language === currentLanguage) return;
  currentLanguage = language;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function translate(french: string, english: string) {
  return currentLanguage === 'en' ? english : french;
}

export function useI18n() {
  const language = useSyncExternalStore(subscribe, getAppLanguage, getAppLanguage);
  const tx = useCallback((french: string, english: string) => language === 'en' ? english : french, [language]);
  return { language, setLanguage: setAppLanguage, tx };
}
