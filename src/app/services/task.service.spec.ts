import { TestBed } from '@angular/core/testing';
import { Task } from '../models/task.model';
import { isOverdue } from '../utils/due-date';
import { TASKS_BACKUP_KEY, TASKS_KEY, TaskService } from './task.service';
import { NOW, TodayService } from './today.service';
import { ToastService } from './toast.service';

/**
 * Schemat każdego testu:
 *  1. przygotuj (arrange) – czysty localStorage i świeży serwis,
 *  2. działaj (act)       – wywołaj metodę serwisu,
 *  3. sprawdź (assert)    – stan w sygnale i w localStorage.
 *
 * Uruchom: npm test
 */

const saved = () => JSON.parse(localStorage.getItem(TASKS_KEY)!) as Task[];

/** Wpisuje dane do localStorage PRZED utworzeniem serwisu (serwis czyta je w konstruktorze). */
function serviceWith(rawTasks?: string): TaskService {
  if (rawTasks !== undefined) localStorage.setItem(TASKS_KEY, rawTasks);
  return TestBed.inject(TaskService);
}

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  categoryId: 'praca',
  completed: false,
  createdAt: 1,
  ...extra,
});

describe('TaskService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => vi.restoreAllMocks());

  it('dodaje zadanie i zapisuje je w localStorage', () => {
    const service = TestBed.inject(TaskService);

    service.addTask('  Kupić mleko  ', 'dom');

    expect(service.tasks().length).toBe(1);
    expect(service.tasks()[0].title).toBe('Kupić mleko'); // spacje obcięte
    expect(service.tasks()[0].completed).toBe(false);
    expect(saved()[0].title).toBe('Kupić mleko');
  });

  describe('US-01 dodanie zadania z terminem', () => {
    it('sama data', () => {
      const service = serviceWith();
      const result = service.addTask('Raport', 'praca', { dueDate: '2026-12-01' });
      expect(result.ok).toBe(true);
      expect(service.tasks()[0].dueDate).toBe('2026-12-01');
      expect('dueTime' in service.tasks()[0]).toBe(false);
      expect(saved()[0].dueDate).toBe('2026-12-01');
    });

    it('data i godzina', () => {
      const service = serviceWith();
      service.addTask('Spotkanie', 'praca', { dueDate: '2026-12-01', dueTime: '14:00' });
      expect(service.tasks()[0]).toMatchObject({ dueDate: '2026-12-01', dueTime: '14:00' });
    });

    it('bez terminu (puste pola formularza = null)', () => {
      const service = serviceWith();
      service.addTask('Zakupy', 'dom', { dueDate: null, dueTime: null });
      expect('dueDate' in saved()[0]).toBe(false);
      expect('dueTime' in saved()[0]).toBe(false);
    });

    it('termin w przeszłości jest dozwolony i od razu zaległy (Q-02)', () => {
      const service = serviceWith();
      const result = service.addTask('Zaległe sprawozdanie', 'praca', { dueDate: '2026-11-23' });
      expect(result.ok).toBe(true);
      expect(isOverdue(service.tasks()[0], new Date(2026, 10, 24, 9))).toBe(true);
    });

    it('godzina bez daty jest odrzucona, localStorage bez zmian', () => {
      const service = serviceWith();
      const result = service.addTask('Test', 'praca', { dueTime: '10:00' });
      expect(result).toEqual({ ok: false, error: 'time-without-date' });
      expect(service.tasks().length).toBe(0);
      expect(localStorage.getItem(TASKS_KEY)).toBeNull();
    });

    it.each(['2026-02-31', '1899-12-31', '2101-01-01', '275760-09-13'])(
      'nieprawidłowa data %s jest odrzucona',
      (dueDate) => {
        const service = serviceWith();
        expect(service.addTask('Test', 'praca', { dueDate })).toEqual({
          ok: false,
          error: 'invalid-date',
        });
        expect(localStorage.getItem(TASKS_KEY)).toBeNull();
      },
    );

    it.each(['1900-01-01', '2100-12-31'])('graniczna data %s jest przyjęta', (dueDate) => {
      const service = serviceWith();
      expect(service.addTask('Test', 'praca', { dueDate }).ok).toBe(true);
    });
  });

  describe('US-02 edycja i usuwanie terminu (K-02)', () => {
    const withTask = (extra: Partial<Task>) => serviceWith(JSON.stringify([task('a', extra)]));

    it('zmiana terminu', () => {
      const service = withTask({ dueDate: '2026-12-01' });
      service.updateTask('a', { dueDate: '2026-12-05', dueTime: '09:30' });
      expect(service.tasks()[0]).toMatchObject({ dueDate: '2026-12-05', dueTime: '09:30' });
    });

    it('dueDate: null usuwa datę i godzinę, bez kluczy null w localStorage', () => {
      const service = withTask({ dueDate: '2026-12-01', dueTime: '14:00' });
      expect(service.updateTask('a', { dueDate: null }).ok).toBe(true);
      expect(saved()[0]).toEqual(task('a'));
      expect(localStorage.getItem(TASKS_KEY)).not.toContain('null');
    });

    it('dueTime: null usuwa samą godzinę (EC-01)', () => {
      const service = withTask({ dueDate: '2026-12-01', dueTime: '14:00' });
      service.updateTask('a', { dueDate: '2026-12-01', dueTime: null });
      expect(saved()[0].dueDate).toBe('2026-12-01');
      expect('dueTime' in saved()[0]).toBe(false);
    });

    it('brak klucza = bez zmian: tytuł lub kategoria nie ruszają terminu', () => {
      const service = withTask({ dueDate: '2026-12-01', dueTime: '14:00' });
      service.updateTask('a', { title: 'Raport roczny' });
      service.updateTask('a', { categoryId: 'dom' });
      expect(service.tasks()[0]).toMatchObject({
        title: 'Raport roczny',
        categoryId: 'dom',
        dueDate: '2026-12-01',
        dueTime: '14:00',
      });
    });

    it('edycja terminu ukończonego zadania zostawia je ukończonym', () => {
      const service = withTask({ completed: true, dueDate: '2026-11-01' });
      service.updateTask('a', { dueDate: '2026-12-24' });
      expect(service.tasks()[0]).toMatchObject({ completed: true, dueDate: '2026-12-24' });
    });

    it('nieprawidłowy termin odrzuca całą zmianę (także tytuł)', () => {
      const service = withTask({ dueDate: '2026-12-01' });
      const result = service.updateTask('a', { title: 'Nowy', dueDate: '2026-02-31' });
      expect(result).toEqual({ ok: false, error: 'invalid-date' });
      expect(service.tasks()[0]).toMatchObject({ title: 'a', dueDate: '2026-12-01' });
    });

    it('godzina przy usuwanej dacie jest odrzucona', () => {
      const service = withTask({ dueDate: '2026-12-01' });
      expect(service.updateTask('a', { dueDate: null, dueTime: '10:00' })).toEqual({
        ok: false,
        error: 'time-without-date',
      });
    });

    it('pusty tytuł zwraca błąd zamiast cichego ignorowania', () => {
      const service = withTask({});
      expect(service.updateTask('a', { title: '   ' })).toEqual({
        ok: false,
        error: 'empty-title',
      });
    });
  });

  describe('US-03 zgodność wsteczna i odporne wczytywanie', () => {
    it('stare zadania bez terminu wczytują się bez zapisu zwrotnego i bez kopii', () => {
      const raw = JSON.stringify([task('a'), task('b', { completed: true })]);
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      const service = serviceWith(raw);
      setItem.mockClear();

      expect(service.tasks().map((t) => t.id)).toEqual(['a', 'b']);
      expect(service.tasks().every((t) => t.dueDate === undefined)).toBe(true);
      service.tasks(); // ponowny odczyt nie zapisuje
      expect(setItem).not.toHaveBeenCalled();
      expect(localStorage.getItem(TASKS_KEY)).toBe(raw);
      expect(localStorage.getItem(TASKS_BACKUP_KEY)).toBeNull();
    });

    it('śmieci w tablicy są pomijane, oryginał trafia do kopii, todoartur.tasks nietknięte (K-06)', () => {
      const raw = JSON.stringify([null, 5, { id: 'x' }, task('ok', { dueDate: '2026-02-31' })]);
      const service = serviceWith(raw);
      expect(service.tasks()).toEqual([task('ok')]);
      expect(localStorage.getItem(TASKS_KEY)).toBe(raw);
      expect(localStorage.getItem(TASKS_BACKUP_KEY)).toBe(raw);
    });

    it.each(['{ucięty json', '{"a":1}', '"tekst"'])(
      'nieczytelna wartość %s: pusta lista, a oryginał w kopii zapasowej (EC-07)',
      (raw) => {
        const service = serviceWith(raw);
        expect(service.tasks()).toEqual([]);
        service.addTask('Nowe', 'praca');
        expect(service.tasks().length).toBe(1);
        expect(localStorage.getItem(TASKS_BACKUP_KEY)).toBe(raw);
      },
    );

    it('zdublowane id są unikalizowane i przeciąganie nie gubi zadań (EC-08)', () => {
      const service = serviceWith(
        JSON.stringify([task('x1', { title: 'Pierwsze' }), task('x1', { title: 'Drugie' })]),
      );
      const ids = service.tasks().map((t) => t.id);
      expect(new Set(ids).size).toBe(2);
      service.reorder(ids, 0, 1);
      expect(service.tasks().map((t) => t.title)).toEqual(['Drugie', 'Pierwsze']);
    });

    it('nieznana kategoria → pierwsza istniejąca (EC-08)', () => {
      const service = serviceWith(JSON.stringify([{ ...task('a'), categoryId: 7 }]));
      expect(service.tasks()[0].categoryId).toBe('praca');
    });
  });

  describe('US-09 ręczna kolejność nadrzędna', () => {
    it('ustawienie terminu nie zmienia kolejności', () => {
      const service = serviceWith(JSON.stringify([task('A'), task('B'), task('C')]));
      service.updateTask('B', { dueDate: '2026-01-01' });
      expect(service.tasks().map((t) => t.id)).toEqual(['A', 'B', 'C']);
    });

    it('nowe zadanie z najwcześniejszym terminem ląduje na górze', () => {
      const service = serviceWith(JSON.stringify([task('A', { dueDate: '2026-12-01' })]));
      service.addTask('Nowe', 'praca', { dueDate: '2030-01-01' });
      expect(service.tasks()[0].title).toBe('Nowe');
    });
  });

  describe('US-10 "Ułóż po terminie"', () => {
    const fiveTasks = () =>
      serviceWith(
        JSON.stringify([
          task('A'),
          task('B', { dueDate: '2026-12-05' }),
          task('C', { dueDate: '2026-12-01', dueTime: '14:00' }),
          task('D', { dueDate: '2026-12-01' }),
          task('E'),
        ]),
      );

    it('układa C, D, B, A, E i zapisuje', () => {
      const service = fiveTasks();
      const previous = service.sortByDue(['A', 'B', 'C', 'D', 'E']);
      expect(previous).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(service.tasks().map((t) => t.id)).toEqual(['C', 'D', 'B', 'A', 'E']);
      expect(saved().map((t) => t.id)).toEqual(['C', 'D', 'B', 'A', 'E']);
    });

    it('przy filtrze układa tylko widoczne, reszta zostaje na swoich miejscach', () => {
      const service = fiveTasks();
      service.sortByDue(['A', 'B', 'C']); // np. widoczne w kategorii
      expect(service.tasks().map((t) => t.id)).toEqual(['C', 'B', 'A', 'D', 'E']);
    });

    it('nic do zmiany: null i brak zapisu', () => {
      const service = serviceWith(
        JSON.stringify([task('A', { dueDate: '2026-12-01' }), task('B')]),
      );
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      expect(service.sortByDue(['A', 'B'])).toBeNull();
      expect(service.sortByDue(['A'])).toBeNull();
      expect(service.sortByDue([])).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
    });

    it('"Cofnij" przywraca poprzednią kolejność', () => {
      const service = fiveTasks();
      const previous = service.sortByDue(['A', 'B', 'C', 'D', 'E'])!;
      service.restoreOrder(previous);
      expect(service.tasks().map((t) => t.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('"Cofnij" po dodaniu zadania w międzyczasie nie usuwa nowego (EC-05)', () => {
      const service = serviceWith(
        JSON.stringify([
          task('A'),
          task('B', { dueDate: '2026-12-02' }),
          task('C', { dueDate: '2026-12-01' }),
        ]),
      );
      const previous = service.sortByDue(['A', 'B', 'C'])!; // → C, B, A
      service.addTask('N', 'praca');
      service.restoreOrder(previous);
      const titles = service.tasks().map((t) => t.title);
      expect(titles).toContain('N');
      expect(titles.filter((t) => t !== 'N')).toEqual(['A', 'B', 'C']);
    });

    it('"Cofnij" po usunięciu zadania w międzyczasie go nie wskrzesza (EC-05)', () => {
      const service = serviceWith(
        JSON.stringify([
          task('A'),
          task('B', { dueDate: '2026-12-02' }),
          task('C', { dueDate: '2026-12-01' }),
        ]),
      );
      const previous = service.sortByDue(['A', 'B', 'C'])!;
      service.deleteTask('B');
      service.restoreOrder(previous);
      expect(service.tasks().map((t) => t.id)).toEqual(['A', 'C']);
    });

    it('po akcji ręczne przeciąganie działa normalnie', () => {
      const service = fiveTasks();
      service.sortByDue(['A', 'B', 'C', 'D', 'E']);
      service.reorder(['C', 'D', 'B', 'A', 'E'], 4, 0);
      expect(service.tasks().map((t) => t.id)).toEqual(['E', 'C', 'D', 'B', 'A']);
    });
  });

  describe('US-05 cofnięcie usunięcia zachowuje termin', () => {
    it('przywrócone zadanie ma swój termin i pozycję', () => {
      const service = serviceWith(
        JSON.stringify([task('A'), task('B', { dueDate: '2026-11-01' })]),
      );
      const removed = service.deleteTask('B')!;
      service.restoreTask(removed.task, removed.index);
      expect(service.tasks()[1]).toMatchObject({ id: 'B', dueDate: '2026-11-01' });
    });
  });

  describe('US-11 błąd zapisu', () => {
    it('przepełnione localStorage: brak wyjątku i flaga saveFailed', () => {
      const service = serviceWith();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });
      const result = service.addTask('Oddać raport', 'praca', { dueDate: '2026-12-01' });
      expect(result.ok).toBe(true); // zadanie jest w pamięci
      expect(service.saveFailed()).toBe(true);
    });

    it('poprawny zapis nie zgłasza błędu i kasuje wcześniejszy', () => {
      const service = serviceWith();
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('quota');
      });
      service.addTask('1', 'praca');
      expect(service.saveFailed()).toBe(true);
      spy.mockRestore();
      service.addTask('2', 'praca');
      expect(service.saveFailed()).toBe(false);
    });
  });
});

