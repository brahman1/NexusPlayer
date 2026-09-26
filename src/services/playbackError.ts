export type PlaybackErrorInfo = { title: string; detail: string };

export function describePlaybackError(message?: string | null): PlaybackErrorInfo {
  const value = message ?? '';
  if (/MediaCodecVideoRenderer/i.test(value) && /(video\/hevc|hvc1|hevc)/i.test(value)) {
    const is4k = /3840\s*,\s*2160|3840x2160/i.test(value);
    return {
      title: 'Format vidéo non pris en charge',
      detail: is4k
        ? 'Cette vidéo est encodée en HEVC/H.265 4K 10 bits. Le décodeur de cet appareil ou de cet émulateur ne prend pas en charge ce profil. Utilisez une version H.264/1080p ou testez-la sur un appareil compatible HEVC 10 bits.'
        : 'Cette vidéo est encodée en HEVC/H.265, mais aucun décodeur compatible n’est disponible sur cet appareil. Utilisez une version H.264 ou testez-la sur un appareil compatible HEVC.',
    };
  }
  if (/MediaCodecVideoRenderer|DecoderInitializationException/i.test(value)) {
    return { title: 'Décodage vidéo impossible', detail: 'Le format ou la qualité de cette vidéo dépasse les capacités de cet appareil. Essayez une version de qualité inférieure ou un autre appareil.' };
  }
  if (/response code:\s*40[13]|\b40[13]\b/i.test(value)) {
    return { title: 'Accès au flux refusé', detail: 'Le fournisseur a refusé l’accès à cette vidéo. Vérifiez que votre abonnement et cette source sont toujours actifs.' };
  }
  if (/response code:\s*404|\b404\b/i.test(value)) {
    return { title: 'Vidéo indisponible', detail: 'Le fichier demandé n’existe plus sur le serveur de la source.' };
  }
  return { title: 'Lecture impossible', detail: 'Le lecteur n’a pas pu ouvrir cette vidéo. Essayez à nouveau ou testez un autre contenu de la même source.' };
}
