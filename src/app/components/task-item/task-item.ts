import { Component, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Category, CATEGORY_COLORS, Task } from '../../models/task.model';

@Component({
  selector: 'app-task-item',
  imports: [FormsModule, CdkDragHandle],
  templateUrl: './task-item.html',
})
export class TaskItem {
  readonly task = input.required<Task>();
  readonly categories = input.required<Category[]>();
  readonly draggable = input(false);

  readonly toggled = output<void>();
  readonly removed = output<void>();
  readonly edited = output<{ title: string; categoryId: string }>();

  protected readonly editing = signal(false);
  protected readonly draftTitle = signal('');
  protected readonly draftCategoryId = signal('');
  protected readonly colors = CATEGORY_COLORS;

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
    this.editing.set(true);
  }

  protected save(): void {
    const title = this.draftTitle().trim();
    if (!title) return;
    this.edited.emit({ title, categoryId: this.draftCategoryId() });
    this.editing.set(false);
  }

  protected cancel(): void {
    this.editing.set(false);
  }
}
