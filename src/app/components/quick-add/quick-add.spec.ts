import { TestBed } from '@angular/core/testing';
import { TaskService } from '../../services/task.service';
import { QuickAdd } from './quick-add';

/** Test komponentu: wpisujemy tekst w pole i wysyłamy formularz (Enter = submit). */
describe('QuickAdd (US-02)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  async function setup() {
    const fixture = TestBed.createComponent(QuickAdd);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    const type = async (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    const enter = async () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    };
    return { fixture, el, input, type, enter, service: TestBed.inject(TaskService) };
  }

  it('Enter dodaje zadanie z flagą, czyści pole i zostawia fokus', async () => {
    const { input, type, enter, service } = await setup();
    input.focus();
    await type('Zadzwonić do lekarza');
    await enter();
    expect(service.tasks()[0]).toMatchObject({ title: 'Zadzwonić do lekarza', needsReview: true });
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('negatywny: same spacje – nic nie powstaje i nie ma komunikatu', async () => {
    const { el, type, enter, service } = await setup();
    await type('   ');
    await enter();
    expect(service.tasks().length).toBe(0);
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('za długi tytuł: zapisane 200 znaków i widoczna informacja (EC-07)', async () => {
    const { el, type, enter, service } = await setup();
    await type('x'.repeat(500));
    await enter();
    expect(service.tasks()[0].title.length).toBe(200);
    expect(el.querySelector('[role="status"]')?.textContent).toContain('200');
  });
});
