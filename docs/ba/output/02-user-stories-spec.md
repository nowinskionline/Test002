# Specyfikacja: zaległości, szybki wrzut, tryb energii

Wejście: `docs/ba/output/01-extracted-requirements.md` (FR-01..FR-17, NFR, BR) oraz `docs/ba/input/pomysly-zaleglosci-inbox-energia-decyzje.md`.
Ta wersja zastępuje poprzednią specyfikację o terminach (jest już zaimplementowana; kod w `src/` to stan wyjściowy).

Rola we wszystkich historiach: **Użytkownik (Artur)** - jedna przeglądarka, bez kont i serwera, dane w `localStorage`.
Kryterium sukcesu wspólne dla całego zakresu: po gorszym dniu w 2 minuty wiem, od czego zacząć; funkcje nie dokładają klikania (NFR-01, NFR-02).

## Stan wyjściowy kodu (ważny dla "Wpływ na kod")

- `Task` (`src/app/models/task.model.ts`): `id, title, categoryId, completed, createdAt, dueDate?, dueTime?`.
- `TaskService` (`src/app/services/task.service.ts`): `addTask(title, categoryId, due)`, `updateTask(id, changes)` (brak klucza = bez zmian, `null` = usuń), `toggleTask`, `reorder`, `sortByDue`; każdy zapis przez `setTasks` -> `localStorage`; błąd zapisu -> sygnał `saveFailed`.
- Wczytywanie: `loadTasks` -> `normalizeTask` (`src/app/utils/due-date.ts`) buduje zadanie od zera z **znanych pól**. Nieznane pola są gubione, a jeśli wynik różni się od oryginału, oryginał trafia do `todoartur.tasks.backup`. Konsekwencja: każde nowe pole MUSI być dopisane do `normalizeTask`, inaczej zniknie po odświeżeniu strony.
- Filtry: `matchesFilters` + `TaskFilters` (`src/app/utils/task-filters.ts`) = kategoria AND "Dziś"; używane w `task-list.ts` (`filtered`) i `app.ts` (`onAdded`, toast "poza bieżącym filtrem").
- `isInTodayFilter`, `isOverdue`, `isToday` w `src/app/utils/due-date.ts`; "dziś" z `TodayService` (zmienia się o północy).
- Stan filtrów w `app.ts` (sygnały, nie zapisywane): `selectedFilter`, `todayOnly`. Lista: `task-list` (aktywne w `cdkDropList`, ukończone pod "Pokaż ukończone"). Formularz: `task-form` (tytuł, kategoria, termin); edycja inline w `task-item`.
- Kolejność ręczna = kolejność w tablicy `TaskService.tasks()`.

## Założenia domyślne (otwarte pytania z 01-extracted-requirements.md)

Użytkownik kazał działać bez dalszych pytań. Każde poniższe założenie jest powtórzone przy historii, której dotyczy, i wymaga potwierdzenia przy odbiorze.

| Q | Założenie domyślne |
|---|---|
| Q-01 | Wrzut dostaje kategorię "Inne" (id `inne`); jeśli takiej kategorii już nie ma - pierwszą istniejącą. "Dostanie kategorię" = zapis edycji, po którym `categoryId` jest INNE niż było. Zapis tej samej kategorii flagi nie zdejmuje (od tego jest "OK"). "Dostanie termin" = po zapisie zadanie ma `dueDate`. |
| Q-02 | Szybki wrzut to osobne, jednowierszowe pole nad obecnym formularzem. Bez skrótu klawiaturowego (poza zakresem v1). Zadanie z pełnego formularza NIE dostaje flagi. |
| Q-03 | Przycisk "OK" jest na samym zadaniu na liście (widoczny tylko przy zadaniach z flagą). Ustawienie samej trudności flagi NIE zdejmuje. |
| Q-04 | Tryb symetryczny: "Jestem wypruty" ukrywa zadania oznaczone "ciężkie"; "Mam siłę" ukrywa oznaczone "lekkie". Nieoznaczone, zaległe i dzisiejsze są zawsze widoczne. Jest trzeci stan "Wyłączony" (domyślny). |
| Q-05 | Domyślnie "Wyłączony". Wybór trybu NIE jest zapamiętywany po odświeżeniu (tak jak "Dziś" i "Pokaż ukończone"). |
| Q-06 | "Ogarnij zaległe" respektuje filtr kategorii, ignoruje tryb energii (zaległe nie mogą znikać) oraz filtry "Dziś" i "do przejrzenia". Brak zadań = komunikat; mniej niż 3 = pokazujemy tyle, ile jest, bez "+X więcej". |
| Q-07 | Podpowiedź to panel nad listą (lista pozostaje widoczna pod spodem). Otwiera i zamyka go ten sam przycisk. Przy zadaniu w panelu jest pole wyboru "zrobione" (używa `toggleTask`). Stan panelu nie jest zapisywany. |
| Q-08 | Filtr "do przejrzenia" łączy się przez AND z kategorią, "Dziś" i trybem energii. Licznik liczy tylko nieukończone zadania z flagą, we wszystkich kategoriach (niezależnie od filtrów). Ukończenie zadania nie zmienia flagi. |
| Q-09 | Pozycje spoza decyzji (aplikacja mobilna, rozszerzenie, głos, statystyki, streaki, synchronizacja) traktujemy jako poza zakresem. |

