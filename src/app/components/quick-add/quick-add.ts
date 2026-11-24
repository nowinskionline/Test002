import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Task } from '../../models/task.model';
import { TaskService } from '../../services/task.service';

/** Tak jak w pozostałych polach tytułu. */
export const MAX_TITLE_LENGTH = 200;

/**
 * Szybki wrzut (US-02): sam tytuł + Enter. Zadanie trafia na górę listy z flagą "do przejrzenia".
 * Po dodaniu pole się czyści, a fokus zostaje w polu – można od razu wrzucać kolejne.
 */
@Component({
  selector: 'app-quick-add',
  imports: [FormsModule],
  templateUrl: './quick-add.html',
})
export class QuickAdd {
  private readonly taskService = inject(TaskService);

  /** Emitowane po udanym dodaniu (rodzic pokazuje toast, gdy zadanie jest poza filtrem). */
  readonly added = output<Task>();

  protected readonly title = signal('');
  /** Informacja o skróconym tytule – bez atrybutu maxlength, który ucina wklejony tekst po cichu (EC-07). */
  protected readonly notice = signal<string | null>(null);

  protected submit(): void {
    const trimmed = this.title().trim();
    if (!trimmed) return; // pusty wrzut: nic się nie dzieje, bez błędu i toasta
    const tooLong = trimmed.length > MAX_TITLE_LENGTH;
    const result = this.taskService.addQuickTask(trimmed.slice(0, MAX_TITLE_LENGTH));
    if (!result.ok) return;
    this.title.set('');
    this.notice.set(
      tooLong ? `Tytuł był za długi – zapisano pierwsze ${MAX_TITLE_LENGTH} znaków.` : null,
    );
    this.added.emit(result.task);
  }
}
