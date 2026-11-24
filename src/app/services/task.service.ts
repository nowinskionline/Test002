import { computed, Injectable, signal } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import {
  Category,
  CategoryColor,
  DEFAULT_CATEGORIES,
  Difficulty,
  Task,
} from '../models/task.model';
import {
  compareByDue,
  isDifficulty,
  isValidDueDate,
  isValidDueTime,
  normalizeTask,
} from '../utils/due-date';
import { createId, loadJson, loadRaw, saveJson, saveRaw } from './storage';

export const TASKS_KEY = 'todoartur.tasks';
export const TASKS_BACKUP_KEY = 'todoartur.tasks.backup';
export const CATEGORIES_KEY = 'todoartur.categories';

/** Powód odrzucenia zmiany – komponent zamienia go na komunikat dla użytkownika. */
export type TaskError =
  | 'empty-title'
  | 'unknown-category'
  | 'invalid-date'
  | 'invalid-time'
  | 'time-without-date'
  | 'invalid-difficulty'
  | 'not-found';

export type TaskResult = { ok: true; task: Task } | { ok: false; error: TaskError };

/** Termin przy dodawaniu: brak / null / '' = bez terminu. */
export interface DueInput {
  dueDate?: string | null;
  dueTime?: string | null;
}

/**
 * Zmiany w updateTask (kontrakt K-02):
 * brak klucza = bez zmian, `dueDate: null` = usuń termin (razem z godziną), `dueTime: null` = usuń godzinę.
 */
export interface TaskChanges {
  title?: string;
  categoryId?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  /** `null` = zdejmij oznaczenie trudności. */
  difficulty?: Difficulty | null;
}

/** Dodatkowe, opcjonalne cechy nowego zadania. */
export interface NewTaskOptions {
  /** null/brak = nieoznaczone. */
  difficulty?: Difficulty | null;
  /** true tylko dla szybkiego wrzutu. */
  needsReview?: boolean;
}

/** Kategoria, do której trafia szybki wrzut (Q-01). */
export const QUICK_ADD_CATEGORY_ID = 'inne';

export const TASK_ERROR_MESSAGES: Record<TaskError, string> = {
  'empty-title': 'Treść zadania nie może być pusta.',
  'unknown-category': 'Wybrana kategoria nie istnieje.',
  'invalid-date': 'Nieprawidłowa data. Wybierz istniejący dzień z lat 1900–2100.',
  'invalid-time': 'Nieprawidłowa godzina.',
  'time-without-date': 'Godzina wymaga wybrania daty.',
  'invalid-difficulty': 'Nieprawidłowa trudność zadania.',
  'not-found': 'Nie znaleziono zadania.',
};

