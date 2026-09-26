import { ungzip } from 'pako';
import { replaceEpg } from '../repositories/EpgRepository';
import { readHttpValidators } from './httpValidators';
import { parseXmltv } from './xmltvParser';

const MAX_EPG_BYTES = 50 * 1024 * 1024;

export async function importXmltv(playlistId: string, endpoint: string, signal?: AbortSignal) {
  const response = await fetch(endpoint, { signal, headers: { Accept: 'application/xml, text/xml, application/gzip' } });
  if (!response.ok) throw new Error(`Le guide TV a répondu avec le statut ${response.status}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_EPG_BYTES) throw new Error('Le guide TV dépasse la taille maximale de 50 Mo.');
  const gzip = endpoint.toLowerCase().endsWith('.gz') || response.headers.get('content-encoding') === 'gzip' || (bytes[0] === 0x1f && bytes[1] === 0x8b);
  const xml = new TextDecoder().decode(gzip ? ungzip(bytes) : bytes);
  const programmes = parseXmltv(xml);
  if (programmes.length === 0) throw new Error('Aucun programme XMLTV valide trouvé.');
  await replaceEpg(playlistId, endpoint, programmes, readHttpValidators(response.headers));
  return programmes.length;
}
