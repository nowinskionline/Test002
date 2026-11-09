import { Component, computed, inject, signal } from '@angular/core';
import { CATEGORY_COLORS } from './models/task.model';
import { TaskService } from './services/task.service';
import { ThemeService } from './services/theme.service';
import { CategoryManager } from './components/category-manager/category-manager';
import { TaskForm } from './components/task-form/task-form';
import { TaskList } from './components/task-list/task-list';
import { ToastComponent } from './components/toast/toast';

@Component({
  selector: 'app-root',
  imports: [TaskForm, TaskList, CategoryManager, ToastComponent],
  templateUrl: './app.html',
})
export class App {
  protected readonly taskService = inject(TaskService);
  protected readonly theme = inject(ThemeService);
  protected readonly colors = CATEGORY_COLORS;

  protected readonly showCategories = signal(false);
  private readonly selectedFilter = signal<string | null>(null);

  /** Jeśli wybrana kategoria zniknie, wracamy do "Wszystkie". */
  protected readonly filter = computed(() => {
    const id = this.selectedFilter();
    return id && this.taskService.categoryById().has(id) ? id : null;
  });

  protected setFilter(id: string | null): void {
    this.selectedFilter.set(id);
  }
}
