import { Component, computed, inject, signal } from '@angular/core';
import { CATEGORY_COLORS, Task } from './models/task.model';
import { version } from '../../package.json';
import { TaskService } from './services/task.service';
import { ThemeService } from './services/theme.service';
import { TodayService } from './services/today.service';
import { ToastService } from './services/toast.service';
import { ENERGY_LABELS, EnergyMode, matchesFilters, TaskFilters } from './utils/task-filters';
import { CategoryManager } from './components/category-manager/category-manager';
import { TaskForm } from './components/task-form/task-form';
import { QuickAdd } from './components/quick-add/quick-add';
import { CatchUpPanel } from './components/catch-up/catch-up';
import { shorten, TaskList } from './components/task-list/task-list';
import { ToastComponent } from './components/toast/toast';

@Component({
  selector: 'app-root',
  imports: [QuickAdd, TaskForm, TaskList, CatchUpPanel, CategoryManager, ToastComponent],
  templateUrl: './app.html',
})
export class App {
  protected readonly taskService = inject(TaskService);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly today = inject(TodayService).today;
  protected readonly colors = CATEGORY_COLORS;
  /** Wersja czytana z package.json – zmieniasz ją w jednym miejscu. */
  protected readonly version = version;

  protected readonly showCategories = signal(false);
  private readonly selectedFilter = signal<string | null>(null);
  /** Filtr "Dziś" – łączy się z filtrem kategorii; nie jest zapisywany (jak "Pokaż ukończone"). */
  protected readonly todayOnly = signal(false);
  /** Filtr "Do przejrzenia" (US-03). */
  protected readonly reviewOnly = signal(false);
  /** Tryb energii (US-07); domyślnie wyłączony i niezapamiętywany po odświeżeniu (Q-05). */
  protected readonly energy = signal<EnergyMode>('off');
  protected readonly energyModes: EnergyMode[] = ['off', 'rested', 'tired'];
  protected readonly energyLabels = ENERGY_LABELS;
  /** Panel "Ogarnij zaległe" – otwierany tylko na żądanie (US-10). */
  protected readonly catchUpOpen = signal(false);

  /** Jeśli wybrana kategoria zniknie, wracamy do "Wszystkie". */
  protected readonly filter = computed(() => {
    const id = this.selectedFilter();
    return id && this.taskService.categoryById().has(id) ? id : null;
  });

  /** Wszystkie filtry listy w jednym obiekcie – ten sam dla listy i toasta "poza filtrem". */
  protected readonly filters = computed<TaskFilters>(() => ({
    categoryId: this.filter(),
    todayOnly: this.todayOnly(),
    reviewOnly: this.reviewOnly(),
    energy: this.energy(),
  }));

  protected readonly filterName = computed(() => {
    const id = this.filter();
    return id ? (this.taskService.categoryById().get(id)?.name ?? null) : null;
  });

  protected setFilter(id: string | null): void {
    this.selectedFilter.set(id);
  }

  /** Nowe zadanie poza bieżącym filtrem nie pojawi się na liście – informujemy, że jednak się dodało. */
  protected onAdded(task: Task): void {
    if (!matchesFilters(task, this.filters(), this.today())) {
      this.toast.show({
        message: `Dodano „${shorten(task.title)}” – zadanie jest poza bieżącym filtrem`,
      });
    }
  }
}
