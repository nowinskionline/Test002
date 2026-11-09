import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div aria-live="polite" class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      @if (toast.current(); as t) {
        <div
          class="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl ring-1 ring-white/10 dark:bg-slate-800"
        >
          <span class="min-w-0 flex-1 truncate">{{ t.message }}</span>
          @if (t.actionLabel) {
            <button type="button" (click)="toast.runAction()" class="rounded-md px-2 py-1 font-semibold text-blue-300 hover:bg-white/10">
              {{ t.actionLabel }}
            </button>
          }
          <button type="button" (click)="toast.dismiss()" aria-label="Zamknij" class="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  protected readonly toast = inject(ToastService);
}
