export type HttpValidators = {
  etag: string | null;
  lastModified: string | null;
};

type HeaderReader = Pick<Headers, 'get'>;

function usable(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function createConditionalHeaders(validators?: Partial<HttpValidators>) {
  const headers: Record<string, string> = {};
  const etag = usable(validators?.etag);
  const lastModified = usable(validators?.lastModified);

  if (etag) headers['If-None-Match'] = etag;
  if (lastModified) headers['If-Modified-Since'] = lastModified;
  return headers;
}

export function readHttpValidators(
  headers: HeaderReader,
  fallback?: Partial<HttpValidators>,
): HttpValidators {
  return {
    etag: usable(headers.get('etag')) ?? usable(fallback?.etag),
    lastModified: usable(headers.get('last-modified')) ?? usable(fallback?.lastModified),
  };
}