---

## EP-01 Model danych i zgodność wsteczna

### US-01 Nowe pola w zadaniu bez utraty starych danych
*Jako użytkownik, chcę, żeby po aktualizacji aplikacji moje dotychczasowe zadania działały bez zmian, aby nie stracić żadnych danych.*
Pokrywa: FR-16, NFR-04, NFR-05

Opis: `Task` dostaje dwa opcjonalne pola: `needsReview?: true` (flaga "do przejrzenia"; klucz pomijany, gdy flagi nie ma) i `difficulty?: 'light' | 'heavy'` (brak klucza = nieoznaczone). Konwencja zgodna z `dueDate`/`dueTime`: bez kluczy z `null`/`false` w `localStorage`.

Kryteria akceptacji:
```gherkin
Scenario: Stare zadania bez nowych pól
  Given w localStorage jest zapisane zadanie bez pól needsReview i difficulty
  When aplikacja się uruchamia
  Then zadanie jest widoczne, nie ma flagi "do przejrzenia" i jest nieoznaczone
  And w localStorage nie powstaje kopia todoartur.tasks.backup

Scenario: Nowe pola przetrwają odświeżenie
  Given zadanie ma needsReview = true i difficulty = "heavy"
  When odświeżam stronę
  Then zadanie nadal ma flagę "do przejrzenia" i oznaczenie "ciężkie"

Scenario: Negatywny - nieprawidłowa wartość trudności
  Given w localStorage zadanie ma difficulty = "średnie" albo needsReview = "tak"
  When aplikacja się uruchamia
  Then zadanie jest wczytane jako nieoznaczone i bez flagi
  And oryginalne dane są zachowane w todoartur.tasks.backup
```

Wpływ na kod: ZMIANA MODELU DANYCH. `task.model.ts` (pola + typ `Difficulty`), `utils/due-date.ts` -> `normalizeTask` (przepuszcza tylko `needsReview === true` i `difficulty` równe `'light'`/`'heavy'`; inaczej pole pomijane), `task.service.ts` (`loadTasks` bez zmian logicznych, korzysta z mechanizmu backupu), testy w `due-date.spec.ts` i `task.service.spec.ts`. Stare dane w `localStorage` obsługuje opcjonalność pól - bez migracji.

---

## EP-02 Szybki wrzut i przegląd

### US-02 Szybki wrzut samego tytułu
*Jako użytkownik, chcę wpisać sam tytuł i nacisnąć Enter, aby wyrzucić zadanie z głowy bez wybierania kategorii i terminu.*
Pokrywa: FR-06, FR-07, FR-17, NFR-01
Założenia domyślne (Q-01), (Q-02)

Opis: osobne pole "Szybki wrzut" nad obecnym formularzem. Enter dodaje zadanie na górę głównej listy z `needsReview = true` i kategorią "Inne" (albo pierwszą istniejącą). Po dodaniu pole się czyści i zachowuje fokus (kolejny wrzut bez klikania). Pełny formularz działa jak dotąd i nie ustawia flagi.

