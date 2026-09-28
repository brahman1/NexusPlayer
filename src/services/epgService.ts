import { ungzip } from 'pako';
import { replaceEpg } from '../repositories/EpgRepository';
import { readHttpValidators } from './httpValidators';
import { parseXmltv } from './xmltvParser';
import { translate } from '../i18n';

const MAX_EPG_BYTES = 50 * 1024 * 1024;

export async function importXmltv(playlistId: string, endpoint: string, signal?: AbortSignal) {
  const response = await fetch(endpoint, { signal, headers: { Accept: 'application/xml, text/xml, application/gzip' } });
  if (!response.ok) throw new Error(translate(`Le guide TV a répondu avec le statut ${response.status}.`, `The TV guide responded with status ${response.status}.`));
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_EPG_BYTES) throw new Error(translate('Le guide TV dépasse la taille maximale de 50 Mo.', 'The TV guide exceeds the maximum size of 50 MB.'));
  const gzip = endpoint.toLowerCase().endsWith('.gz') || response.headers.get('content-encoding') === 'gzip' || (bytes[0] === 0x1f && bytes[1] === 0x8b);
  const xml = new TextDecoder().decode(gzip ? ungzip(bytes) : bytes);
  const programmes = parseXmltv(xml);
  if (programmes.length === 0) throw new Error(translate('Aucun programme XMLTV valide trouvé.', 'No valid XMLTV program found.'));
  await replaceEpg(playlistId, endpoint, programmes, readHttpValidators(response.headers));
  return programmes.length;
}
