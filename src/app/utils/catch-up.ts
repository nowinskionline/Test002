import { Task } from '../models/task.model';
import { isOverdue, isToday } from './due-date';

/** Ile zadań panel "Ogarnij zaległe" pokazuje od razu (decyzja P1.3). */
export const CATCH_UP_LIMIT = 3;

export interface CatchUp {
  /** Pierwsze 3 zadania – od nich zaczynasz. */
  top: Task[];
  /** Pozostałe kwalifikujące się zadania (rozwijane "+X więcej"). */
  rest: Task[];
  /** Ile kwalifikujących się zadań jest w INNYCH kategoriach (gdy działa filtr kategorii, EC-11). */
  elsewhere: number;
}

/** Kandydat do panelu: nieukończone zadanie z terminem dziś albo wcześniej. */
export function isCatchUpCandidate(task: Task, now: Date): boolean {
  return !task.completed && (isToday(task, now) || isOverdue(task, now));
}

/**
 * Wybór zadań do panelu "Ogarnij zaległe" (US-11, US-12).
 * Bez punktacji i bez sortowania: kolejność = ręczna kolejność listy (`tasks`).
 * Respektuje tylko filtr kategorii; tryb energii, "Dziś" i "Do przejrzenia" są ignorowane (Q-06).
 * Czysta funkcja – niczego nie zapisuje i nie zmienia.
 */
export function pickCatchUp(tasks: readonly Task[], categoryId: string | null, now: Date): CatchUp {
  const candidates = tasks.filter((t) => isCatchUpCandidate(t, now));
  const inCategory = categoryId
    ? candidates.filter((t) => t.categoryId === categoryId)
    : candidates;
  return {
    top: inCategory.slice(0, CATCH_UP_LIMIT),
    rest: inCategory.slice(CATCH_UP_LIMIT),
    elsewhere: candidates.length - inCategory.length,
  };
}
