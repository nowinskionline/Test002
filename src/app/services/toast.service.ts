import { Injectable, signal } from '@angular/core';

export interface Toast {
  message: string;
  actionLabel?: string;
  action?: () => void;
}

/** Pokazuje jeden komunikat naraz; nowy zastępuje poprzedni. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<Toast | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  show(toast: Toast, durationMs = 5000): void {
    clearTimeout(this.timer);
    this.current.set(toast);
    this.timer = setTimeout(() => this.dismiss(), durationMs);
  }

  runAction(): void {
    this.current()?.action?.();
    this.dismiss();
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.current.set(null);
  }
}
