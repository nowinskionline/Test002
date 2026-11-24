# Specyfikacja User Stories – terminy zadań

Źródło: `docs/ba/output/01-extracted-requirements.md`.
Kontekst techniczny ("Todo Artur"): Angular 21 (standalone, Signals), stan w `TaskService`, zapis do `localStorage` (klucz `todoartur.tasks`), model `Task` = `id`, `title`, `categoryId`, `completed`, `createdAt`. Brak backendu i kont. Istnieją: dodawanie (`addTask`), edycja (`updateTask` – obecnie tylko `title`, `categoryId`), przełączanie ukończenia, usuwanie z "Cofnij", ręczne przeciąganie (`reorder`), filtr kategorii, przełącznik "Pokaż ukończone".

Ogólna uwaga o modelu danych: dodanie opcjonalnego pola terminu do `Task` (`src/app/models/task.model.ts`) jest zmianą addytywną. Zadania zapisane wcześniej w `localStorage` nie mają tego pola i muszą być traktowane jako zadania bez terminu (patrz US-03). Format przechowywania terminu (sama data vs data + godzina) zależy od Q-01 i nie jest tu rozstrzygany.

## Przegląd epików

| Epik | Nazwa | Historie |
|------|-------|----------|
| EP-01 | Termin wykonania zadania | US-01, US-02, US-03 |
| EP-02 | Wyróżnianie zadań po terminie | US-04 |
| EP-03 | Porządkowanie i widok według terminów | US-05, US-06 |

---

## EP-01 Termin wykonania zadania

Cel: zadanie może mieć opcjonalny termin, ustawiany i zmieniany przez użytkownika, bez naruszania istniejących danych.

### US-01 Ustawienie terminu przy dodawaniu zadania
*Jako użytkownik aplikacji, chcę podać opcjonalny termin podczas dodawania zadania, aby od razu wiedzieć, kiedy zadanie ma być wykonane.*

Pokrywa: FR-01, FR-02, BR-01
⚠️ zależy od Q-01 (sama data czy data i godzina) oraz Q-08 (sposób wyświetlania terminu przy zadaniu)

**Kryteria akceptacji**

```gherkin
Scenario: Dodanie zadania z terminem
  Given formularz dodawania zadania jest otwarty
  And wpisano tytuł "Oddać raport" i wybrano kategorię "Praca"
  When użytkownik wybierze termin i zatwierdzi formularz
  Then zadanie pojawia się na liście z ustawionym terminem
  And termin jest zapisany w localStorage razem z zadaniem
```

```gherkin
Scenario: Dodanie zadania bez terminu
  Given formularz dodawania zadania jest otwarty
  And wpisano tytuł "Kupić mleko" i wybrano kategorię "Dom"
  When użytkownik zatwierdzi formularz bez wybierania terminu
  Then zadanie zostaje dodane bez terminu
  And nie jest wyświetlany żaden termin przy zadaniu
```

```gherkin
Scenario: Pusty tytuł mimo ustawionego terminu (ścieżka negatywna)
  Given formularz dodawania zadania jest otwarty
  And wybrano termin, ale pole tytułu jest puste lub zawiera same spacje
  When użytkownik spróbuje zatwierdzić formularz
  Then zadanie nie zostaje dodane
  And lista zadań oraz localStorage pozostają bez zmian
```

**Wpływ na kod**
- `src/app/models/task.model.ts` – nowe opcjonalne pole terminu w `Task`. Model danych się zmienia: stare dane w `localStorage` trzeba obsłużyć (patrz US-03).
- `src/app/services/task.service.ts` – `addTask` przyjmuje opcjonalny termin.
- `src/app/components/task-form/task-form.ts` – nowe pole wyboru terminu.
- `src/app/components/task-item/task-item.ts` – wyświetlenie terminu (format wg Q-08).
- `src/app/services/task.service.spec.ts` – testy dodawania z terminem i bez.

### US-02 Zmiana i usunięcie terminu przy edycji
*Jako użytkownik aplikacji, chcę zmienić lub usunąć termin istniejącego zadania, aby aktualizować plan, gdy zmieniają się okoliczności.*

