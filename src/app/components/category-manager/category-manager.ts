import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CATEGORY_COLOR_NAMES, CATEGORY_COLORS, CategoryColor } from '../../models/task.model';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-category-manager',
  imports: [FormsModule],
  templateUrl: './category-manager.html',
})
export class CategoryManager {
  protected readonly taskService = inject(TaskService);
  protected readonly colorNames = CATEGORY_COLOR_NAMES;
  protected readonly colors = CATEGORY_COLORS;

  protected readonly name = signal('');
  protected readonly color = signal<CategoryColor>('violet');
  protected readonly error = signal<string | null>(null);

  protected add(): void {
    if (!this.name().trim()) return;
    const created = this.taskService.addCategory(this.name(), this.color());
    if (!created) {
      this.error.set('Kategoria o tej nazwie już istnieje.');
      return;
    }
    this.name.set('');
    this.error.set(null);
  }

  protected deleteTooltip(id: string): string {
    if (this.taskService.categories().length <= 1) return 'Musi zostać co najmniej jedna kategoria';
    const count = this.taskService.taskCountByCategory().get(id) ?? 0;
    return count ? `Najpierw usuń lub przenieś zadania (${count})` : 'Usuń kategorię';
  }
}