Kryteria akceptacji:
```gherkin
Scenario: Wrzut jednym Enterem
  Given jestem w polu "Szybki wrzut" i wpisałem "Zadzwonić do lekarza"
  When naciskam Enter
  Then na górze głównej listy pojawia się zadanie "Zadzwonić do lekarza"
  And ma kategorię "Inne", brak terminu i flagę "do przejrzenia"
  And pole jest puste i nadal ma fokus

Scenario: Brak kategorii "Inne"
  Given kategoria "Inne" została wcześniej usunięta
  When wrzucam zadanie "Kupić klej"
  Then zadanie dostaje pierwszą istniejącą kategorię i flagę "do przejrzenia"

Scenario: Negatywny - pusty lub same spacje tytuł
  Given pole "Szybki wrzut" jest puste albo zawiera same spacje
  When naciskam Enter
  Then żadne zadanie nie powstaje i nie pojawia się błąd ani toast

Scenario: Pełny formularz bez flagi
  Given wypełniam tytuł, kategorię i termin w obecnym formularzu
  When zatwierdzam dodanie
  Then zadanie nie ma flagi "do przejrzenia"

Scenario: Wrzut poza bieżącym filtrem
  Given aktywny jest filtr kategorii "Praca"
  When wrzucam zadanie (trafia do "Inne")
  Then zadanie jest zapisane, a toast informuje, że jest poza bieżącym filtrem
```

Wpływ na kod: ZMIANA MODELU (pole `needsReview`, zob. US-01; stare dane obsłużone przez opcjonalność). Nowy komponent `components/quick-add/` (lub pole w `app.html`), `task.service.ts` -> nowa metoda `addQuickTask(title)` zwracająca `TaskResult` (błąd `empty-title` jak w `addTask`), `app.ts`/`app.html` (podpięcie `(added)` do istniejącego `onAdded`, więc toast filtra działa bez zmian). `task-form` bez zmian zakresu (poza US-06).

### US-03 Licznik i filtr "do przejrzenia"
*Jako użytkownik, chcę widzieć, ile zadań czeka na przejrzenie, i móc je wyfiltrować, aby wrzucone rzeczy nie zamieniły się w śmietnik.*
Pokrywa: FR-08, FR-10
Założenie domyślne (Q-08)

Opis: w pasku filtrów przycisk "Do przejrzenia: X" (przełącznik jak "Dziś"). X = liczba nieukończonych zadań z flagą, we wszystkich kategoriach, niezależnie od aktywnych filtrów. Przycisk widoczny, gdy X > 0 lub filtr jest włączony (żeby dało się go wyłączyć). Filtr łączy się przez AND z kategorią, "Dziś" i trybem energii. Nic nie jest kasowane automatycznie.

Kryteria akceptacji:
```gherkin
Scenario: Licznik
  Given mam 3 nieukończone zadania z flagą i 1 ukończone z flagą
  Then przycisk pokazuje "Do przejrzenia: 3"

Scenario: Filtr łączy się z kategorią
  Given 2 zadania z flagą są w "Inne", a 1 w "Dom"
  When włączam "Do przejrzenia" i kategorię "Dom"
  Then lista pokazuje tylko to 1 zadanie z flagą z kategorii "Dom"

Scenario: Negatywny - brak zadań do przejrzenia
  Given żadne zadanie nie ma flagi
  Then przycisk "Do przejrzenia" nie jest widoczny
  And przy włączonym filtrze, gdy ostatnia flaga zniknie, lista pokazuje komunikat "Brak zadań do przejrzenia", a przycisk pozostaje, by wyłączyć filtr

Scenario: Brak automatycznego kasowania
  Given zadanie z flagą istnieje od 30 dni
  When otwieram aplikację
  Then zadanie nadal jest na liście z flagą
```

Wpływ na kod: bez zmiany modelu (korzysta z US-01). `utils/task-filters.ts` (`TaskFilters.reviewOnly`, warunek w `matchesFilters`), `task-list.ts` (nowy `input`, komunikat pustej listy), `app.ts`/`app.html` (sygnał `reviewOnly`, przycisk, licznik `computed` w `TaskService`, np. `reviewCount`), `onAdded` przekazuje nowy filtr.

### US-04 Flaga znika sama po uzupełnieniu zadania
*Jako użytkownik, chcę, żeby zadanie przestało być "do przejrzenia", gdy je uzupełnię, aby nie klikać dodatkowo.*
Pokrywa: FR-09
Założenie domyślne (Q-01), (Q-03)