Pokrywa: FR-02, BR-01
⚠️ zależy od Q-01

**Kryteria akceptacji**

```gherkin
Scenario: Zmiana terminu
  Given na liście jest zadanie z terminem
  When użytkownik edytuje zadanie i wybierze inny termin
  Then zadanie wyświetla nowy termin
  And nowy termin jest zapisany w localStorage
```

```gherkin
Scenario: Ustawienie terminu zadaniu, które go nie miało
  Given na liście jest zadanie bez terminu
  When użytkownik edytuje zadanie i ustawi termin
  Then zadanie wyświetla ustawiony termin
```

```gherkin
Scenario: Usunięcie terminu
  Given na liście jest zadanie z terminem
  When użytkownik edytuje zadanie i wyczyści pole terminu
  Then zadanie staje się zadaniem bez terminu
  And pozostałe pola zadania (tytuł, kategoria, stan ukończenia) nie zmieniają się
```

```gherkin
Scenario: Edycja terminu z pustym tytułem (ścieżka negatywna)
  Given na liście jest zadanie z terminem
  When użytkownik wyczyści tytuł i zatwierdzi edycję
  Then zmiany nie zostają zapisane
  And zadanie zachowuje poprzedni tytuł i termin
```

**Wpływ na kod**
- `src/app/services/task.service.ts` – typ `changes` w `updateTask` obecnie to `Partial<Pick<Task, 'title' | 'categoryId'>>`; trzeba dodać termin oraz umożliwić jego jawne usunięcie (wartość "brak terminu").
- `src/app/components/task-item/task-item.ts` – tryb edycji z polem terminu.
- Model danych: zmiana z US-01 (bez dodatkowych zmian).

### US-03 Zgodność wsteczna ze starymi zadaniami
*Jako użytkownik aplikacji, chcę, aby moje dotychczasowe zadania działały po aktualizacji bez zmian i bez terminu, aby nie stracić żadnych danych.*

Pokrywa: FR-06, NFR-01, NFR-02, BR-02

**Kryteria akceptacji**

```gherkin
Scenario: Stare zadania po aktualizacji
  Given w localStorage (klucz todoartur.tasks) są zadania zapisane bez pola terminu
  When użytkownik uruchomi zaktualizowaną aplikację
  Then wszystkie zadania są wyświetlane z dotychczasowym tytułem, kategorią i stanem ukończenia
  And żadne z nich nie ma terminu
  And żadne z nich nie jest oznaczone jako po terminie
```

```gherkin
Scenario: Termin nie jest nadawany automatycznie
  Given w localStorage są stare zadania bez terminu
  When aplikacja wczyta dane
  Then żadne zadanie nie otrzymuje terminu automatycznie
```

```gherkin
Scenario: Zadanie bez terminu można normalnie edytować i ukończyć
  Given stare zadanie bez terminu
  When użytkownik zmieni jego tytuł albo oznaczy je jako ukończone
  Then operacja się udaje
  And zadanie nadal nie ma terminu
```

```gherkin
Scenario: Uszkodzona wartość terminu w localStorage (ścieżka negatywna)
  Given w localStorage zadanie ma nieprawidłową wartość terminu
  When aplikacja wczyta dane
  Then aplikacja się nie wywala
  And zadanie jest traktowane jak zadanie bez terminu, a jego tytuł, kategoria i stan są zachowane
```

**Wpływ na kod**
- `src/app/services/task.service.ts` oraz `src/app/services/storage.ts` – wczytywanie z `localStorage` (`loadJson(TASKS_KEY, [], Array.isArray)` sprawdza obecnie tylko, czy to tablica); trzeba odporne traktowanie braku/uszkodzenia pola terminu. Pole jest opcjonalne, więc migracja danych nie jest konieczna, ale obsługa braku pola – tak.
- `src/app/services/task.service.spec.ts` – test wczytania danych w starym formacie.
- Nie wprowadza żadnego serwera (NFR-02) – wszystko pozostaje w `localStorage`.

---

## EP-02 Wyróżnianie zadań po terminie

Cel: użytkownik od razu widzi, które zadania przekroczyły termin.