describe('TodayService (K-05, R-01)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('po przejściu północy sygnał today zmienia dzień (sztuczny zegar)', () => {
    let fake = new Date(2026, 10, 24, 23, 59);
    TestBed.configureTestingModule({ providers: [{ provide: NOW, useValue: () => fake }] });
    const today = TestBed.inject(TodayService);
    const task = { dueDate: '2026-11-24', completed: false };

    expect(isOverdue(task, today.today())).toBe(false);
    fake = new Date(2026, 10, 25, 0, 1);
    today.refresh(); // to samo robi timer o północy i visibilitychange
    expect(isOverdue(task, today.today())).toBe(true);
  });

  it('powrót do karty (visibilitychange) przelicza dzień', () => {
    let fake = new Date(2026, 10, 24, 22, 0);
    TestBed.configureTestingModule({ providers: [{ provide: NOW, useValue: () => fake }] });
    const today = TestBed.inject(TodayService);
    fake = new Date(2026, 10, 25, 7, 0);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(today.today().getDate()).toBe(25);
  });
});

describe('ToastService (EC-05)', () => {
  it('nowy toast zastępuje poprzedni', () => {
    const toast = TestBed.inject(ToastService);
    toast.show({ message: 'Usunięto „A”', actionLabel: 'Cofnij', action: () => {} });
    toast.show({ message: 'Ułożono zadania wg terminu', actionLabel: 'Cofnij', action: () => {} });
    expect(toast.current()?.message).toBe('Ułożono zadania wg terminu');
    toast.dismiss();
  });
});
