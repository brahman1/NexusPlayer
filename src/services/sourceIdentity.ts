import { stableId } from '../utils/ids';

export function normalizeRemoteEndpoint(endpoint: string) {
  const url = new URL(endpoint.trim());
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = '';

  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }

  const sortedParameters = [...url.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
  );
  url.search = '';
  for (const [key, value] of sortedParameters) url.searchParams.append(key, value);

  return url.toString();
}

export function fingerprintRemoteEndpoint(endpoint: string) {
  return stableId('source', normalizeRemoteEndpoint(endpoint));
}

export function fingerprintLocalContent(content: string) {
  return stableId('source', content);
}
