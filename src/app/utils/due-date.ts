import { Task } from '../models/task.model';

/**
 * Wspólny moduł czasu dla terminów zadań.
 * Tylko tutaj liczymy "dziś", "jutro" i zaległości – reszta aplikacji woła te funkcje.
 * Każda funkcja dostaje `now` jako parametr, więc w testach łatwo podstawić dowolną chwilę.
 *
 * Ważne: daty porównujemy jako tekst "YYYY-MM-DD" w LOKALNEJ strefie przeglądarki.
 * Nie używamy `new Date("2026-11-24")`, bo taki zapis jest czytany jako UTC
 * i np. w Los Angeles dałby poprzedni dzień. Nie liczymy też różnicy 24 h (zmiana czasu!).
 */

const MIN_DATE = '1900-01-01';
const MAX_DATE = '2100-12-31';
const WEEKDAYS = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];

type Due = Pick<Task, 'dueDate' | 'dueTime'>;

/** "2026-11-24" – istniejąca data kalendarzowa z zakresu 1900–2100. */
export function isValidDueDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (value < MIN_DATE || value > MAX_DATE) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  // 2026-02-31 "przeskoczy" na 3 marca – wtedy data nie istnieje.
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** "09:30" – godzina 00:00–23:59. */
export function isValidDueTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Klucz lokalnego dnia, np. "2026-11-24". */
export function toLocalDateKey(now: Date): string {
  const y = String(now.getFullYear()).padStart(4, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Klucz dnia przesuniętego o `days` (konstruktor Date sam ogarnia koniec miesiąca i zmianę czasu). */
function shiftDateKey(now: Date, days: number): string {
  return toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
}

export function isToday(task: Due, now: Date): boolean {
  return isValidDueDate(task.dueDate) && task.dueDate === toLocalDateKey(now);
}

/** Zaległe = nieukończone i termin przed dzisiejszym dniem. Godzina nie ma znaczenia. */
export function isOverdue(task: Due & Pick<Task, 'completed'>, now: Date): boolean {
  return !task.completed && isValidDueDate(task.dueDate) && task.dueDate < toLocalDateKey(now);
}

/**
 * Czy zadanie pasuje do filtra "Dziś":
 * - nieukończone: termin dziś albo wcześniej (zaległe),
 * - ukończone: tylko termin dokładnie dziś (ukończone z przeszłości nie wracają do "Dziś").
 */
export function isInTodayFilter(task: Due & Pick<Task, 'completed'>, now: Date): boolean {
  if (task.completed) return isToday(task, now);
  return isToday(task, now) || isOverdue(task, now);
}

/** Tekst terminu: "dziś", "jutro 09:30", "sb 28.11", "pt 15.01.2027". Bez terminu – pusty tekst. */
export function formatDue(task: Due, now: Date): string {
  if (!isValidDueDate(task.dueDate)) return '';
  const key = task.dueDate;
  let text: string;
  if (key === toLocalDateKey(now)) text = 'dziś';
  else if (key === shiftDateKey(now, 1)) text = 'jutro';
  else if (key === shiftDateKey(now, -1)) text = 'wczoraj';
  else {
    const [y, m, d] = key.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
    const dayMonth = `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
    text = y === now.getFullYear() ? `${weekday} ${dayMonth}` : `${weekday} ${dayMonth}.${y}`;
  }
  return isValidDueTime(task.dueTime) ? `${text} ${task.dueTime}` : text;
}

/**
 * Komparator do "Ułóż po terminie": data rosnąco; w tej samej dacie najpierw z godziną
 * (rosnąco), potem bez godziny; zadania bez terminu na końcu. Remis = 0, więc stabilne
 * `Array.prototype.sort` zachowuje dotychczasową kolejność.
 */
export function compareByDue(a: Due, b: Due): number {
  const aDate = isValidDueDate(a.dueDate) ? a.dueDate : null;
  const bDate = isValidDueDate(b.dueDate) ? b.dueDate : null;
  if (aDate !== bDate) {
    if (aDate === null) return 1;
    if (bDate === null) return -1;
    return aDate < bDate ? -1 : 1;
  }
  const aTime = isValidDueTime(a.dueTime) ? a.dueTime : null;
  const bTime = isValidDueTime(b.dueTime) ? b.dueTime : null;
  if (aTime === bTime) return 0;
  if (aTime === null) return 1;
  if (bTime === null) return -1;
  return aTime < bTime ? -1 : 1;
}

/**
 * Zamienia dowolną wartość wczytaną z localStorage na poprawne zadanie albo null.
 * Wymagane: niepusty tekstowy `id` i `title`. Pozostałe pola dostają bezpieczne wartości domyślne,
 * a uszkodzony termin jest po prostu pomijany.
 */
export function normalizeTask(raw: unknown): Task | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r['id'] !== 'string' || !r['id']) return null;
  if (typeof r['title'] !== 'string' || !r['title'].trim()) return null;

  const task: Task = {
    id: r['id'],
    title: r['title'],
    categoryId: typeof r['categoryId'] === 'string' ? r['categoryId'] : '',
    completed: r['completed'] === true,
    createdAt:
      typeof r['createdAt'] === 'number' && Number.isFinite(r['createdAt']) ? r['createdAt'] : 0,
  };
  if (isValidDueDate(r['dueDate'])) {
    task.dueDate = r['dueDate'];
    // Godzina tylko przy poprawnej dacie.
    if (isValidDueTime(r['dueTime'])) task.dueTime = r['dueTime'];
  }
  return task;
}