/**
 * Jedyne źródło prawdy o zadaniach i kategoriach.
 * Stan trzymany w sygnałach; każda zmiana od razu zapisuje się do localStorage.
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  // Kategorie wczytujemy przed zadaniami, bo normalizacja zadań z nich korzysta.
  private readonly _categories = signal<Category[]>(
    loadJson(CATEGORIES_KEY, DEFAULT_CATEGORIES, (v) => Array.isArray(v) && v.length > 0),
  );
  private readonly _tasks = signal<Task[]>(loadTasks(this._categories()));

  /** true, gdy ostatni zapis do localStorage się nie udał (baner w app.html). */
  readonly saveFailed = signal(false);

  /** Publicznie tylko do odczytu – zmiany wyłącznie przez metody serwisu. */
  readonly tasks = this._tasks.asReadonly();
  readonly categories = this._categories.asReadonly();

  readonly activeCount = computed(() => this._tasks().filter((t) => !t.completed).length);
  readonly completedCount = computed(() => this._tasks().filter((t) => t.completed).length);

  /** Licznik "Do przejrzenia": nieukończone zadania z flagą, we wszystkich kategoriach (Q-08). */
  readonly reviewCount = computed(
    () => this._tasks().filter((t) => t.needsReview && !t.completed).length,
  );

  readonly categoryById = computed(() => new Map(this._categories().map((c) => [c.id, c])));

  readonly taskCountByCategory = computed(() => {
    const counts = new Map<string, number>();
    for (const t of this._tasks()) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
    return counts;
  });

  // ---------- Zadania ----------

  addTask(
    title: string,
    categoryId: string,
    due: DueInput = {},
    { difficulty = null, needsReview = false }: NewTaskOptions = {},
  ): TaskResult {
    const trimmed = title.trim();
    if (!trimmed) return { ok: false, error: 'empty-title' };
    if (!this.categoryById().has(categoryId)) return { ok: false, error: 'unknown-category' };
    if (difficulty !== null && !isDifficulty(difficulty)) {
      return { ok: false, error: 'invalid-difficulty' };
    }

    const dueResult = checkDue(due.dueDate || undefined, due.dueTime || undefined);
    if (typeof dueResult === 'string') return { ok: false, error: dueResult };

    // Klucze opcjonalne dodajemy tylko wtedy, gdy mają wartość (bez `null`/`false` w localStorage).
    const task: Task = {
      id: createId(),
      title: trimmed,
      categoryId,
      completed: false,
      createdAt: Date.now(),
      ...dueResult,
      ...(needsReview ? { needsReview: true as const } : {}),
      ...(difficulty ? { difficulty } : {}),
    };
    // Nowe zadanie ląduje na górze listy (także z terminem – termin nigdy nie sortuje sam).
    this.setTasks((tasks) => [task, ...tasks]);
    return { ok: true, task };
  }

  /**
   * Szybki wrzut (US-02): sam tytuł, flaga "do przejrzenia", kategoria "Inne".
   * Gdy "Inne" (id `inne`) usunięto: kategoria o nazwie "Inne", a w ostateczności pierwsza istniejąca.
   */
  addQuickTask(title: string): TaskResult {
    const cats = this._categories();
    const category =
      cats.find((c) => c.id === QUICK_ADD_CATEGORY_ID) ??
      cats.find((c) => c.name.trim().toLowerCase() === 'inne') ??
      cats[0];
    return this.addTask(title, category?.id ?? '', {}, { needsReview: true });
  }

  /** Przycisk "OK": zdejmuje flagę, nic więcej nie zmienia (ani kategorii, ani terminu, ani kolejności). */
  dismissReview(id: string): void {
    const current = this._tasks().find((t) => t.id === id);
    if (!current?.needsReview) return; // brak flagi = brak zapisu
    const { needsReview: _flag, ...rest } = current;
    this.setTasks((tasks) => tasks.map((t) => (t.id === id ? rest : t)));
  }

  /** Nieprawidłowa wartość odrzuca CAŁĄ zmianę (także tytuł), a zadanie zostaje bez zmian. */
  updateTask(id: string, changes: TaskChanges): TaskResult {
    const current = this._tasks().find((t) => t.id === id);
    if (!current) return { ok: false, error: 'not-found' };

    const title = changes.title !== undefined ? changes.title.trim() : current.title;
    if (!title) return { ok: false, error: 'empty-title' };

    const categoryId = changes.categoryId ?? current.categoryId;
    if (changes.categoryId !== undefined && !this.categoryById().has(categoryId)) {
      return { ok: false, error: 'unknown-category' };
    }

    // null = usuń, undefined = zostaw jak było. Usunięcie daty usuwa też godzinę.
    const dueDate =
      changes.dueDate === undefined ? current.dueDate : (changes.dueDate ?? undefined);
    let dueTime = changes.dueTime === undefined ? current.dueTime : (changes.dueTime ?? undefined);
    if (changes.dueDate === null && changes.dueTime === undefined) dueTime = undefined;

    const dueResult = checkDue(dueDate, dueTime);
    if (typeof dueResult === 'string') return { ok: false, error: dueResult };

    // Trudność: brak klucza = bez zmian, null = zdejmij oznaczenie.
    if (changes.difficulty != null && !isDifficulty(changes.difficulty)) {
      return { ok: false, error: 'invalid-difficulty' };
    }
    const difficulty =
      changes.difficulty === undefined ? current.difficulty : (changes.difficulty ?? undefined);

    // Flaga znika sama, gdy zadanie zostało uzupełnione (US-04, B-3):
    // kategoria INNA niż przed zapisem albo termin, którego przed zapisem nie było.
    // Zmiana tytułu, trudności czy terminu na inny termin flagi nie zdejmuje.
    const completedReview =
      categoryId !== current.categoryId || (!current.dueDate && dueResult.dueDate !== undefined);
    const needsReview = current.needsReview && !completedReview;

    // Budujemy zadanie od nowa bez starych pól opcjonalnych, żeby w localStorage nie zostały klucze z null.
    const {
      dueDate: _oldDate,
      dueTime: _oldTime,
      needsReview: _oldFlag,
      difficulty: _oldDifficulty,
      ...rest
    } = current;
    const updated: Task = {
      ...rest,
      title,
      categoryId,
      ...dueResult,
      ...(needsReview ? { needsReview: true as const } : {}),
      ...(difficulty ? { difficulty } : {}),
    };
    this.setTasks((tasks) => tasks.map((t) => (t.id === id ? updated : t)));
    return { ok: true, task: updated };
  }

  toggleTask(id: string): void {
    this.setTasks((tasks) =>
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  }

  /** Zwraca usunięte zadanie i jego pozycję, żeby dało się je przywrócić ("Cofnij"). */
  deleteTask(id: string): { task: Task; index: number } | null {
    const index = this._tasks().findIndex((t) => t.id === id);
    if (index === -1) return null;
    const task = this._tasks()[index];
    this.setTasks((tasks) => tasks.filter((t) => t.id !== id));
    return { task, index };
  }

  restoreTask(task: Task, index: number): void {
    if (this._tasks().some((t) => t.id === task.id)) return;
    this.setTasks((tasks) => {
      const copy = [...tasks];
      copy.splice(Math.min(index, copy.length), 0, task);
      return copy;
    });
  }

  /**
   * Przeciąganie odbywa się na przefiltrowanej liście (np. tylko "Praca").
   * Zmieniamy kolejność widocznych zadań, a pozostałe zostają na swoich miejscach.
   */
  reorder(visibleIds: string[], fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    const reordered = [...visibleIds];
    moveItemInArray(reordered, fromIndex, toIndex);
    this.placeInSlots(reordered);
  }

  /**
   * Jednorazowa akcja "Ułóż po terminie" na widocznych zadaniach.
   * Zwraca poprzednią kolejność tych id (do "Cofnij") albo null, gdy nic się nie zmieniło.
   */
  sortByDue(visibleIds: string[]): string[] | null {
    const byId = new Map(this._tasks().map((t) => [t.id, t]));
    const before = visibleIds.filter((id) => byId.has(id));
    // sort w JS jest stabilny: remisy zachowują dotychczasową kolejność.
    const after = [...before].sort((a, b) => compareByDue(byId.get(a)!, byId.get(b)!));
    if (after.every((id, i) => id === before[i])) return null;
    this.placeInSlots(after);
    return before;
  }

  /**
   * "Cofnij" dla "Ułóż po terminie": przestawia tylko te zadania, które akcja ruszyła,
   * z powrotem w dawnej kolejności. Zadania dodane w międzyczasie zostają, gdzie są,
   * a usunięte w międzyczasie są pomijane.
   */
  restoreOrder(previousIds: string[]): void {
    const existing = new Set(this._tasks().map((t) => t.id));
    this.placeInSlots(previousIds.filter((id) => existing.has(id)));
  }

  /**
   * Wspólna technika dla reorder/sortByDue/restoreOrder: miejsca ("sloty") zajęte przez zadania
   * z `orderedIds` wypełniamy tymi samymi zadaniami w kolejności `orderedIds`. Reszta stoi w miejscu.
   */
  private placeInSlots(orderedIds: string[]): void {
    const ids = new Set(orderedIds);
    const byId = new Map(this._tasks().map((t) => [t.id, t]));
    let next = 0;
    this.setTasks((tasks) => tasks.map((t) => (ids.has(t.id) ? byId.get(orderedIds[next++])! : t)));
  }

  // ---------- Kategorie ----------

  addCategory(name: string, color: CategoryColor): Category | null {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const exists = this._categories().some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return null;

    const category: Category = { id: createId(), name: trimmed, color };
    this.setCategories((cats) => [...cats, category]);
    return category;
  }

  /** Kategorię można usunąć tylko, gdy nie ma w niej zadań i nie jest ostatnią. */
  canDeleteCategory(id: string): boolean {
    return this._categories().length > 1 && !this.taskCountByCategory().get(id);
  }

  deleteCategory(id: string): boolean {
    if (!this.canDeleteCategory(id)) return false;
    this.setCategories((cats) => cats.filter((c) => c.id !== id));
    return true;
  }

  // ---------- Zapis ----------

  private setTasks(fn: (tasks: Task[]) => Task[]): void {
    this._tasks.update(fn);
    this.saveFailed.set(!saveJson(TASKS_KEY, this._tasks()));
  }

  private setCategories(fn: (cats: Category[]) => Category[]): void {
    this._categories.update(fn);
    this.saveFailed.set(!saveJson(CATEGORIES_KEY, this._categories()));
  }
}

