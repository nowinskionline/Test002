import { TestBed } from '@angular/core/testing';
import { TASKS_KEY, TaskService } from './task.service';

/**
 * Jeden prosty test, żeby pokazać, "o co chodzi":
 *  1. przygotuj (arrange) – czysty localStorage i świeży serwis,
 *  2. działaj (act)       – dodaj zadanie,
 *  3. sprawdź (assert)    – zadanie jest w stanie i w localStorage.
 *
 * Uruchom: npm test
 */
describe('TaskService', () => {
  beforeEach(() => localStorage.clear());

  it('dodaje zadanie i zapisuje je w localStorage', () => {
    const service = TestBed.inject(TaskService);

    service.addTask('  Kupić mleko  ', 'dom');

    expect(service.tasks().length).toBe(1);
    expect(service.tasks()[0].title).toBe('Kupić mleko'); // spacje obcięte
    expect(service.tasks()[0].completed).toBe(false);

    const saved = JSON.parse(localStorage.getItem(TASKS_KEY)!);
    expect(saved[0].title).toBe('Kupić mleko');
  });
});
