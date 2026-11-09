import { Component, computed, inject, input, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Task } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { ToastService } from '../../services/toast.service';
import { TaskItem } from '../task-item/task-item';

@Component({
  selector: 'app-task-list',
  imports: [CdkDropList, CdkDrag, TaskItem],
  templateUrl: './task-list.html',
})
export class TaskList {
  protected readonly taskService = inject(TaskService);
  private readonly toast = inject(ToastService);

  /** id kategorii do filtrowania; null = wszystkie. */
  readonly categoryFilter = input<string | null>(null);

  protected readonly showCompleted = signal(false);

  private readonly filtered = computed(() => {
    const filter = this.categoryFilter();
    return this.taskService.tasks().filter((t) => !filter || t.categoryId === filter);
  });

  protected readonly active = computed(() => this.filtered().filter((t) => !t.completed));
  protected readonly completed = computed(() => this.filtered().filter((t) => t.completed));

  protected drop(event: CdkDragDrop<Task[]>): void {
    this.taskService.reorder(
      this.active().map((t) => t.id),
      event.previousIndex,
      event.currentIndex,
    );
  }

  protected edit(task: Task, changes: { title: string; categoryId: string }): void {
    this.taskService.updateTask(task.id, changes);
  }

  protected remove(task: Task): void {
    const removed = this.taskService.deleteTask(task.id);
    if (!removed) return;
    const short = task.title.length > 30 ? task.title.slice(0, 30) + '…' : task.title;
    this.toast.show({
      message: `Usunięto „${short}”`,
      actionLabel: 'Cofnij',
      action: () => this.taskService.restoreTask(removed.task, removed.index),
    });
  }
}
