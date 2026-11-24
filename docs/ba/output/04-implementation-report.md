# Raport implementacji – terminy zadań ("Todo Artur")

Wejście: `02-user-stories-spec.md`, `03-qa-review-report.md`, `docs/ba/input/przyklad-terminy-zadan-decyzje.md`.
Plik `docs/ba/input/pomysly-zaleglosci-inbox-energia.md` świadomie pominięty (inna funkcja, bez analizy).

## Wynik

| Polecenie | Wynik |
|---|---|
| `npm run build` | OK – bundle wygenerowany bez błędów i ostrzeżeń (initial 314 kB / 79 kB transfer) |
| `npm test` | OK – 2 pliki testów, **111 testów zaliczonych**, 0 błędów |

## Zaimplementowane historie

Wszystkie: US-01 … US-11.

| US | Co zrobiono | Testy (plik → opis) |
|---|---|---|
| US-01 Dodanie z terminem | Natywne pola `type="date"` (min/max 1900–2100) i `type="time"` w formularzu. `addTask(title, cat, {dueDate, dueTime})` waliduje i zwraca wynik; formularz czyści się tylko po sukcesie, błąd inline pod polem. | `task.service.spec` → „US-01 …” (sama data, data+godzina, bez terminu, przeszłość = zaległe, godzina bez daty, 4 złe daty, 2 daty graniczne – EC-02) |
| US-02 Edycja/usuwanie | W edycji pola daty i godziny wypełnione bieżącym terminem (N-07). Formularz zawsze wysyła pełny stan terminu (`''` → `null`). `updateTask` realizuje K-02, nie zapisuje kluczy `null`. Edycja zamyka się tylko po sukcesie. | „US-02 …” (zmiana, `dueDate:null`, `dueTime:null` – EC-01, brak klucza = bez zmian, ukończone, odrzucenie całej zmiany, godzina przy usuwanej dacie, pusty tytuł) |
| US-03 Zgodność wsteczna | `loadTasks()` normalizuje każdy element (`normalizeTask`), pomija śmieci, unikalizuje zdublowane `id`, nieznana kategoria → pierwsza istniejąca. Bez zapisu zwrotnego do `todoartur.tasks` (K-06). | `due-date.spec` → „normalizeTask” (6 złych `dueDate`, zła godzina, godzina bez daty, nie-zadania, złe typy pól); `task.service.spec` → „US-03 …” (stare dane bez zapisu, śmieci + kopia, 3 nieczytelne JSON – EC-07, duplikaty id – EC-08, kategoria `7`) |
| US-04 Dziś / po terminie | `isToday`, `isOverdue` w `utils/due-date.ts` – porównanie kluczy `YYYY-MM-DD` w strefie lokalnej, godzina bez wpływu. `TodayService.today` odświeżany timerem do północy i przy `visibilitychange`; zegar wstrzykiwany tokenem `NOW` (R-01). | `due-date.spec` → tabela granicy dnia, brak/uszkodzony termin, przejście północy; „zmiana czasu i strefy” (5 przypadków Europe/Warsaw DST + America/Los_Angeles – EC-09); `task.service.spec` → „TodayService” (północ, visibilitychange) |
| US-05 Wyróżnienie | Tekst terminu na czerwono (`text-red-700` / `dark:text-red-300`) + etykieta „Po terminie” (`bg-red-100 text-red-800` / `dark:bg-red-500/15 dark:text-red-300`) – N-03: czerwony jest tekst terminu i etykieta. Etykieta jest tekstem (czytnik ekranu, skala szarości). Wiersz metadanych `flex-wrap`, więc długie tytuły zawijają się (EC-11). | `task.service.spec` → „US-05 cofnięcie usunięcia zachowuje termin”; reszta wizualna – sprawdzenie ręczne (brak testów komponentów w projekcie) |
| US-06 Ukończone bez czerwieni | `isOverdue` zwraca `false` dla ukończonych; termin ukończonego w stonowanym szarym. | `due-date.spec` → „ukończone zadanie nigdy nie jest po terminie” |
| US-07 Format | `formatDue`: dziś/jutro/wczoraj, `sb 28.11`, rok gdy inny niż bieżący, godzina po spacji. Brak terminu = brak elementu. | `due-date.spec` → 13 przypadków (US-07 + EC-10), przełom roku, „jutro” → „dziś” po zmianie dnia |
| US-08 Filtr „Dziś” | Przycisk „Dziś” (`aria-pressed`) obok filtrów kategorii, łączy się z kategorią (`matchesFilters`). **Wariant R-02**: nieukończone na dziś + zaległe; ukończone tylko z terminem dokładnie dziś i tylko po „Pokaż ukończone”. Pusty wynik: „Brak zadań na dziś ani zaległych w kategorii „X””. Toast, gdy dodane/edytowane zadanie wypada poza filtr (EC-03). | `due-date.spec` → „filtr Dziś” (nieukończone, ukończone dziś vs przeszłość, łączenie z kategorią, wyłączenie filtra) |
| US-09 Ręczna kolejność | Bez sortowania automatycznego; nowe zadanie zawsze na górze. `drop` liczy indeks źródłowy z `cdkDragData` (id), nie z `previousIndex` (EC-04). | `task.service.spec` → „US-09 …” (termin nie zmienia kolejności, nowe na górze) + „po akcji ręczne przeciąganie działa” |
| US-10 „Ułóż po terminie” | Przycisk nad listą (gdy ≥ 2 widoczne nieukończone). `sortByDue(visibleIds)` – stabilny sort `compareByDue`, tylko widoczne zadania, reszta na swoich slotach; zwraca poprzednią kolejność albo `null` (brak zmian = brak zapisu i toasta). „Cofnij” → `restoreOrder` (B-03). | `due-date.spec` → komparator (C,D,B,A,E; 00:00 vs brak godziny; zaległe przed dzisiejszymi; remisy – EC-06); `task.service.spec` → „US-10 …” (zapis, filtr, brak zmian bez zapisu, cofnij, cofnij po dodaniu i po usunięciu – EC-05) |
| US-11 Błąd zapisu | `saveJson` zwraca `boolean`; `TaskService.saveFailed` → trwały baner „Nie udało się zapisać zmian. Po odświeżeniu mogą zniknąć.” (zamykany ręcznie, znika po udanym zapisie). | `task.service.spec` → „US-11 …” (quota → brak wyjątku + flaga, kolejny poprawny zapis kasuje flagę) |