### US-04 Wizualne wyróżnienie zadań po terminie
*Jako użytkownik aplikacji, chcę, aby zadania po terminie były wyraźnie wyróżnione na liście, aby szybko zauważyć zaległości.*

Pokrywa: FR-03, BR-03
⚠️ zależy od Q-02 (kiedy zadanie jest "po terminie"), Q-03 (czy ukończone zadania po terminie są wyróżniane) oraz Q-07 (dodatkowe wyróżnienia, np. tekstowa etykieta dla dostępności)

**Kryteria akceptacji**

```gherkin
Scenario: Zadanie z terminem w przeszłości jest wyróżnione
  Given nieukończone zadanie ma termin, który już minął (wg definicji z Q-02)
  When użytkownik wyświetli listę zadań
  Then to zadanie jest wizualnie wyróżnione (np. kolorem czerwonym)
```

```gherkin
Scenario: Zadanie z terminem w przyszłości nie jest wyróżnione
  Given nieukończone zadanie ma termin w przyszłości
  When użytkownik wyświetli listę zadań
  Then zadanie wygląda tak samo jak zadanie bez terminu
```

```gherkin
Scenario: Zadanie bez terminu nigdy nie jest po terminie (ścieżka negatywna)
  Given nieukończone zadanie nie ma terminu
  When użytkownik wyświetli listę zadań
  Then zadanie nie jest oznaczone jako po terminie
```

```gherkin
Scenario: Wyróżnienie znika po zmianie terminu
  Given zadanie jest wyróżnione jako po terminie
  When użytkownik ustawi termin w przyszłości
  Then zadanie przestaje być wyróżnione
```

**Wpływ na kod**
- `src/app/components/task-item/task-item.ts` – klasy stylu (Tailwind; pełne nazwy klas, jak w `CATEGORY_COLORS`), także dla motywu ciemnego.
- Ewentualnie `src/app/services/task.service.ts` lub osobna funkcja pomocnicza – wyliczanie "po terminie" względem bieżącej daty.
- Model danych: bez dodatkowych zmian (wyróżnienie jest wyliczane, nie zapisywane).

---

## EP-03 Porządkowanie i widok według terminów

Cel: użytkownik może porządkować listę według terminów oraz zobaczyć, co jest do zrobienia dziś.

### US-05 Sortowanie listy po terminie
*Jako użytkownik aplikacji, chcę posortować listę zadań po terminie, aby zobaczyć, co jest najpilniejsze, zamiast ręcznie przeciągać zadania.*

Pokrywa: FR-04
⚠️ zależy od Q-06 (miejsce zadań bez terminu, współdziałanie z ręczną kolejnością i przeciąganiem)

**Kryteria akceptacji**

```gherkin
Scenario: Sortowanie rosnąco po terminie
  Given na liście są zadania z różnymi terminami
  When użytkownik włączy sortowanie po terminie
  Then zadania są ułożone od najwcześniejszego do najpóźniejszego terminu
```

```gherkin
Scenario: Zadania bez terminu przy sortowaniu
  Given na liście są zadania z terminem i zadania bez terminu
  When użytkownik włączy sortowanie po terminie
  Then zadania bez terminu są umieszczone zgodnie z decyzją z Q-06
  And żadne zadanie nie znika z listy
```

```gherkin
Scenario: Sortowanie współgra z filtrem kategorii
  Given wybrano filtr kategorii "Praca"
  When użytkownik włączy sortowanie po terminie
  Then posortowane są tylko widoczne zadania z kategorii "Praca"
```

```gherkin
Scenario: Powrót do ręcznej kolejności (ścieżka negatywna / brak utraty danych)
  Given wcześniej ręcznie ułożono zadania przeciąganiem
  When użytkownik włączy, a potem wyłączy sortowanie po terminie
  Then zachowanie ręcznej kolejności jest zgodne z decyzją z Q-06
  And żadne zadanie nie zostaje utracone ani zduplikowane
```