Kryteria akceptacji:
```gherkin
Scenario: Zmiana kategorii zdejmuje flagę
  Given zadanie z flagą ma kategorię "Inne"
  When w edycji zmieniam kategorię na "Dom" i zapisuję
  Then zadanie nie ma już flagi, a licznik maleje o 1

Scenario: Nadanie terminu zdejmuje flagę
  Given zadanie z flagą nie ma terminu
  When w edycji ustawiam datę i zapisuję
  Then zadanie nie ma już flagi

Scenario: Negatywny - edycja, która niczego nie uzupełnia
  Given zadanie z flagą ma kategorię "Inne" i brak terminu
  When w edycji zmieniam tylko tytuł albo tylko trudność, albo zapisuję "Inne" ponownie
  Then flaga zostaje

Scenario: Negatywny - odrzucona edycja
  Given zadanie z flagą
  When zapis edycji kończy się błędem (np. nieprawidłowa data)
  Then flaga zostaje, a zadanie nie zmienia się
```

Wpływ na kod: bez zmiany modelu. `task.service.ts` -> `updateTask`: po walidacji, jeśli `current.needsReview` i (`categoryId` zmieniona względem `current` lub wynik ma `dueDate`), budujemy zadanie bez klucza `needsReview` (ten sam wzorzec destrukturyzacji co dla terminu). Testy w `task.service.spec.ts`.

### US-05 Przycisk "OK" przy zadaniu
*Jako użytkownik, chcę jednym kliknięciem zatwierdzić zadanie "do przejrzenia" bez zmian, aby zadanie zostało w "Inne" i zniknęło z przeglądu.*
Pokrywa: FR-09
Założenie domyślne (Q-03)

Kryteria akceptacji:
```gherkin
Scenario: OK zdejmuje flagę
  Given zadanie ma flagę "do przejrzenia"
  When klikam "OK" przy zadaniu
  Then flaga znika, kategoria, termin i kolejność zadania się nie zmieniają
  And licznik maleje o 1

Scenario: Przycisk tylko przy zadaniach z flagą
  Given zadanie nie ma flagi
  Then przy zadaniu nie ma przycisku "OK"

Scenario: Negatywny - OK w filtrze "do przejrzenia"
  Given filtr "Do przejrzenia" jest włączony i klikam "OK" przy ostatnim zadaniu
  Then zadanie znika z widoku filtra (nadal istnieje na głównej liście po wyłączeniu filtra)
  And pokazuje się komunikat pustej listy zamiast błędu
```

Wpływ na kod: bez zmiany modelu. `task.service.ts` (`dismissReview(id)`), `task-item.ts/.html` (przycisk + `output`), `task-list.html` (podpięcie). Bez toasta i bez "Cofnij" (zakres v1).

---

## EP-03 Tryb energii

### US-06 Oznaczanie trudności zadania
*Jako użytkownik, chcę opcjonalnie oznaczyć zadanie jako "lekkie" lub "ciężkie", aby w gorszy dzień tryb energii mógł je ukryć.*
Pokrywa: FR-11
Założenie domyślne (Q-03: samo ustawienie trudności nie zdejmuje flagi)

Opis: lista rozwijana "Trudność: brak / lekkie / ciężkie" w `task-form` i w edycji w `task-item`. Domyślnie "brak". Na liście przy oznaczonym zadaniu widać małą etykietę.

Kryteria akceptacji:
```gherkin
Scenario: Dodanie z trudnością
  Given w formularzu wybieram "ciężkie"
  When dodaję zadanie
  Then zadanie ma difficulty = "heavy" i etykietę "ciężkie"

Scenario: Domyślnie nieoznaczone
  When dodaję zadanie, nie dotykając pola trudności
  Then zadanie nie ma klucza difficulty

Scenario: Zdjęcie oznaczenia w edycji
  Given zadanie jest "lekkie"
  When w edycji wybieram "brak" i zapisuję
  Then zadanie jest nieoznaczone, a w localStorage nie ma klucza difficulty

Scenario: Negatywny - nieprawidłowa wartość z kodu
  When updateTask dostaje difficulty spoza "light"/"heavy"/null
  Then zmiana jest odrzucona, a zadanie bez zmian
```