/** Sprawdza termin; zwraca kod błędu albo obiekt z polami do wstawienia (bez kluczy, gdy brak). */
function checkDue(
  dueDate: string | undefined,
  dueTime: string | undefined,
): TaskError | { dueDate?: string; dueTime?: string } {
  if (dueTime !== undefined && dueDate === undefined) return 'time-without-date';
  if (dueDate !== undefined && !isValidDueDate(dueDate)) return 'invalid-date';
  if (dueTime !== undefined && !isValidDueTime(dueTime)) return 'invalid-time';
  return {
    ...(dueDate !== undefined ? { dueDate } : {}),
    ...(dueTime !== undefined ? { dueTime } : {}),
  };
}

/**
 * Wczytuje zadania odpornie na uszkodzone dane (US-03, K-06):
 * - każdy element przechodzi przez normalizeTask, śmieci są pomijane,
 * - zdublowane id dostają nowe id (inaczej przeciąganie "gubiłoby" jedno zadanie),
 * - nieznana kategoria → pierwsza istniejąca.
 * Wynik żyje tylko w pamięci; do `todoartur.tasks` nic nie zapisujemy do pierwszej zmiany.
 * Jeśli normalizacja cokolwiek zmieniła, zachowujemy oryginał w kopii zapasowej,
 * żeby pierwszy zapis nie skasował danych bez śladu.
 */
