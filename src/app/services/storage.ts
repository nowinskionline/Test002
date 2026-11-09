/**
 * Bezpieczny odczyt z localStorage: uszkodzony JSON, zablokowany storage
 * (np. tryb prywatny) albo dane w złym kształcie zwracają wartość domyślną.
 */
export function loadJson<T>(key: string, fallback: T, isValid: (value: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Brak miejsca lub zablokowany storage – aplikacja działa dalej, tylko bez zapisu.
  }
}

/** crypto.randomUUID działa tylko w "bezpiecznym kontekście" (https/localhost), stąd zapasowy wariant. */
export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
