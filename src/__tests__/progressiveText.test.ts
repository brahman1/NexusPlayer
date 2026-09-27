import { readResponseTextProgressively } from '../services/progressiveText';

describe('téléchargement texte progressif', () => {
  it('recompose les caractères UTF-8 séparés entre plusieurs blocs', async () => {
    const bytes = new TextEncoder().encode('#EXTM3U\n#EXTINF:-1,Météo\nhttps://test/live');
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes.slice(0, 20)); controller.enqueue(bytes.slice(20)); controller.close(); } });
    await expect(readResponseTextProgressively(new Response(body), 1024)).resolves.toContain('Météo');
  });

  it('annule dès que la limite est dépassée', async () => {
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(8)); controller.close(); } });
    await expect(readResponseTextProgressively(new Response(body), 4)).rejects.toThrow('taille maximale');
  });
});
