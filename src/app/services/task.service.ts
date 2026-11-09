import { computed, Injectable, signal } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { Category, CategoryColor, DEFAULT_CATEGORIES, Task } from '../models/task.model';
import { createId, loadJson, saveJson } from './storage';

export const TASKS_KEY = 'taskflow.tasks';
export const CATEGORIES_KEY = 'taskflow.categories';

/**
 * Jedyne źródło prawdy o zadaniach i kategoriach.
 * Stan trzymany w sygnałach; każda zmiana od razu zapisuje się do localStorage.
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly _tasks = signal<Task[]>(loadJson(TASKS_KEY, [], Array.isArray));
  private readonly _categories = signal<Category[]>(
    loadJson(CATEGORIES_KEY, DEFAULT_CATEGORIES, (v) => Array.isArray(v) && v.length > 0),
  );

  /** Publicznie tylko do odczytu – zmiany wyłącznie przez metody serwisu. */
  readonly tasks = this._tasks.asReadonly();
  readonly categories = this._categories.asReadonly();

  readonly activeCount = computed(() => this._tasks().filter((t) => !t.completed).length);
  readonly completedCount = computed(() => this._tasks().filter((t) => t.completed).length);

  readonly categoryById = computed(() => new Map(this._categories().map((c) => [c.id, c])));

  readonly taskCountByCategory = computed(() => {
    const counts = new Map<string, number>();
    for (const t of this._tasks()) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
    return counts;
  });

  // ---------- Zadania ----------

  addTask(title: string, categoryId: string): Task | null {
    const trimmed = title.trim();
    if (!trimmed || !this.categoryById().has(categoryId)) return null;

    const task: Task = {
      id: createId(),
      title: trimmed,
      categoryId,
      completed: false,
      createdAt: Date.now(),
    };
    // Nowe zadanie ląduje na górze listy.
    this.setTasks((tasks) => [task, ...tasks]);
    return task;
  }

  updateTask(id: string, changes: Partial<Pick<Task, 'title' | 'categoryId'>>): void {
    const title = changes.title?.trim();
    if (changes.title !== undefined && !title) return;
    this.setTasks((tasks) =>
      tasks.map((t) => (t.id === id ? { ...t, ...changes, ...(title ? { title } : {}) } : t)),
    );
  }

  toggleTask(id: string): void {
    this.setTasks((tasks) => tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
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

    const visible = new Set(visibleIds);
    const byId = new Map(this._tasks().map((t) => [t.id, t]));
    let next = 0;
    this.setTasks((tasks) => tasks.map((t) => (visible.has(t.id) ? byId.get(reordered[next++])! : t)));
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
    saveJson(TASKS_KEY, this._tasks());
  }

  private setCategories(fn: (cats: Category[]) => Category[]): void {
    this._categories.update(fn);
    saveJson(CATEGORIES_KEY, this._categories());
  }
}
