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

/** Zwraca false, gdy zapis się nie udał (brak miejsca lub zablokowany storage). */
export function saveJson(key: string, value: unknown): boolean {
  return saveRaw(key, JSON.stringify(value));
}

/** Surowy tekst spod klucza (bez parsowania); null, gdy brak albo storage niedostępny. */
export function loadRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // Aplikacja działa dalej, tylko bez zapisu – wywołujący decyduje, czy pokazać komunikat.
    return false;
  }
}

/** crypto.randomUUID działa tylko w "bezpiecznym kontekście" (https/localhost), stąd zapasowy wariant. */
export function createId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}
