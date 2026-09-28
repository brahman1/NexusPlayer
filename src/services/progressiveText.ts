import { translate } from '../i18n';

export async function readResponseTextProgressively(response: Response, maxBytes: number) {
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error(translate('Le téléchargement dépasse la taille maximale autorisée.', 'The download exceeds the maximum allowed size.'));
    return new TextDecoder().decode(bytes);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new Error(translate('Le téléchargement dépasse la taille maximale autorisée.', 'The download exceeds the maximum allowed size.'));
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join('');
  } finally {
    reader.releaseLock();
  }
}
