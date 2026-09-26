import { describePlaybackError } from '../services/playbackError';

describe('erreurs de lecture compréhensibles', () => {
  it('identifie un flux HEVC 4K incompatible', () => {
    const result = describePlaybackError('MediaCodecVideoRenderer error, format=Format(1, null, video/x-matroska, video/hevc, hvc1.2.4.H150.B0, -1, en, [3840, 2160, -1.0, null])');
    expect(result.title).toBe('Format vidéo non pris en charge');
    expect(result.detail).toContain('HEVC/H.265 4K 10 bits');
  });

  it('explique un refus du serveur sans exposer le message technique', () => {
    expect(describePlaybackError('InvalidResponseCodeException: Response code: 403').title).toBe('Accès au flux refusé');
  });

  it('utilise un message générique pour une erreur inconnue', () => {
    expect(describePlaybackError('unknown').title).toBe('Lecture impossible');
  });
});
