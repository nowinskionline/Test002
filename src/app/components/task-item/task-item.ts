import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import {
  Category,
  CATEGORY_COLORS,
  Difficulty,
  DIFFICULTY_LABELS,
  Task,
} from '../../models/task.model';
import { TASK_ERROR_MESSAGES, TaskService } from '../../services/task.service';
import { TodayService } from '../../services/today.service';
import { formatDue, isOverdue } from '../../utils/due-date';

@Component({
  selector: 'app-task-item',
  imports: [FormsModule, CdkDragHandle],
  templateUrl: './task-item.html',
})
export class TaskItem {
  private readonly taskService = inject(TaskService);
  private readonly today = inject(TodayService).today;

  readonly task = input.required<Task>();
  readonly categories = input.required<Category[]>();
  readonly draggable = input(false);

  readonly toggled = output<void>();
  readonly removed = output<void>();
  /** Emitowane po UDANYM zapisie edycji. */
  readonly edited = output<void>();
  /** Kliknięto "OK" przy zadaniu "do przejrzenia". */
  readonly reviewed = output<void>();

  protected readonly editing = signal(false);
  protected readonly draftTitle = signal('');
  protected readonly draftCategoryId = signal('');
  protected readonly draftDueDate = signal('');
  protected readonly draftDueTime = signal('');
  /** '' = brak oznaczenia trudności. */
  protected readonly draftDifficulty = signal<Difficulty | ''>('');
  protected readonly error = signal<string | null>(null);
  protected readonly colors = CATEGORY_COLORS;
  protected readonly difficultyLabels = DIFFICULTY_LABELS;

  /** Przeliczają się same, gdy zmieni się zadanie albo minie północ (sygnał today). */
  protected readonly dueText = computed(() => formatDue(this.task(), this.today()));
  protected readonly overdue = computed(() => isOverdue(this.task(), this.today()));

  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  protected category(): Category | undefined {
    return this.categories().find((c) => c.id === this.task().categoryId);
  }

  constructor() {
    // Gdy pojawi się pole edycji, ustaw w nim kursor.
    effect(() => this.titleInput()?.nativeElement.focus());
  }

  protected startEdit(): void {
    this.draftTitle.set(this.task().title);
    this.draftCategoryId.set(this.task().categoryId);
    this.draftDueDate.set(this.task().dueDate ?? '');
    this.draftDueTime.set(this.task().dueTime ?? '');
    this.draftDifficulty.set(this.task().difficulty ?? '');
    this.error.set(null);
    this.editing.set(true);
  }

  protected save(): void {
    if (!this.draftTitle().trim()) return;
    // Formularz zawsze wysyła pełny stan terminu i trudności: puste pole = null = usuń.
    const result = this.taskService.updateTask(this.task().id, {
      title: this.draftTitle(),
      categoryId: this.draftCategoryId(),
      dueDate: this.draftDueDate() || null,
      dueTime: this.draftDueTime() || null,
      difficulty: this.draftDifficulty() || null,
    });
    // Przy błędzie edycja zostaje otwarta z wpisanymi danymi.
    if (!result.ok) {
      this.error.set(TASK_ERROR_MESSAGES[result.error]);
      return;
    }
    this.editing.set(false);
    this.edited.emit();
  }

  protected cancel(): void {
    this.editing.set(false);
  }
}
