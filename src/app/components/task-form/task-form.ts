import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Category, Difficulty, Task } from '../../models/task.model';
import { TASK_ERROR_MESSAGES, TaskService } from '../../services/task.service';

@Component({
  selector: 'app-task-form',
  imports: [FormsModule],
  templateUrl: './task-form.html',
})
export class TaskForm {
  private readonly taskService = inject(TaskService);

  readonly categories = input.required<Category[]>();
  /** Emitowane dopiero po udanym dodaniu (rodzic sprawdza, czy zadanie jest widoczne w filtrze). */
  readonly added = output<Task>();

  protected readonly title = signal('');
  /** Wartości natywnych pól <input type="date"> i <input type="time">; '' = puste pole. */
  protected readonly dueDate = signal('');
  protected readonly dueTime = signal('');
  /** '' = bez oznaczenia trudności (domyślnie). */
  protected readonly difficulty = signal<Difficulty | ''>('');
  protected readonly error = signal<string | null>(null);

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
    if (!this.title().trim()) return;
    const result = this.taskService.addTask(
      this.title(),
      this.categoryId(),
      {
        dueDate: this.dueDate() || null,
        dueTime: this.dueTime() || null,
      },
      { difficulty: this.difficulty() || null },
    );
    // Przy błędzie NIE czyścimy formularza – użytkownik poprawia termin i próbuje ponownie.
    if (!result.ok) {
      this.error.set(TASK_ERROR_MESSAGES[result.error]);
      return;
    }
    this.title.set('');
    this.dueDate.set('');
    this.dueTime.set('');
    // Trudność wraca do "brak", żeby kolejne zadanie jej nie dziedziczyło (EC-16).
    this.difficulty.set('');
    this.error.set(null);
    this.added.emit(result.task);
  }
}
