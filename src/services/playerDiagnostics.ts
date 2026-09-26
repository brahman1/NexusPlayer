export type PlaybackProblem = {
  title: string;
  detail: string;
};

export function explainPlaybackError(message?: string | null): PlaybackProblem {
  const normalized = message?.toLowerCase() ?? '';

  if (/\b(401|403)\b|unauthori[sz]ed|forbidden|access denied/.test(normalized)) {
    return {
      title: 'Accès au flux refusé',
      detail: 'La source a refusé cette chaîne. Actualisez la playlist ou vérifiez votre abonnement autorisé.',
    };
  }
  if (/\b404\b|not found|introuvable/.test(normalized)) {
    return {
      title: 'Flux introuvable',
      detail: 'Cette adresse n’est plus disponible. Essayez une autre chaîne ou actualisez la source.',
    };
  }
  if (/timeout|timed out|délai|temps d’attente/.test(normalized)) {
    return {
      title: 'Le serveur met trop de temps à répondre',
      detail: 'Vérifiez la connexion, puis réessayez. Le catalogue local reste disponible.',
    };
  }
  if (/codec|decoder|format|unsupported|not supported/.test(normalized)) {
    return {
      title: 'Format vidéo non compatible',
      detail: 'Ce flux utilise un format que cet appareil ne sait pas décoder.',
    };
  }
  if (/network|connection|dns|host|socket|offline|internet/.test(normalized)) {
    return {
      title: 'Connexion au flux impossible',
      detail: 'Vérifiez le réseau de l’appareil et la disponibilité du serveur, puis réessayez.',
    };
  }
  return {
    title: 'Lecture impossible',
    detail: 'Le flux n’a pas pu démarrer. Réessayez ou passez à une autre chaîne.',
  };
}
