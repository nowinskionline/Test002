import { DestroyRef, DOCUMENT, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { toLocalDateKey } from '../utils/due-date';

/** Źródło "teraz". W testach podmieniamy je na sztuczny zegar zamiast czekać do północy. */
export const NOW = new InjectionToken<() => Date>('NOW', { factory: () => () => new Date() });

/**
 * Trzyma bieżący dzień jako sygnał. Zmienia się o lokalnej północy (timer)
 * oraz przy powrocie do karty (visibilitychange) – np. gdy laptop spał albo telefon
 * dławił timery w tle. Dzięki temu "dziś", "po terminie" i filtr "Dziś" przeliczają się same.
 */
@Injectable({ providedIn: 'root' })
export class TodayService {
  private readonly now = inject(NOW);
  private readonly document = inject(DOCUMENT);
  private timer?: ReturnType<typeof setTimeout>;

  /** `equal` po kluczu dnia: sygnał "zmienia się" tylko, gdy zmieni się data, a nie godzina. */
  readonly today = signal<Date>(this.now(), {
    equal: (a, b) => toLocalDateKey(a) === toLocalDateKey(b),
  });

  constructor() {
    const onVisible = () => this.refresh();
    this.document.addEventListener('visibilitychange', onVisible);
    this.scheduleMidnight();
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      this.document.removeEventListener('visibilitychange', onVisible);
    });
  }

  /** Ponownie odczytuje zegar; publiczne, żeby dało się je wywołać w testach. */
  refresh(): void {
    this.today.set(this.now());
  }

  private scheduleMidnight(): void {
    const now = this.now();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    // +1 s zapasu, żeby na pewno być już po północy.
    const delay = Math.max(1000, nextMidnight.getTime() - now.getTime() + 1000);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.refresh();
      this.scheduleMidnight();
    }, delay);
  }
}