## Rozstrzygnięcie blokerów QA

- **B-01** – `addTask`/`updateTask` zwracają `TaskResult` (`{ok:true, task}` albo `{ok:false, error}`; kody: `empty-title`, `unknown-category`, `invalid-date`, `invalid-time`, `time-without-date`, `not-found`). Formularz i edycja czyszczą/zamykają się tylko po sukcesie; błąd pokazany inline (`role="alert"`). Komunikaty w `TASK_ERROR_MESSAGES` (N-05). `TaskForm` i `TaskItem` wołają serwis bezpośrednio (jak `CategoryManager`), żeby dostać wynik.
- **B-02** – natywne `<input type="date">`/`type="time">`. Walidacja na poziomie serwisu (testy jednostkowe). Rok 6-cyfrowy i daty spoza 1900–2100 są odrzucane z komunikatem.
- **B-03** – „Cofnij” zapamiętuje tylko id zadań, które akcja ruszyła, i wstawia je z powrotem w ich obecne sloty; zadania dodane w międzyczasie zostają, usunięte są pomijane. Wspólny helper `placeInSlots` dla `reorder`, `sortByDue`, `restoreOrder`.
- **B-04** – błędy walidacji inline przy formularzu; błąd zapisu jako osobny trwały baner. **Uproszczenie:** nie budowałem kolejki toastów. Toast nadal jest jeden naraz i nowy zastępuje poprzedni (np. „Ułóż po terminie” wypiera „Cofnij” usunięcia) – QA uznało to za akceptowalne (EC-05), jest test.
- **B-05** – jeśli normalizacja cokolwiek zmieniła (śmieci, złe pola, duplikaty, nieczytelny JSON, nie-tablica), surowa wartość jest kopiowana do `todoartur.tasks.backup` przy wczytaniu, zanim pierwsza zmiana nadpisze `todoartur.tasks`. Duplikaty `id` dostają nowe id.

## Zmienione pliki