Wpływ na kod: ZMIANA MODELU (zob. US-01). `task.model.ts` (`Difficulty`), `task.service.ts` (`addTask` dostaje opcjonalny parametr trudności; `TaskChanges.difficulty?: Difficulty | null`, nowy kod błędu `invalid-difficulty` + komunikat w `TASK_ERROR_MESSAGES`), `task-form.ts/.html`, `task-item.ts/.html`.

### US-07 Przełącznik "mam siłę / jestem wypruty"
*Jako użytkownik, chcę jednym kliknięciem ukryć zadania nieodpowiednie do mojej energii, aby widzieć tylko to, co mogę teraz zrobić.*
Pokrywa: FR-12, FR-14
Założenia domyślne (Q-04), (Q-05)

Opis: trójstanowy przełącznik w pasku filtrów: "Bez trybu" (domyślny) / "Mam siłę" / "Jestem wypruty". "Jestem wypruty" ukrywa zadania z `difficulty = 'heavy'`; "Mam siłę" ukrywa `'light'`. Nieoznaczone nigdy nie są ukrywane. Tryb działa jak kolejny filtr (AND z kategorią, "Dziś", "do przejrzenia"), dotyczy listy aktywnych i ukończonych. Stan tylko w pamięci.

Kryteria akceptacji:
```gherkin
Scenario: Jestem wypruty
  Given mam zadania: A "ciężkie", B "lekkie", C nieoznaczone (wszystkie bez terminu)
  When wybieram "Jestem wypruty"
  Then widzę B i C, a A jest ukryte

Scenario: Mam siłę
  Given jak wyżej
  When wybieram "Mam siłę"
  Then widzę A i C, a B jest ukryte

Scenario: Domyślnie wyłączony i niezapamiętywany
  When otwieram aplikację albo odświeżam stronę
  Then wybrany jest "Bez trybu" i widzę wszystkie zadania

Scenario: Negatywny - tryb ukrywa wszystko
  Given wszystkie zadania są "ciężkie" bez terminu i wybieram "Jestem wypruty"
  Then lista pokazuje komunikat "Brak zadań pasujących do filtrów" (a nie "Dodaj pierwsze zadanie powyżej")

Scenario: Zadanie dodane poza trybem
  Given tryb "Jestem wypruty"
  When dodaję "ciężkie" zadanie bez terminu
  Then zadanie jest zapisane, a toast informuje, że jest poza bieżącym filtrem
```

Wpływ na kod: bez zmiany modelu. `utils/task-filters.ts` (`TaskFilters.energy: 'off' | 'rested' | 'tired'`, reguła w `matchesFilters`), `app.ts/.html` (sygnał + przełącznik), `task-list.ts/.html` (nowy `input`, komunikat pustej listy), `onAdded` przekazuje filtr.

### US-08 Zaległe i dzisiejsze zawsze widoczne
*Jako użytkownik, chcę, żeby tryb energii nigdy nie ukrywał zadań zaległych ani na dziś, aby zmęczenie nie zamiotło ich pod dywan.*
Pokrywa: FR-13
Reguły: BR-01, BR-05

Opis: wyjątek od US-07 stosuje ten sam warunek co filtr "Dziś" (`isInTodayFilter`: nieukończone z terminem dziś lub wcześniej; ukończone tylko z terminem dokładnie dziś). Nie dodajemy nowej definicji zaległości.

Kryteria akceptacji:
```gherkin
Scenario: Zaległe ciężkie widoczne
  Given zadanie "ciężkie" ma termin wczoraj i jest nieukończone
  When wybieram "Jestem wypruty"
  Then zadanie nadal jest na liście z etykietą "Po terminie"

Scenario: Dzisiejsze lekkie widoczne
  Given zadanie "lekkie" ma termin dziś
  When wybieram "Mam siłę"
  Then zadanie jest widoczne

Scenario: Negatywny - przyszły termin nie chroni
  Given zadanie "ciężkie" ma termin jutro
  When wybieram "Jestem wypruty"
  Then zadanie jest ukryte

Scenario: Północ
  Given tryb "Jestem wypruty" i "ciężkie" zadanie z terminem jutro jest ukryte
  When mija północ
  Then zadanie staje się "dzisiejsze" i pojawia się na liście bez odświeżania
```

