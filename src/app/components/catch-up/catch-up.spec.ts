import { TestBed } from '@angular/core/testing';
import { Task } from '../../models/task.model';
import { TASKS_KEY } from '../../services/task.service';
import { NOW } from '../../services/today.service';
import { CatchUpPanel } from './catch-up';

const overdue = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  categoryId: 'praca',
  completed: false,
  createdAt: 1,
  dueDate: '2026-11-20',
  ...extra,
});

describe('CatchUpPanel (US-10..US-12)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: NOW, useValue: () => new Date(2026, 10, 24, 15, 0) }],
    });
  });

  async function render(tasks: Task[], categoryId: string | null = null) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    const fixture = TestBed.createComponent(CatchUpPanel);
    fixture.componentRef.setInput('categoryId', categoryId);
    fixture.componentRef.setInput('categoryName', categoryId ? 'Dom' : null);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const titles = (el: HTMLElement) =>
    [...el.querySelectorAll('li span.flex-1')].map((s) => s.textContent?.trim());

  it('7 zadań: 3 widoczne, "+4 więcej" rozwija resztę w tej samej kolejności', async () => {
    const tasks = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => overdue(id));
    const { fixture, el } = await render(tasks);
    expect(titles(el)).toEqual(['a', 'b', 'c']);
    const more = el.querySelector<HTMLButtonElement>('button[aria-controls="catch-up-rest"]')!;
    expect(more.textContent?.trim()).toBe('+4 więcej');
    more.click();
    await fixture.whenStable();
    expect(titles(el)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  });

  it('zaznaczenie "zrobione" usuwa zadanie z panelu, wchodzi kolejne; ostatnie → komunikat', async () => {
    const { fixture, el } = await render([overdue('a'), overdue('b'), overdue('c'), overdue('d')]);
    el.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await fixture.whenStable();
    expect(titles(el)).toEqual(['b', 'c', 'd']);
    for (let i = 0; i < 3; i++) {
      el.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
      await fixture.whenStable();
    }
    expect(el.textContent).toContain('Brak zaległych i dzisiejszych zadań');
  });

  it('kategoria bez zaległych: komunikat z nazwą kategorii i liczba w innych (EC-11)', async () => {
    const { el } = await render([overdue('p1'), overdue('p2')], 'dom');
    expect(el.textContent).toContain('Brak zaległych i dzisiejszych zadań w kategorii „Dom”');
    expect(el.textContent).toContain('W innych kategoriach: 2');
  });

  it('otwarcie panelu niczego nie zapisuje (US-10 "Dane bez zmian")', async () => {
    const raw = JSON.stringify([overdue('a')]);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    localStorage.setItem(TASKS_KEY, raw);
    setItem.mockClear();
    const fixture = TestBed.createComponent(CatchUpPanel);
    await fixture.whenStable();
    fixture.destroy();
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem(TASKS_KEY)).toBe(raw);
    setItem.mockRestore();
  });
});
