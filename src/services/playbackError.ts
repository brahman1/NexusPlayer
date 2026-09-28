import { translate } from '../i18n';

export type PlaybackErrorInfo = { title: string; detail: string };

export function describePlaybackError(message?: string | null): PlaybackErrorInfo {
  const value = message ?? '';
  if (/MediaCodecVideoRenderer/i.test(value) && /(video\/hevc|hvc1|hevc)/i.test(value)) {
    const is4k = /3840\s*,\s*2160|3840x2160/i.test(value);
    return {
      title: translate('Format vidéo non pris en charge', 'Unsupported video format'),
      detail: is4k
        ? translate('Cette vidéo est encodée en HEVC/H.265 4K 10 bits. Le décodeur de cet appareil ou de cet émulateur ne prend pas en charge ce profil. Utilisez une version H.264/1080p ou testez-la sur un appareil compatible HEVC 10 bits.', 'This video is encoded in 10-bit 4K HEVC/H.265. This device or emulator cannot decode that profile. Use an H.264/1080p version or a device that supports 10-bit HEVC.')
        : translate('Cette vidéo est encodée en HEVC/H.265, mais aucun décodeur compatible n’est disponible sur cet appareil. Utilisez une version H.264 ou testez-la sur un appareil compatible HEVC.', 'This video is encoded in HEVC/H.265, but no compatible decoder is available on this device. Use an H.264 version or a HEVC-compatible device.'),
    };
  }
  if (/MediaCodecVideoRenderer|DecoderInitializationException/i.test(value)) {
    return { title: translate('Décodage vidéo impossible', 'Unable to decode video'), detail: translate('Le format ou la qualité de cette vidéo dépasse les capacités de cet appareil. Essayez une version de qualité inférieure ou un autre appareil.', 'This video format or quality exceeds this device’s capabilities. Try a lower-quality version or another device.') };
  }
  if (/response code:\s*40[13]|\b40[13]\b/i.test(value)) {
    return { title: translate('Accès au flux refusé', 'Stream access denied'), detail: translate('Le fournisseur a refusé l’accès à cette vidéo. Vérifiez que votre abonnement et cette source sont toujours actifs.', 'The provider denied access to this video. Check that your subscription and source are still active.') };
  }
  if (/response code:\s*404|\b404\b/i.test(value)) {
    return { title: translate('Vidéo indisponible', 'Video unavailable'), detail: translate('Le fichier demandé n’existe plus sur le serveur de la source.', 'The requested file no longer exists on the source server.') };
  }
  return { title: translate('Lecture impossible', 'Playback failed'), detail: translate('Le lecteur n’a pas pu ouvrir cette vidéo. Essayez à nouveau ou testez un autre contenu de la même source.', 'The player could not open this video. Try again or test other content from the same source.') };
}