Wpływ na kod: bez zmiany modelu. `utils/task-filters.ts` (wywołanie `isInTodayFilter` w regule trybu; "dziś" dalej z `TodayService`), testy w nowym `task-filters.spec.ts`.

### US-09 Miejsce jako istniejący filtr kategorii
*Jako użytkownik, chcę łączyć tryb energii z filtrem kategorii (Dom, Praca, własne), aby uwzględnić miejsce bez nowego pola.*
Pokrywa: FR-15

Kryteria akceptacji:
```gherkin
Scenario: Tryb + kategoria
  Given wybrałem kategorię "Dom" i tryb "Jestem wypruty"
  Then widzę tylko zadania z "Dom", które nie są "ciężkie" (poza zaległymi i dzisiejszymi)

Scenario: Negatywny - brak nowego pola miejsca
  When otwieram formularz i edycję zadania
  Then nie ma pola "miejsce" ani "kontekst"; model Task nie zawiera takiego pola
```

Wpływ na kod: brak nowych zmian ponad US-07; weryfikacja testem `matchesFilters` (kategoria AND tryb). Bez zmiany modelu.

---

## EP-04 Ogarnij zaległe

### US-10 Przycisk "Ogarnij zaległe" i panel podpowiedzi
*Jako użytkownik, chcę po gorszym dniu kliknąć "Ogarnij zaległe" i dostać krótką listę, aby nie przytłaczała mnie cała lista zaległości.*
Pokrywa: FR-01, FR-04
Założenia domyślne (Q-06), (Q-07)

Opis: przycisk w pasku filtrów (zawsze widoczny; `aria-expanded`). Klik otwiera panel nad listą, ponowny klik zamyka. Aplikacja sama niczego nie otwiera, nie wykrywa gorszego dnia, nie wysyła powiadomień. Panel jest tylko widokiem (pochodną), niczego nie zapisuje ani nie zmienia terminów i kolejności.

Kryteria akceptacji:
```gherkin
Scenario: Tylko na żądanie
  Given mam zaległe zadania
  When otwieram aplikację po kilku dniach przerwy
  Then panel jest zamknięty i nie ma żadnego powiadomienia

Scenario: Otwarcie i zamknięcie
  When klikam "Ogarnij zaległe"
  Then nad listą pojawia się panel, a lista główna pozostaje widoczna pod nim
  When klikam "Ogarnij zaległe" ponownie
  Then panel znika

Scenario: Dane bez zmian
  Given mam zadania z terminami i ręczną kolejnością
  When otwieram i zamykam panel
  Then żaden termin, flaga, trudność ani kolejność zadań się nie zmieniły
  And w localStorage nie było zapisu

Scenario: Negatywny - brak zaległych i dzisiejszych
  Given żadne nieukończone zadanie nie jest zaległe ani na dziś
  When klikam "Ogarnij zaległe"
  Then panel pokazuje "Brak zaległych i dzisiejszych zadań" (bez błędu)
```

Wpływ na kod: bez zmiany modelu. Nowy komponent `components/catch-up/` (panel) lub blok w `task-list`; `app.ts/.html` (sygnał otwarcia, przycisk). Czysta funkcja wyboru w `utils/` (zob. US-11).

### US-11 Trzy zadania według ręcznej kolejności
*Jako użytkownik, chcę zobaczyć 3 zadania do zrobienia w mojej kolejności, aby wiedzieć, od czego zacząć.*
Pokrywa: FR-02, FR-05
Reguły: BR-01, BR-02, BR-03, BR-04
Założenia domyślne (Q-06), (Q-07)

Opis: kandydaci = nieukończone zadania z terminem dziś lub wcześniej (definicje jak `isOverdue`/`isToday`), po filtrze kategorii; kolejność = kolejność w `TaskService.tasks()` (ręczna). Pierwsze 3 w panelu. Bez punktacji, bez sortowania po wieku czy terminie. Tryb energii, "Dziś" i "do przejrzenia" ignorowane. Przy zadaniu pole "zrobione": po zaznaczeniu zadanie wypada z panelu, a na jego miejsce wchodzi kolejne.

