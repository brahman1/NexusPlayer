import { explainPlaybackError } from '../services/playerDiagnostics';

describe('diagnostic de lecture', () => {
  it.each([
    ['HTTP 403 forbidden', 'Accès au flux refusé'],
    ['HTTP 404 not found', 'Flux introuvable'],
    ['network socket failed', 'Connexion au flux impossible'],
    ['decoder unsupported codec', 'Format vidéo non compatible'],
    ['request timed out', 'Le serveur met trop de temps à répondre'],
    [undefined, 'Lecture impossible'],
  ])('traduit %s en message compréhensible', (message, expectedTitle) => {
    expect(explainPlaybackError(message).title).toBe(expectedTitle);
  });
});