- `src/app/models/task.model.ts` – pola `dueDate?`, `dueTime?`.
- `src/app/utils/due-date.ts` (nowy) – walidacja, `toLocalDateKey`, `isToday`, `isOverdue`, `isInTodayFilter`, `formatDue`, `compareByDue`, `normalizeTask`.
- `src/app/utils/task-filters.ts` (nowy) – `matchesFilters` (kategoria + „Dziś”).
- `src/app/services/today.service.ts` (nowy) – sygnał `today`, token `NOW`.
- `src/app/services/storage.ts` – `saveJson` zwraca wynik, `loadRaw`/`saveRaw`.
- `src/app/services/task.service.ts` – wyniki operacji, K-02, `sortByDue`, `restoreOrder`, `placeInSlots`, `loadTasks` z kopią zapasową, `saveFailed`.
- `src/app/components/task-form/*` – pola terminu, błąd inline, emisja `added` po sukcesie.
- `src/app/components/task-item/*` – pola terminu w edycji, wyświetlanie terminu i etykiety „Po terminie”.
- `src/app/components/task-list/*` – filtr „Dziś”, przycisk „Ułóż po terminie”, bezpieczny `drop`, toast „poza filtrem”, pusty stan filtra.
- `src/app/app.ts`, `src/app/app.html` – przycisk „Dziś”, baner błędu zapisu, toast po dodaniu poza filtrem.
- `src/app/services/task.service.spec.ts` (rozbudowany), `src/app/utils/due-date.spec.ts` (nowy).
- `README.md` – sekcje „Funkcje” i „Struktura”, opis ograniczenia wielu kart.

## Założenia i uproszczenia

1. **R-02 zamiast Q-01** (decyzja zlecającego): ukończone w filtrze „Dziś” tylko z terminem dokładnie dziś.
2. **Q-02, Q-03, Q-04, Q-05, Q-06, Q-07** – przyjęte zgodnie z założeniami w 02.
3. **Niepełna data w natywnym polu** (EC-02, pierwszy wiersz): przeglądarka daje `""`, więc zadanie dodaje się bez terminu. R-03 (blokada przez `validity.badInput`) nie wdrożone – zostaje jako ryzyko.
4. **R-04** (podpowiedź „data w przeszłości”) – pominięte (opcjonalne).
5. **R-06** (ponowne wczytanie z `localStorage` przy powrocie do karty) – pominięte; ograniczenie opisane w README konkretnym scenariuszem.
6. **Kopia zapasowa** jest wykrywana przez porównanie `JSON.stringify` wyniku normalizacji z oryginałem. Zbędna kopia (np. inna kolejność kluczy w ręcznie edytowanych danych) jest nieszkodliwa.
7. **Nieznana kategoria przy wczytaniu** → pierwsza istniejąca kategoria (EC-08); dotyczy też tekstowego id nieistniejącej kategorii.
8. `updateTask` przy pustym tytule zwraca teraz błąd `empty-title` zamiast cichego ignorowania; dodatkowo sprawdza istnienie kategorii.
9. Prettier: nowe i przepisane pliki są sformatowane. Szablonów `app.html` i `task-item.html` nie przeformatowywałem w całości (stary kod nie był w stylu Prettiera, a pełny reformat zaśmieciłby diff); `task-list.html` i `task-form.html` są sformatowane.

## Ryzyka / do sprawdzenia ręcznie

- **Brak testów komponentów** (projekt ich nie miał): układ na 320 px, cele dotyku (EC-11), wygląd w obu motywach i kontrast sprawdzić ręcznie w przeglądarce.
- **R-05 – kontrast ukończonych:** wiersz ukończony ma istniejące `opacity-60`, więc szary tekst terminu (i tytuł – stan sprzed zmian) może spaść poniżej 4.5:1. Etykieta „Po terminie” nie występuje na ukończonych, więc wymóg z US-05 jest spełniony.
- **Jeden toast naraz:** „Cofnij” usunięcia może zostać wyparte przez toast „Ułożono…” lub „poza filtrem”.
- **Wiele kart:** ostatni zapis wygrywa (udokumentowane).
- **Niepełna data** wpisana ręcznie w Firefoksie jest cicho pomijana (R-03).
- Timer północy w karcie w tle może być dławiony; ratuje to `visibilitychange` przy powrocie do karty.
