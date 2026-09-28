import { translate } from '../i18n';

export function describeSourceError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/App Transport Security|secure connection/i.test(message)) {
    return translate('iOS bloque les serveurs HTTP dans cette version de l’application. Installez le nouveau Development Build de NexusPlayer, puis réessayez.', 'iOS blocks HTTP servers in this version of the app. Install the new NexusPlayer Development Build, then try again.');
  }
  if (/Network request failed|fetch failed|could not connect|offline/i.test(message)) {
    return translate('Connexion au serveur impossible. Vérifiez l’adresse, le réseau et la disponibilité de la source.', 'Unable to connect to the server. Check the address, network and source availability.');
  }
  if (/abort/i.test(message)) return translate('Import annulé.', 'Import canceled.');
  return error instanceof Error ? error.message : translate('Une erreur inattendue est survenue.', 'An unexpected error occurred.');
}
