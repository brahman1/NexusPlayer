type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeCatalogInvalidation(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function invalidateCatalogData() {
  for (const listener of listeners) listener();
}
