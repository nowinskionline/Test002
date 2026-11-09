import { Component, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Category } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  imports: [FormsModule],
  templateUrl: './task-form.html',
})
export class TaskForm {
  readonly categories = input.required<Category[]>();
  readonly added = output<{ title: string; categoryId: string }>();

  protected readonly title = signal('');

  /**
   * linkedSignal: wartość, którą można ustawiać ręcznie, ale która "przelicza się",
   * gdy zmieni się lista kategorii (np. wybrana kategoria została usunięta).
   */
  protected readonly categoryId = linkedSignal<Category[], string>({
    source: this.categories,
    computation: (cats, previous) =>
      previous && cats.some((c) => c.id === previous.value) ? previous.value : (cats[0]?.id ?? ''),
  });

  protected submit(): void {
    const title = this.title().trim();
    if (!title) return;
    this.added.emit({ title, categoryId: this.categoryId() });
    this.title.set('');
  }
}