export function loadTasks(categories: Category[]): Task[] {
  const raw = loadRaw(TASKS_KEY);
  if (raw === null) return [];

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Uszkodzony JSON – traktujemy jak brak danych (oryginał trafi do kopii poniżej).
  }

  const categoryIds = new Set(categories.map((c) => c.id));
  const seenIds = new Set<string>();
  const tasks: Task[] = [];
  for (const item of Array.isArray(parsed) ? parsed : []) {
    const task = normalizeTask(item);
    if (!task) continue;
    if (seenIds.has(task.id)) task.id = createId();
    seenIds.add(task.id);
    if (!categoryIds.has(task.categoryId)) task.categoryId = categories[0]?.id ?? '';
    tasks.push(task);
  }

  // Porównanie semantyczne (B-1): kolejność kluczy w obiekcie nie ma znaczenia,
  // a `needsReview: false` znaczy to samo co brak flagi. Dzięki temu poprawne dane
  // nie tworzą kopii przy każdym starcie i nie nadpisują prawdziwej kopii po uszkodzeniu.
  const original = Array.isArray(parsed) ? parsed.map(dropFalseFlag) : parsed;
  if (canonicalJson(tasks) !== canonicalJson(original)) saveRaw(TASKS_BACKUP_KEY, raw);
  return tasks;
}

/** JSON z kluczami obiektów posortowanymi alfabetycznie – do porównań niezależnych od kolejności. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

/** `needsReview: false` nie jest uszkodzeniem (EC-01b) – usuwamy go tylko na potrzeby porównania. */
function dropFalseFlag(item: unknown): unknown {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return item;
  if ((item as Record<string, unknown>)['needsReview'] !== false) return item;
  const { needsReview: _flag, ...rest } = item as Record<string, unknown>;
  return rest;
}
