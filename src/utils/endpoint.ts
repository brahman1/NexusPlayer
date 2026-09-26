export function endpointForDisplay(endpoint: string | null) {
  if (!endpoint) return '';
  if (!/^https?:\/\//i.test(endpoint)) return 'Fichier local';

  try {
    const url = new URL(endpoint);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return 'Adresse distante';
  }
}
