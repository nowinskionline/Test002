import { Component, computed, inject, input, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Task } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { TodayService } from '../../services/today.service';
import { ToastService } from '../../services/toast.service';
import { emptyListMessage, matchesFilters, TaskFilters } from '../../utils/task-filters';
import { TaskItem } from '../task-item/task-item';

@Component({
  selector: 'app-task-list',
  imports: [CdkDropList, CdkDrag, TaskItem],
  templateUrl: './task-list.html',
})
export class TaskList {
  protected readonly taskService = inject(TaskService);
  private readonly toast = inject(ToastService);
  private readonly today = inject(TodayService).today;

  /** Wszystkie aktywne filtry naraz: kategoria, "Dziś", "Do przejrzenia", tryb energii. */
  readonly filters = input<TaskFilters>({ categoryId: null, todayOnly: false });

  protected readonly showCompleted = signal(false);

  /** Wspólna lista widocznych zadań – z niej korzystają szablon, drop i "Ułóż po terminie". */
  private readonly filtered = computed(() => {
    const filters = this.filters();
    const now = this.today();
    return this.taskService.tasks().filter((t) => matchesFilters(t, filters, now));
  });

  protected readonly active = computed(() => this.filtered().filter((t) => !t.completed));
  protected readonly completed = computed(() => this.filtered().filter((t) => t.completed));

  protected readonly categoryName = computed(() => {
    const id = this.filters().categoryId;
    return id ? (this.taskService.categoryById().get(id)?.name ?? null) : null;
  });

  /** Komunikat pustej listy wg tabeli pierwszeństwa (B-2). */
  protected readonly emptyMessage = computed(() =>
    emptyListMessage(this.filters(), this.categoryName(), this.completed().length > 0),
  );

  protected drop(event: CdkDragDrop<Task[], Task[], string>): void {
    // Indeks "skąd" liczymy z id trzymanego zadania, a nie z event.previousIndex:
    // jeśli lista zmieniła się w trakcie przeciągania (np. minęła północ przy filtrze "Dziś"),
    // stary indeks wskazywałby inne zadanie.
    const ids = this.active().map((t) => t.id);
    const from = ids.indexOf(event.item.data);
    if (from === -1) return;
    const to = Math.min(Math.max(event.currentIndex, 0), ids.length - 1);
    this.taskService.reorder(ids, from, to);
  }

  protected sortByDue(): void {
    const previous = this.taskService.sortByDue(this.active().map((t) => t.id));
    if (!previous) return; // nic się nie zmieniło – bez toasta i bez zapisu
    this.toast.show({
      message: 'Ułożono zadania wg terminu',
      actionLabel: 'Cofnij',
      action: () => this.taskService.restoreOrder(previous),
    });
  }

  /** Po edycji: jeśli zadanie wypadło z bieżącego filtra, mówimy o tym, żeby nie "zniknęło" bez słowa. */
  protected edited(id: string): void {
    const task = this.taskService.tasks().find((t) => t.id === id);
    if (task && !this.filtered().includes(task)) {
      this.toast.show({
        message: `Zapisano „${shorten(task.title)}” – zadanie jest poza bieżącym filtrem`,
      });
    }
  }

  protected remove(task: Task): void {
    const removed = this.taskService.deleteTask(task.id);
    if (!removed) return;
    this.toast.show({
      message: `Usunięto „${shorten(task.title)}”`,
      actionLabel: 'Cofnij',
      action: () => this.taskService.restoreTask(removed.task, removed.index),
    });
  }
}

export function shorten(title: string): string {
  return title.length > 30 ? title.slice(0, 30) + '…' : title;
}
