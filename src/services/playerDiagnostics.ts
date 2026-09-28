import { translate } from '../i18n';

export type PlaybackProblem = {
  title: string;
  detail: string;
};

export function explainPlaybackError(message?: string | null): PlaybackProblem {
  const normalized = message?.toLowerCase() ?? '';

  if (/\b(401|403)\b|unauthori[sz]ed|forbidden|access denied/.test(normalized)) {
    return {
      title: translate('Accès au flux refusé', 'Stream access denied'),
      detail: translate('La source a refusé cette chaîne. Actualisez la playlist ou vérifiez votre abonnement autorisé.', 'The source denied this channel. Refresh the playlist or check your authorized subscription.'),
    };
  }
  if (/\b404\b|not found|introuvable/.test(normalized)) {
    return {
      title: translate('Flux introuvable', 'Stream not found'),
      detail: translate('Cette adresse n’est plus disponible. Essayez une autre chaîne ou actualisez la source.', 'This address is no longer available. Try another channel or refresh the source.'),
    };
  }
  if (/timeout|timed out|délai|temps d’attente/.test(normalized)) {
    return {
      title: translate('Le serveur met trop de temps à répondre', 'The server is taking too long to respond'),
      detail: translate('Vérifiez la connexion, puis réessayez. Le catalogue local reste disponible.', 'Check your connection, then try again. The local catalog remains available.'),
    };
  }
  if (/codec|decoder|format|unsupported|not supported/.test(normalized)) {
    return {
      title: translate('Format vidéo non compatible', 'Unsupported video format'),
      detail: translate('Ce flux utilise un format que cet appareil ne sait pas décoder.', 'This stream uses a format this device cannot decode.'),
    };
  }
  if (/network|connection|dns|host|socket|offline|internet/.test(normalized)) {
    return {
      title: translate('Connexion au flux impossible', 'Unable to connect to stream'),
      detail: translate('Vérifiez le réseau de l’appareil et la disponibilité du serveur, puis réessayez.', 'Check the device network and server availability, then try again.'),
    };
  }
  return {
    title: translate('Lecture impossible', 'Playback failed'),
    detail: translate('Le flux n’a pas pu démarrer. Réessayez ou passez à une autre chaîne.', 'The stream could not start. Try again or switch to another channel.'),
  };
}