Kryteria akceptacji:
```gherkin
Scenario: Wybór według ręcznej kolejności
  Given lista w kolejności: A (zaległe 10 dni), B (dziś), C (zaległe wczoraj), D (zaległe), E (jutro)
  When otwieram panel
  Then widzę A, B, C w tej kolejności, a E nie jest uwzględnione

Scenario: Zaznaczenie "zrobione"
  Given panel pokazuje A, B, C, a D czeka w "+X więcej"
  When zaznaczam "zrobione" przy A
  Then A znika z panelu, a panel pokazuje B, C, D

Scenario: Filtr kategorii, ale nie tryb energii
  Given aktywna kategoria "Dom" i tryb "Jestem wypruty"
  And w "Dom" zaległe "ciężkie" zadanie F, a w "Praca" zaległe G
  When otwieram panel
  Then widzę F, a G nie

Scenario: Negatywny - zadania, które nie kwalifikują się
  Given zadanie bez terminu, zadanie z terminem jutro i ukończone zaległe
  When otwieram panel
  Then żadne z nich nie jest w panelu

Scenario: Mniej niż 3
  Given jest tylko 1 kwalifikujące się zadanie
  Then panel pokazuje to 1 zadanie i nie pokazuje "+X więcej"
```

Wpływ na kod: bez zmiany modelu. Nowa czysta funkcja np. `utils/catch-up.ts` -> `pickCatchUp(tasks, categoryId, now): { top: Task[]; rest: Task[] }` (testowalna z podstawionym `now`), `computed` w komponencie panelu, użycie `isToday`/`isOverdue` z `utils/due-date.ts` i `TodayService`, `toggleTask`. Testy `catch-up.spec.ts`.

### US-12 Rozwijane "+X więcej"
*Jako użytkownik, chcę zajrzeć do pozostałych zaległych i dzisiejszych zadań, aby mieć pewność, że żadne nie zniknęło.*
Pokrywa: FR-03, FR-04
Założenie domyślne (Q-07)

Kryteria akceptacji:
```gherkin
Scenario: Rozwinięcie reszty
  Given jest 7 kwalifikujących się zadań
  Then pod 3 zadaniami widzę "+4 więcej"
  When klikam "+4 więcej"
  Then widzę pozostałe 4 zadania w tej samej, ręcznej kolejności

Scenario: Zwinięcie
  Given rozwinąłem "+4 więcej"
  When zamykam panel i otwieram go ponownie
  Then "+X więcej" jest znów zwinięte

Scenario: Negatywny - dokładnie 3
  Given jest dokładnie 3 kwalifikujące się zadania
  Then nie ma "+X więcej"

Scenario: Nic nie znika z aplikacji
  When panel jest otwarty
  Then wszystkie zadania nadal są na liście głównej (zgodnie z jej filtrami)
```

Wpływ na kod: bez zmiany modelu. Ten sam komponent panelu (`catch-up`): lokalny sygnał rozwinięcia, resetowany przy zamknięciu panelu; X = `rest().length`.

---

## Tabela pokrycia FR -> US

| FR | US |
|---|---|
| FR-01 | US-10 |
| FR-02 | US-11 |
| FR-03 | US-12 |
| FR-04 | US-10, US-12 |
| FR-05 | US-11 |
| FR-06 | US-02 |
| FR-07 | US-02 |
| FR-08 | US-03 |
| FR-09 | US-04, US-05 |
| FR-10 | US-03 |
| FR-11 | US-06 |
| FR-12 | US-07 |
| FR-13 | US-08 |
| FR-14 | US-07 |
| FR-15 | US-09 |
| FR-16 | US-01 |
| FR-17 | US-02 |

NFR: NFR-01 (US-02, US-05, US-10), NFR-02 (całość), NFR-03 (US-07, US-08, US-11: brak zgadywania), NFR-04 (US-01), NFR-05 (US-01).

## Uwagi do realizacji

- Kolejność prac minimalizująca ryzyko: US-01 -> US-02..US-05 -> US-06..US-09 -> US-10..US-12. US-10..US-12 nie zależą od nowych pól modelu i można je zrobić niezależnie.
- Poza zakresem v1 bez zmian względem 01-extracted-requirements.md (m.in. przeplanowanie terminów, automatyczne wykrywanie gorszego dnia, osobny Inbox, skróty w tytule, skrót klawiaturowy wrzutu, zapamiętywanie trybu energii, licznik ukrytych zadań).
