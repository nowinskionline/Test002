import { Component, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { TodayService } from '../../services/today.service';
import { pickCatchUp } from '../../utils/catch-up';
import { formatDue, isOverdue } from '../../utils/due-date';
import { Task } from '../../models/task.model';

/**
 * Panel "Ogarnij zaległe" (US-10..US-12): 3 zadania (zaległe + na dziś) w ręcznej kolejności,
 * pod nimi rozwijane "+X więcej". To tylko widok – niczego nie zapisuje poza "zrobione".
 * Komponent jest tworzony przy otwarciu panelu, więc rozwinięcie "+X więcej" resetuje się po zamknięciu.
 */
@Component({
  selector: 'app-catch-up',
  imports: [NgTemplateOutlet],
  templateUrl: './catch-up.html',
})
export class CatchUpPanel {
  protected readonly taskService = inject(TaskService);
  private readonly today = inject(TodayService).today;

  /** Aktywny filtr kategorii (panel go respektuje); null = wszystkie. */
  readonly categoryId = input<string | null>(null);
  readonly categoryName = input<string | null>(null);
  /** Prośba o pokazanie wszystkich kategorii (zdjęcie filtra kategorii). */
  readonly showAll = output<void>();

  protected readonly expanded = signal(false);

  /** Przelicza się samo po każdej zmianie zadań i o północy (sygnał today). */
  protected readonly pick = computed(() =>
    pickCatchUp(this.taskService.tasks(), this.categoryId(), this.today()),
  );

  protected dueText(task: Task): string {
    return formatDue(task, this.today());
  }

  protected overdue(task: Task): boolean {
    return isOverdue(task, this.today());
  }
}