**Wpływ na kod**
- `src/app/components/task-list/task-list.ts` – kontrolka trybu sortowania, logika sortowania (`computed`), interakcja z przeciąganiem (CDK drag-drop).
- `src/app/services/task.service.ts` – `reorder` zakłada ręczną kolejność; zależnie od Q-06 może wymagać zmiany lub wyłączenia w trybie sortowania.
- Model danych: zależy od Q-06 (jeśli sortowanie ma trwale zmieniać kolejność, kolejność jest już zapisana w tablicy zadań – bez nowych pól; jeśli tryb sortowania ma być zapamiętywany, potrzebny nowy klucz w `localStorage` i obsługa jego braku).

### US-06 Widok "Dziś"
*Jako użytkownik aplikacji, chcę widok "Dziś" z zadaniami na dziś i zaległymi, aby skupić się na tym, co trzeba zrobić teraz.*

Pokrywa: FR-05, BR-04
⚠️ zależy od Q-05 (czy widok jest wymagany, jego forma i współdziałanie z filtrem kategorii i "Pokaż ukończone"), Q-02 (czy zadanie z terminem "dziś" jest już zaległe)

**Kryteria akceptacji**

```gherkin
Scenario: Widok "Dziś" pokazuje zadania na dziś i zaległe
  Given są zadania z terminem wczoraj, dziś i jutro oraz zadanie bez terminu
  When użytkownik otworzy widok "Dziś"
  Then widoczne są zadania z terminem wczoraj i dziś
  And zadania z terminem jutro oraz zadanie bez terminu nie są widoczne
```

```gherkin
Scenario: Widok "Dziś" bez zadań
  Given żadne zadanie nie ma terminu na dziś ani zaległego
  When użytkownik otworzy widok "Dziś"
  Then wyświetlany jest komunikat o braku zadań na dziś
```

```gherkin
Scenario: Ukończone zadania w widoku "Dziś"
  Given zadanie z terminem na dziś jest ukończone
  When użytkownik otworzy widok "Dziś"
  Then jego widoczność zależy od przełącznika "Pokaż ukończone" (szczegóły wg Q-05)
```

```gherkin
Scenario: Wyjście z widoku "Dziś" (ścieżka negatywna / brak wpływu na dane)
  Given użytkownik jest w widoku "Dziś"
  When wróci do pełnej listy
  Then widoczne są wszystkie zadania zgodnie z dotychczasowymi filtrami
  And żadne dane zadań nie zostały zmienione
```

**Wpływ na kod**
- `src/app/components/task-list/task-list.ts` (filtry) oraz `src/app/app.ts` (ewentualna nawigacja/przełącznik widoku).
- Wyliczanie "dziś" względem bieżącej daty; spójne z definicją "po terminie" z US-04.
- Model danych: bez zmian (widok jest filtrem wyliczanym); jeśli wybrany widok miałby być zapamiętywany, nowy klucz w `localStorage`.

---

## Poza zakresem (zgodnie z 01-extracted-requirements.md)
- Przypomnienia i powiadomienia na telefonie (Q-04) – brak historii do czasu decyzji.
- Automatyczne nadawanie terminów istniejącym zadaniom (BR-02).
- Backend, konta użytkowników, synchronizacja między urządzeniami (BR-05).

## Tabela pokrycia wymagań funkcjonalnych

| Wymaganie | Historie |
|-----------|----------|
| FR-01 | US-01 |
| FR-02 | US-01, US-02 |
| FR-03 | US-04 |
| FR-04 | US-05 |
| FR-05 | US-06 |
| FR-06 | US-03 |

Pozostałe wymagania: NFR-01, NFR-02, BR-02 → US-03; BR-01 → US-01, US-02; BR-03 → US-04; BR-04 → US-06; BR-05 → poza zakresem/ograniczenie.

## Zależności od otwartych pytań

| Pytanie | Dotyczy historii |
|---------|------------------|
| Q-01 | US-01, US-02 (pośrednio US-04, US-06) |
| Q-02 | US-04, US-06 |
| Q-03 | US-04 |
| Q-04 | brak historii (poza zakresem) |
| Q-05 | US-06 |
| Q-06 | US-05 |
| Q-07 | US-04 |
| Q-08 | US-01 |
