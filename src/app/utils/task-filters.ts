import { Task } from '../models/task.model';
import { isInTodayFilter } from './due-date';

/**
 * Tryb energii (US-07):
 * - 'off'    – bez trybu, widać wszystko (domyślny),
 * - 'rested' – "Mam siłę": ukrywa zadania oznaczone jako lekkie,
 * - 'tired'  – "Jestem wypruty": ukrywa zadania oznaczone jako ciężkie.
 */
export type EnergyMode = 'off' | 'rested' | 'tired';

export const ENERGY_LABELS: Record<EnergyMode, string> = {
  off: 'Bez trybu',
  rested: 'Mam siłę',
  tired: 'Jestem wypruty',
};

export interface TaskFilters {
  /** id kategorii; null = wszystkie. */
  categoryId: string | null;
  /** Filtr "Dziś" (na dziś + zaległe). */
  todayOnly: boolean;
  /** Filtr "Do przejrzenia": tylko NIEUKOŃCZONE zadania z flagą (B-4). */
  reviewOnly?: boolean;
  /** Tryb energii; brak = 'off'. */
  energy?: EnergyMode;
}

/** Czy jakikolwiek filtr zawęża listę (do wyboru komunikatu pustej listy). */
export function hasActiveFilters(filters: TaskFilters): boolean {
  return (
    filters.categoryId !== null ||
    filters.todayOnly ||
    !!filters.reviewOnly ||
    (filters.energy ?? 'off') !== 'off'
  );
}

/** Czy tryb energii pokazuje zadanie. Zaległe i dzisiejsze są zawsze widoczne (US-08). */
export function matchesEnergy(task: Task, energy: EnergyMode, now: Date): boolean {
  if (energy === 'off' || !task.difficulty) return true; // nieoznaczone nigdy nie są ukrywane
  if (isInTodayFilter(task, now)) return true; // ta sama definicja co filtr "Dziś"
  return energy === 'tired' ? task.difficulty !== 'heavy' : task.difficulty !== 'light';
}

/** Czy zadanie jest widoczne przy danych filtrach. Wszystkie filtry łączą się przez AND. */
export function matchesFilters(task: Task, filters: TaskFilters, now: Date): boolean {
  if (filters.categoryId && task.categoryId !== filters.categoryId) return false;
  if (filters.todayOnly && !isInTodayFilter(task, now)) return false;
  if (filters.reviewOnly && (!task.needsReview || task.completed)) return false;
  if (!matchesEnergy(task, filters.energy ?? 'off', now)) return false;
  return true;
}

/** Komunikat pustej listy aktywnych zadań (B-2). */
export interface EmptyMessage {
  title: string;
  hint?: string;
}

/**
 * Pierwszeństwo komunikatów, gdy lista aktywnych jest pusta (B-2, EC-02):
 * 1. bez filtrów: "Wszystko zrobione" (są ukończone) albo "Brak zadań / Dodaj pierwsze",
 * 2. tylko "Dziś" (z kategorią lub bez): dotychczasowy komunikat o dziś i zaległych,
 * 3. tylko "Do przejrzenia": "Brak zadań do przejrzenia",
 * 4. każda inna kombinacja: "Brak zadań pasujących do filtrów" + lista aktywnych filtrów.
 * Przy aktywnym filtrze nigdy nie mówimy "Wszystko zrobione" – filtr mógł ukryć niezrobione zadania.
 */
export function emptyListMessage(
  filters: TaskFilters,
  categoryName: string | null,
  hasCompleted: boolean,
): EmptyMessage {
  const energy = filters.energy ?? 'off';
  if (!hasActiveFilters(filters)) {
    return hasCompleted
      ? { title: 'Wszystko zrobione 🎉' }
      : { title: 'Brak zadań', hint: 'Dodaj pierwsze zadanie powyżej.' };
  }
  if (filters.todayOnly && !filters.reviewOnly && energy === 'off') {
    const inCategory = categoryName ? ` w kategorii „${categoryName}”` : '';
    return { title: `Brak zadań na dziś ani zaległych${inCategory}` };
  }
  if (filters.reviewOnly && !filters.todayOnly && energy === 'off' && !filters.categoryId) {
    return { title: 'Brak zadań do przejrzenia' };
  }
  const names = [
    categoryName ? `kategoria „${categoryName}”` : null,
    filters.todayOnly ? 'Dziś' : null,
    filters.reviewOnly ? 'Do przejrzenia' : null,
    energy !== 'off' ? ENERGY_LABELS[energy] : null,
  ].filter((n): n is string => n !== null);
  return { title: 'Brak zadań pasujących do filtrów', hint: `Aktywne filtry: ${names.join(', ')}` };
}
