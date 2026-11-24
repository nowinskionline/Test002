# Specyfikacja User Stories – terminy zadań ("Todo Artur")

Źródła: `01-extracted-requirements.md`, `docs/ba/input/przyklad-terminy-zadan-decyzje.md` (decyzje Artura, pierwszeństwo przed notatkami), `03-qa-review-report.md` (edge case'y i kontrakty techniczne wpisane jako AC).

Stan kodu, który ma znaczenie: `Task` ma `id`, `title`, `categoryId`, `completed`, `createdAt`. Brak serwera i logowania; stan w `TaskService` (sygnały), zapis przez `saveJson` do `localStorage` (`todoartur.tasks`). `updateTask` robi `{ ...t, ...changes }`. `reorder` działa na liście widocznych nieukończonych zadań. `loadJson` waliduje dziś tylko `Array.isArray`.

Poza zakresem: przypomnienia (decyzja Q-04 z dokumentu decyzji, usunięte), trwały tryb sortowania po terminie, osobny widok "Dziś", backend i konta.

## Kontrakty techniczne (obowiązują we wszystkich historiach)

- **K-01 Model danych.** `Task` dostaje dwa opcjonalne pola: `dueDate?: string` (lokalna data `YYYY-MM-DD`) i `dueTime?: string` (`HH:mm`, 24h). `dueTime` ma sens tylko razem z `dueDate`. Sama data jest poprawnym terminem.
- **K-02 Kontrakt aktualizacji.** W `updateTask`: `dueDate: null` = usuń termin (razem z `dueTime`); `dueTime: null` = usuń samą godzinę; brak klucza w `changes` = bez zmian; wartość nieprawidłowa = cała zmiana odrzucona. Edycja samego tytułu lub kategorii nigdy nie zmienia terminu.
- **K-03 Wspólny moduł czasu** (np. `src/app/utils/due-date.ts`), funkcje przyjmują `now: Date` jako parametr: `isValidDueDate`, `isValidDueTime`, `toLocalDateKey(now)`, `isToday(task, now)`, `isOverdue(task, now)`, `formatDue(task, now)`, `normalizeTask(raw)`. Nikt poza tym modułem nie liczy "dziś", "jutro" ani zaległości.
- **K-04 Definicje.** Porównanie po kluczu dnia lokalnego (`YYYY-MM-DD`, porównanie tekstowe), nie przez różnicę 24 h (odporność na zmianę czasu). `isToday` = `dueDate === dziś`. `isOverdue` = zadanie nieukończone i `dueDate < dziś`. Godzina nie wpływa na żadną z tych funkcji. Strefa: lokalna strefa przeglądarki.
- **K-05 Odświeżanie doby.** Sygnał `today` jest przeliczany o lokalnej północy (timer do następnej północy oraz ponowne sprawdzenie przy `visibilitychange`), więc wyróżnienia i filtr "Dziś" zmieniają się bez przeładowania strony.
- **K-06 Normalizacja przy wczytaniu.** Wykonywana raz przy wczytaniu w pamięci; nic nie jest zapisywane zwrotnie do `localStorage`, dopóki użytkownik nie wykona zwykłej zmiany (wtedy zapisuje się cały stan).
- **K-07 Zakres dat.** Dozwolone daty kalendarzowo istniejące w zakresie 1900-01-01 do 2100-12-31 (założenie techniczne, do wglądu BA).

## Założenia domyślne (otwarte pytania drobne z 01)

| Pytanie | Założenie domyślne | Gdzie użyte |
|---|---|---|
| Q-01 | Filtr "Dziś" podlega przełącznikowi "Pokaż ukończone" tak jak cała lista; domyślnie pokazuje tylko nieukończone zadania z terminem dziś lub wcześniejszym. Po włączeniu przełącznika ukończone z terminem dziś lub wcześniejszym pokazują się w części ukończonych. | US-08 |
| Q-02 | Termin w przeszłości jest dozwolony (zadanie od razu zaległe, bez ostrzeżenia). Termin można usunąć w edycji. | US-01, US-02 |
| Q-03 | Akcja "Ułóż po terminie" wchodzi do zakresu. Działa na zadaniach widocznych (nieukończone, po aktywnych filtrach), pozostałe zostają na swoich miejscach (tak jak `reorder`). Porządek: data rosnąco; w tej samej dacie najpierw zadania z godziną (rosnąco), potem bez godziny; remisy zachowują dotychczasową kolejność; bez terminu na końcu, też w dotychczasowej kolejności. | US-10 |
| Q-04 | Akcja jest odwracalna przez toast "Cofnij" (jak przy usuwaniu), bez okna potwierdzenia. | US-10 |
| Q-05 | Wyróżnienie: czerwona etykieta w stylu istniejących badge'y (jasny: `red-100` tło / `red-800` tekst; ciemny: `red-500/15` tło / `red-300` tekst); kontrast tekstu co najmniej 4.5:1 (WCAG AA) w obu motywach. | US-05 |
| Q-06 | Format: "dziś", "jutro", "wczoraj"; pozostałe daty "pt 28.11"; data z innego roku niż bieżący ma rok: "pt 28.11.2027". Godzina dopisana po spacji ("jutro 09:30"). Brak osobnego formatu dla dat odleglejszych niż tydzień. | US-07 |
| Q-07 | Ukończone zadanie nadal pokazuje swój termin, w stonowanym stylu, bez czerwieni i bez etykiety "Po terminie". | US-06, US-07 |

## Epiki

- EP-01 Termin w modelu i formularzach (US-01, US-02, US-03)
- EP-02 Rozpoznawanie i wyróżnianie zaległości (US-04, US-05, US-06)
- EP-03 Prezentacja terminu (US-07)
- EP-04 Filtr "Dziś" (US-08)
- EP-05 Kolejność zadań (US-09, US-10)
- EP-06 Trwałość danych (US-11)

---

## EP-01 Termin w modelu i formularzach

### US-01 Dodanie zadania z terminem
*Jako użytkownik, chcę przy dodawaniu zadania opcjonalnie podać datę i godzinę, aby zaplanować je w czasie.*
Pokrywa: FR-01, FR-02, BR-01. Założenie domyślne (Q-02).

```gherkin
Scenario: Dodanie zadania z samą datą
  Given formularz dodawania jest otwarty i wpisano tytuł "Raport"
  When użytkownik wybierze datę 2026-12-01, zostawi godzinę pustą i zatwierdzi
  Then zadanie jest dodane z dueDate "2026-12-01" i bez dueTime
  And termin jest zapisany w localStorage

Scenario: Dodanie zadania z datą i godziną
  Given wpisano tytuł "Spotkanie"
  When użytkownik wybierze datę 2026-12-01 i godzinę 14:00 i zatwierdzi
  Then zadanie ma dueDate "2026-12-01" i dueTime "14:00"

Scenario: Dodanie zadania bez terminu
  Given wpisano tytuł "Zakupy" i pola terminu są puste
  When użytkownik zatwierdzi formularz
  Then zadanie jest dodane bez dueDate i bez dueTime

Scenario: Dodanie zadania z terminem w przeszłości (założenie domyślne Q-02)
  Given wpisano tytuł "Zaległe sprawozdanie" i wybrano datę wczorajszą
  When użytkownik zatwierdzi formularz
  Then zadanie jest dodane bez ostrzeżenia
  And jest od razu oznaczone jako po terminie

Scenario: Godzina bez daty (ścieżka negatywna)
  Given wpisano tytuł "Test", data jest pusta, wybrano godzinę 10:00
  When użytkownik zatwierdzi formularz
  Then zadanie nie zostaje dodane
  And użytkownik widzi komunikat, że godzina wymaga daty

Scenario: Nieprawidłowa lub spoza zakresu data (ścieżka negatywna)
  Given wpisano tytuł "Test"
  When użytkownik poda nieistniejącą datę (np. 31.02) lub datę spoza 1900-2100
  Then zadanie nie zostaje dodane
  And użytkownik widzi komunikat o błędnym terminie
  And localStorage pozostaje bez zmian
```

**Wpływ na kod:** `models/task.model.ts` (pola `dueDate?`, `dueTime?`), `services/task.service.ts` (`addTask` przyjmuje opcjonalny termin i waliduje go), formularz dodawania w `task-list`/komponencie dodawania, nowy `utils/due-date.ts`. Zmiana modelu: pola opcjonalne, stare dane w `localStorage` muszą nadal się wczytywać (patrz US-03).

### US-02 Edycja i usuwanie terminu
*Jako użytkownik, chcę zmienić lub usunąć termin istniejącego zadania, aby plan odpowiadał rzeczywistości.*
Pokrywa: FR-01, FR-02, BR-01. Założenie domyślne (Q-02).

```gherkin
Scenario: Zmiana terminu
  Given zadanie "Raport" ma termin 2026-12-01
  When użytkownik zmieni datę na 2026-12-05 i godzinę na 09:30 i zatwierdzi
  Then zadanie ma dueDate "2026-12-05" i dueTime "09:30"

Scenario: Usunięcie terminu (kontrakt K-02: null = usuń)
  Given zadanie ma dueDate "2026-12-01" i dueTime "14:00"
  When użytkownik wyczyści datę i zatwierdzi (komponent wysyła dueDate: null)
  Then zadanie nie ma dueDate ani dueTime
  And w localStorage nie ma tych kluczy ani wartości null

Scenario: Brak klucza = bez zmian (kontrakt K-02)
  Given zadanie "Raport" ma termin 2026-12-01
  When wywołano updateTask z samym { title: "Raport roczny" } albo samą zmianą kategorii
  Then tytuł lub kategoria jest zmieniona
  And dueDate nadal wynosi "2026-12-01"

Scenario: Edycja terminu zadania ukończonego
  Given przełącznik "Pokaż ukończone" jest włączony i ukończone zadanie ma termin w przeszłości
  When użytkownik zmieni termin na przyszły
  Then zadanie pozostaje ukończone i termin jest zaktualizowany

Scenario: Nieprawidłowy termin przy edycji (ścieżka negatywna)
  Given zadanie ma termin 2026-12-01
  When użytkownik zatwierdzi edycję z nieistniejącą datą
  Then cała zmiana jest odrzucona, zadanie zachowuje poprzedni tytuł i termin
  And użytkownik widzi komunikat o błędnym terminie
```

**Wpływ na kod:** `task.service.ts` (`updateTask`: typ `changes` z `dueDate?: string | null`, `dueTime?: string | null`; obsługa `null` przez usunięcie klucza, nie przez zapis `null`), `task-list.ts` (metoda `edit` wysyła dziś tylko `title` i `categoryId`; po zmianie wysyła `dueDate` wyłącznie, gdy użytkownik edytował termin lub formularz zawsze wysyła pełny stan terminu), szablon edycji. Model: bez dodatkowej zmiany ponad US-01.

### US-03 Zgodność wsteczna i odporne wczytywanie danych
*Jako użytkownik, chcę, aby moje dotychczasowe zadania działały po aktualizacji, a uszkodzone dane nie psuły aplikacji, aby nie stracić listy.*
Pokrywa: FR-03, NFR-01.

```gherkin
Scenario: Stare zadania bez terminu
  Given w localStorage są zadania zapisane bez pól dueDate i dueTime
  When aplikacja wczyta dane
  Then wszystkie zadania są widoczne jak dotąd, bez terminu i bez oznaczenia po terminie
  And żadne dane nie są zmieniane w localStorage tylko przez samo wczytanie

Scenario Outline: Nieprawidłowa wartość dueDate (normalizacja przy wczytaniu)
  Given w localStorage zadanie ma dueDate równe <wartosc>
  When aplikacja wczyta dane
  Then aplikacja się nie wywala
  And zadanie jest wyświetlane bez terminu i nie jest po terminie
  Examples:
    | wartosc      |
    | "abc"        |
    | 12345        |
    | {}           |
    | ""           |
    | "2026-02-31" |
    | null         |

Scenario: Nieprawidłowa godzina przy poprawnej dacie
  Given zadanie ma dueDate "2026-12-01" i dueTime "25:99"
  When aplikacja wczyta dane
  Then zadanie ma termin 2026-12-01 bez godziny

Scenario: Godzina bez daty
  Given zadanie ma dueTime "10:00" i brak dueDate
  When aplikacja wczyta dane
  Then dueTime jest ignorowane

Scenario: Elementy tablicy nie będące zadaniami (ścieżka negatywna)
  Given tablica w todoartur.tasks zawiera null, liczbę, obiekt bez id lub title oraz jedno poprawne zadanie
  When aplikacja wczyta dane
  Then aplikacja się nie wywala
  And wyświetlone jest tylko poprawne zadanie
```
Normalizacja zgodnie z K-06: tylko w pamięci, bez zapisu zwrotnego do czasu pierwszej zwykłej zmiany.

**Wpływ na kod:** `services/storage.ts` i inicjalizacja `_tasks` w `task.service.ts` (zamiast samego `Array.isArray` wywołanie `normalizeTask` na każdym elemencie), `utils/due-date.ts`, test parametryczny w `task.service.spec.ts`. Model: dodane pola opcjonalne, migracja nie jest potrzebna, ale stare i uszkodzone dane trzeba obsłużyć w wersji z `localStorage`.

---

## EP-02 Rozpoznawanie i wyróżnianie zaległości

### US-04 Jednoznaczna definicja "dziś" i "po terminie"
*Jako użytkownik, chcę, aby zadanie było zaległe dopiero po północy dnia terminu, aby zadanie na dziś nie było fałszywie oznaczone jako spóźnione.*
Pokrywa: FR-04, BR-02, BR-03, NFR-03.

```gherkin
Scenario Outline: Granica dnia (dziś = 2026-11-24, zadanie nieukończone)
  Given zadanie ma dueDate <data> i dueTime <godzina>
  When aplikacja policzy status
  Then isToday zwraca <dzis> i isOverdue zwraca <zalegle>
  Examples:
    | data       | godzina | dzis  | zalegle |
    | 2026-11-24 |         | true  | false   |
    | 2026-11-24 | 00:01   | true  | false   |
    | 2026-11-24 | 08:00   | true  | false   |
    | 2026-11-23 | 23:59   | false | true    |
    | 2026-11-25 |         | false | false   |

Scenario: Godzina nie przyspiesza zaległości
  Given jest 2026-11-24 15:00 i zadanie ma termin 2026-11-24 08:00
  When aplikacja wyświetli listę
  Then zadanie nie jest po terminie

Scenario: Przejście północy przy otwartej aplikacji
  Given zadanie z terminem na dziś jest widoczne i nie jest po terminie
  When lokalny zegar przejdzie na następny dzień, bez przeładowania strony
  Then zadanie jest oznaczone jako po terminie

Scenario: Zadanie bez terminu lub z uszkodzonym terminem (ścieżka negatywna)
  Given zadanie nie ma dueDate
  When aplikacja policzy status
  Then isToday i isOverdue zwracają false
```

**Wpływ na kod:** nowy `utils/due-date.ts` (`isToday`, `isOverdue` z parametrem `now`, jedno źródło prawdy dla US-05, US-06, US-08), sygnał `today` w `task.service.ts` lub osobnym serwisie z timerem do północy i `visibilitychange`, testy jednostkowe (wczoraj, dziś, jutro, przełom doby, zmiana czasu letni/zimowy). Model danych bez zmian.

### US-05 Wyróżnienie zadania po terminie
*Jako użytkownik, chcę widzieć zaległe zadania na czerwono z napisem "Po terminie", aby od razu je zauważyć także bez rozróżniania kolorów.*
Pokrywa: FR-05, NFR-02, NFR-04. Założenie domyślne (Q-05).

```gherkin
Scenario: Zaległe zadanie jest wyróżnione
  Given nieukończone zadanie ma termin wczorajszy
  When użytkownik zobaczy listę
  Then zadanie ma czerwone wyróżnienie
  And ma widoczną tekstową etykietę "Po terminie"

Scenario: Czytelność w obu motywach
  Given istnieje zadanie po terminie
  When użytkownik przełączy motyw jasny i ciemny
  Then etykieta i czerwone wyróżnienie są widoczne w obu motywach
  And kontrast tekstu etykiety wynosi co najmniej 4.5:1

Scenario: Informacja nie opiera się tylko na kolorze
  Given zadanie jest po terminie
  When kolor zostanie zignorowany (np. skala szarości)
  Then etykieta "Po terminie" nadal jest czytelna i dostępna dla czytnika ekranu

Scenario: Zadanie na dziś i bez terminu nie jest wyróżnione (ścieżka negatywna)
  Given nieukończone zadanie ma termin na dziś, a inne nie ma terminu
  When użytkownik zobaczy listę
  Then żadne z nich nie ma etykiety "Po terminie"

Scenario: Cofnięcie usunięcia zadania po terminie
  Given zadanie po terminie zostało usunięte i widoczny jest toast "Cofnij"
  When użytkownik kliknie "Cofnij"
  Then zadanie wraca na dawną pozycję ze swoim terminem i jest znowu wyróżnione
```
(Przy bardzo długim tytule na wąskim ekranie etykieta i termin zawijają się w układzie, bez poziomego przewijania.)

**Wpływ na kod:** komponent elementu zadania (`task-item`: etykieta, klasy Tailwind pisane w całości dla trybu jasnego i `dark:`), `task-list` (użycie `isOverdue` z sygnałem `today`). Model bez zmian.

### US-06 Ukończone zadania nie są oznaczane jako po terminie
*Jako użytkownik, chcę, aby ukończone zadanie nie świeciło na czerwono, aby alarmowały mnie tylko sprawy do zrobienia.*
Pokrywa: FR-06, BR-04. Założenie domyślne (Q-07).

```gherkin
Scenario: Ukończenie zaległego zadania
  Given nieukończone zadanie jest po terminie
  When użytkownik oznaczy je jako ukończone
  Then zadanie traci czerwone wyróżnienie i etykietę "Po terminie"
  And nadal pokazuje swój termin w stonowanym stylu

Scenario: Cofnięcie ukończenia
  Given ukończone zadanie ma termin w przeszłości
  When użytkownik odznaczy je jako ukończone
  Then zadanie jest ponownie wyróżnione jako po terminie

Scenario: isOverdue dla ukończonego (ścieżka negatywna)
  Given ukończone zadanie ma dueDate sprzed tygodnia
  When wywołano isOverdue
  Then wynik to false
```

**Wpływ na kod:** `utils/due-date.ts` (`isOverdue` zwraca `false` dla `completed`), `task-item`. Model bez zmian.

---

## EP-03 Prezentacja terminu

### US-07 Względny format terminu na zadaniu
*Jako użytkownik, chcę widzieć termin jako "dziś", "jutro" lub "pt 28.11", aby szybko ocenić, kiedy coś trzeba zrobić.*
Pokrywa: FR-07. Założenie domyślne (Q-06, Q-07).

```gherkin
Scenario Outline: Format terminu (dziś = wtorek 2026-11-24)
  Given zadanie ma dueDate <data> i dueTime <godzina>
  When użytkownik zobaczy zadanie
  Then termin jest wyświetlony jako <tekst>
  Examples:
    | data       | godzina | tekst            |
    | 2026-11-24 |         | dziś             |
    | 2026-11-24 | 14:00   | dziś 14:00       |
    | 2026-11-25 |         | jutro            |
    | 2026-11-23 |         | wczoraj          |
    | 2026-11-28 |         | sb 28.11         |
    | 2026-11-28 | 09:30   | sb 28.11 09:30   |
    | 2027-01-15 |         | pt 15.01.2027    |

Scenario: Ukończone zadanie nadal pokazuje termin
  Given ukończone zadanie ma termin
  When użytkownik pokaże ukończone
  Then termin jest widoczny w stonowanym stylu

Scenario: Zadanie bez terminu (ścieżka negatywna)
  Given zadanie nie ma terminu
  When użytkownik zobaczy zadanie
  Then nie ma żadnego tekstu terminu ani pustego znacznika

Scenario: Zmiana dnia odświeża tekst
  Given zadanie z terminem "jutro" jest widoczne
  When lokalny zegar przejdzie na następny dzień
  Then tekst zmienia się na "dziś" bez przeładowania
```

**Wpływ na kod:** `utils/due-date.ts` (`formatDue`, skróty dni tygodnia po polsku: pn, wt, śr, cz, pt, sb, nd), `task-item`. Model bez zmian.

---

## EP-04 Filtr "Dziś"

### US-08 Filtr "Dziś" obok filtra kategorii
*Jako użytkownik, chcę włączyć filtr "Dziś", aby widzieć tylko zadania na dziś i zaległe, w wybranej kategorii.*
Pokrywa: FR-08, BR-06. Założenie domyślne (Q-01).

```gherkin
Scenario: Filtr pokazuje dziś i zaległe
  Given nieukończone zadania mają terminy: wczoraj, dziś, jutro oraz brak terminu
  When użytkownik włączy filtr "Dziś"
  Then widoczne są zadania z terminem wczoraj i dziś
  And zadania z terminem jutro i bez terminu są ukryte

Scenario: Łączenie z filtrem kategorii
  Given wybrano kategorię "Praca" a zadania na dziś są w "Praca" i "Dom"
  When użytkownik włączy filtr "Dziś"
  Then widoczne są tylko zadania na dziś i zaległe z kategorii "Praca"

Scenario: Przełącznik "Pokaż ukończone" (założenie domyślne Q-01)
  Given filtr "Dziś" jest włączony i istnieje ukończone zadanie z terminem dziś
  When "Pokaż ukończone" jest wyłączone
  Then ukończone zadanie nie jest widoczne
  And po włączeniu przełącznika pojawia się w części ukończonych

Scenario: Pusty wynik (ścieżka negatywna)
  Given w wybranej kategorii "Dom" nie ma zadań na dziś ani zaległych
  When włączono filtr "Dziś"
  Then wyświetlany jest komunikat o braku zadań na dziś w tej kategorii

Scenario: Wyłączenie filtra
  Given filtr "Dziś" jest włączony
  When użytkownik go wyłączy
  Then lista wraca do stanu zgodnego z samym filtrem kategorii
```
Filtr to dodatkowy przełącznik w tym samym ekranie, nie osobny widok.

**Wpływ na kod:** `app.ts` (stan filtra "Dziś" obok filtra kategorii przekazywanego przez `input()`), `task-list.ts` (wspólny `computed` widocznych zadań używany także przez `reorder`/`drop`), szablon pasków filtrów. Model bez zmian; stan filtra nie jest zapisywany (jak `showCompleted`).

---

## EP-05 Kolejność zadań

### US-09 Ręczna kolejność zawsze nadrzędna
*Jako użytkownik, chcę, aby termin nigdy sam nie zmieniał kolejności, którą ułożyłem przeciąganiem, aby moja lista była przewidywalna.*
Pokrywa: FR-09, BR-07.

```gherkin
Scenario: Ustawienie terminu nie zmienia kolejności
  Given zadania A, B, C są ułożone ręcznie
  When użytkownik ustawi lub zmieni termin zadania B
  Then kolejność nadal wynosi A, B, C

Scenario: Nowe zadanie z terminem ląduje na górze
  Given istnieją zadania z terminami w różnych datach
  When użytkownik doda zadanie z terminem wcześniejszym niż wszystkie istniejące
  Then nowe zadanie jest na górze listy, jak każde nowe zadanie

Scenario: Przeciąganie działa jak dotąd
  Given lista zawiera zadania z terminami i bez
  When użytkownik przeciągnie zadanie na inną pozycję
  Then nowa kolejność jest zapisana i zachowana po odświeżeniu

Scenario: Brak trwałego trybu sortowania (ścieżka negatywna)
  Given aplikacja jest w stanie domyślnym
  When użytkownik przejrzy interfejs
  Then nie ma przełącznika trwałego sortowania po terminie
```

**Wpływ na kod:** brak nowej logiki; potwierdzić testami, że `addTask`, `updateTask`, `reorder` w `task.service.ts` nie sortują po terminie. Model bez zmian.

### US-10 Jednorazowa akcja "Ułóż po terminie"
*Jako użytkownik, chcę jednym kliknięciem ułożyć zadania wg terminu, a potem dalej przeciągać je ręcznie, aby szybko uporządkować listę.*
Pokrywa: FR-10, BR-05. Założenia domyślne (Q-03, Q-04).

```gherkin
Scenario: Ułożenie wg terminu
  Given nieukończone zadania: A (bez terminu), B (2026-12-05), C (2026-12-01 14:00), D (2026-12-01), E (bez terminu)
  When użytkownik kliknie "Ułóż po terminie"
  Then kolejność wynosi C, D, B, A, E
  And nowa kolejność jest zapisana w localStorage

Scenario: Remisy zachowują dotychczasową kolejność
  Given trzy zadania mają ten sam termin w kolejności X, Y, Z
  When użytkownik kliknie "Ułóż po terminie"
  Then pozostają w kolejności X, Y, Z

Scenario: Akcja przy aktywnym filtrze (Q-03)
  Given aktywny jest filtr kategorii "Praca" lub filtr "Dziś"
  When użytkownik kliknie "Ułóż po terminie"
  Then uporządkowane są tylko widoczne zadania, a niewidoczne zostają na swoich pozycjach

Scenario: Cofnięcie akcji (Q-04)
  Given akcja została wykonana i widoczny jest toast "Cofnij"
  When użytkownik kliknie "Cofnij"
  Then przywracana jest poprzednia ręczna kolejność

Scenario: Dalsze przeciąganie po akcji
  Given akcja została wykonana
  When użytkownik przeciągnie zadanie
  Then kolejność zmienia się ręcznie i nie jest automatycznie przywracana wg terminu

Scenario: Brak zadań do ułożenia (ścieżka negatywna)
  Given widoczna lista ma 0 lub 1 zadanie albo kolejność już zgadza się z terminami
  When użytkownik kliknie "Ułóż po terminie"
  Then nic się nie zmienia, nie pojawia się toast "Cofnij" i nic nie jest zapisywane
```

**Wpływ na kod:** `task.service.ts` (nowa metoda np. `sortByDue(visibleIds)` używająca tej samej techniki co `reorder`, zwracająca poprzednią kolejność dla "Cofnij"), `task-list.ts` i szablon (przycisk, toast), `utils/due-date.ts` (komparator). Model bez zmian.

---

## EP-06 Trwałość danych

### US-11 Informacja o niezapisaniu zmian
*Jako użytkownik, chcę wiedzieć, gdy zadanie z terminem nie zapisało się trwale, aby nie stracić danych po odświeżeniu.*
Pokrywa: NFR-01.

```gherkin
Scenario: Przepełnione localStorage
  Given localStorage odrzuca zapis (przekroczony limit)
  When użytkownik doda zadanie "Oddać raport" z terminem
  Then aplikacja się nie wywala
  And użytkownik widzi komunikat, że zmiana nie została zapisana trwale

Scenario: Poprawny zapis (ścieżka negatywna dla komunikatu)
  Given localStorage działa
  When użytkownik doda lub zmieni zadanie
  Then nie pojawia się komunikat o błędzie zapisu
```
Ograniczenie świadomie nierozwiązywane: zmiany w wielu kartach jednocześnie (ostatni zapis wygrywa, brak nasłuchu `storage`); do udokumentowania w README.

**Wpływ na kod:** `services/storage.ts` (`saveJson` zwraca wynik zamiast połykać błąd), `task.service.ts` (sygnał błędu zapisu), komponent z toastami. Model bez zmian.

---

## Tabela pokrycia

| Wymaganie | Historie |
|---|---|
| FR-01 | US-01, US-02 |
| FR-02 | US-01 (dodawanie), US-02 (edycja) |
| FR-03 | US-03 |
| FR-04 | US-04 |
| FR-05 | US-05 |
| FR-06 | US-06 |
| FR-07 | US-07 |
| FR-08 | US-08 |
| FR-09 | US-09 |
| FR-10 | US-10 |
| NFR-01 | US-03, US-11 |
| NFR-02 | US-05 |
| NFR-03 | US-04 |
| NFR-04 | US-05 |
| BR-01 | US-01, US-02 |
| BR-02, BR-03 | US-04 |
| BR-04 | US-06 |
| BR-05 | US-10 |
| BR-06 | US-08 |
| BR-07 | US-09 |

Podsumowanie: 6 epików, 11 historii; wszystkie FR pokryte. Żadna historia nie jest zablokowana: wszystkie otwarte pytania Q-01 do Q-07 z pliku 01 mają założenia domyślne w sekcji powyżej.
