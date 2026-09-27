export function describeSourceError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/App Transport Security|secure connection/i.test(message)) {
    return 'iOS bloque les serveurs HTTP dans cette version de l’application. Installez le nouveau Development Build de NexusPlayer, puis réessayez.';
  }
  if (/Network request failed|fetch failed|could not connect|offline/i.test(message)) {
    return 'Connexion au serveur impossible. Vérifiez l’adresse, le réseau et la disponibilité de la source.';
  }
  if (/abort/i.test(message)) return 'Import annulé.';
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}
