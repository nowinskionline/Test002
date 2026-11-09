import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { loadJson, saveJson } from './storage';

export type Theme = 'dark' | 'light';
const THEME_KEY = 'todoartur.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly theme = signal<Theme>(loadJson<Theme>(THEME_KEY, 'dark', (v) => v === 'dark' || v === 'light'));

  constructor() {
    // effect() uruchamia się przy każdej zmianie sygnału theme.
    effect(() => {
      const theme = this.theme();
      this.document.documentElement.classList.toggle('dark', theme === 'dark');
      saveJson(THEME_KEY, theme);
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
