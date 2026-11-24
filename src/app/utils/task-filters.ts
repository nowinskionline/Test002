import { Task } from '../models/task.model';
import { isInTodayFilter } from './due-date';

export interface TaskFilters {
  /** id kategorii; null = wszystkie. */
  categoryId: string | null;
  /** Filtr "Dziś" (na dziś + zaległe). */
  todayOnly: boolean;
}

/** Czy zadanie jest widoczne przy danych filtrach. Filtry łączą się (kategoria ORAZ "Dziś"). */
export function matchesFilters(task: Task, filters: TaskFilters, now: Date): boolean {
  if (filters.categoryId && task.categoryId !== filters.categoryId) return false;
  if (filters.todayOnly && !isInTodayFilter(task, now)) return false;
  return true;
}
