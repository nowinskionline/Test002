# Raport QA – terminy zadań ("Todo Artur")

Zakres audytu: `01-extracted-requirements.md`, `02-user-stories-spec.md` oraz zgodność z kodem w `src/app/` (`task.service.ts`, `storage.ts`, `task-list.ts`).

Podsumowanie: **5 krytycznych blokerów**, 12 brakujących edge case'ów, 6 niespójności, 6 rekomendacji.

Fakty z kodu istotne dla audytu:
- `loadJson(TASKS_KEY, [], Array.isArray)` sprawdza tylko, czy to tablica. Elementy (`null`, liczba, obiekt bez `id`/`title`) przechodzą walidację.
- `updateTask` robi `{ ...t, ...changes }`. Klucz obecny w `changes` z wartością `undefined` nadpisuje pole, a klucz nieobecny go zostawia. To kluczowe dla "usuń termin".
- `reorder` działa wyłącznie na liście `active()` (nieukończone, po filtrze kategorii). Ukończone nie biorą udziału w przeciąganiu.
- `showCompleted` to lokalny `signal(false)` w `TaskList` i nie jest zapisywany. Filtr kategorii przychodzi przez `input()` z `app.ts`.
- `saveJson` połyka błędy (`QuotaExceededError`) bez informacji dla użytkownika.
- Stan zadań jest wczytywany raz (w polu `_tasks`). Nie ma nasłuchu zdarzenia `storage`.
- `restoreTask` wstawia zadanie z powrotem na pozycję `index` bez ponownej walidacji.

---

## 1. Krytyczne blokery

### B-01 Brak decyzji Q-01 (data vs data+godzina) blokuje model danych i testowalność US-01, US-02, US-04, US-06
- Dotyczy: US-01, US-02, US-04, US-06, FR-01, BR-03.
- Problem: format przechowywania (`"2026-11-24"` vs timestamp) trzeba wybrać przed napisaniem pierwszej linii kodu. Wszystkie AC mówią o "terminie" bez typu, więc żadnego nie da się przetestować jednoznacznie. Zmiana formatu po wdrożeniu wymusza migrację danych w `localStorage`, której spec (US-03) mówi, że "nie jest konieczna".
- Do rozstrzygnięcia przed startem: rekomendacja BA to sama data (`YYYY-MM-DD`, lokalna), bo Q-02 i widok "Dziś" upraszczają się do porównania dni.

### B-02 Brak definicji "po terminie" i "dziś" (Q-02) – AC US-04 i US-06 są nietestowalne
- Dotyczy: US-04 (wszystkie 4 scenariusze), US-06 scenariusz 1, BR-03, BR-04.
- Problem: AC US-04 mówi "termin, który już minął (wg definicji z Q-02)". To odwołanie do pytania, a nie kryterium. Scenariusz 1 US-06 równocześnie wymaga, aby zadanie z terminem "dziś" było widoczne, a US-04 nie rozstrzyga, czy jest czerwone. Dwie historie mogą zaimplementować tę granicę różnie.
- Do rozstrzygnięcia: jedna wspólna funkcja `isOverdue(task, now)` i `isToday(task, now)` oraz strefa czasowa (lokalna strefa przeglądarki).

### B-03 Brak określenia, jak odróżnić "nie zmieniaj terminu" od "usuń termin" w `updateTask` (US-02)
- Dotyczy: US-02 scenariusz "Usunięcie terminu"; `task.service.ts:53-59`.
- Problem: kod robi `{ ...t, ...changes }`. Jeśli komponent edycji zawsze wysyła `{ title, categoryId, dueDate }`, to pusty termin musi być jawnie wartością "brak" (`null`/`undefined`), a nie brakiem klucza. Spec w "Wpływie na kod" wspomina o tym, ale nie ma AC, które wymusza kontrakt. Ryzyko: edycja samego tytułu (`TaskList.edit` wysyła dziś tylko `title`+`categoryId`) po zmianie sygnatury może przypadkowo skasować termin albo go nie usunąć.
- Do rozstrzygnięcia: jeden kontrakt (np. `null` = usuń, brak klucza = bez zmian) i test jednostkowy na oba przypadki (patrz EC-04).

### B-04 Brak walidacji pola terminu przy wczytaniu – `loadJson` nie chroni przed uszkodzonymi elementami (US-03)
- Dotyczy: US-03 scenariusz "Uszkodzona wartość terminu".
- Problem: AC mówi "aplikacja się nie wywala, zadanie jest traktowane jak bez terminu". Obecny walidator przepuszcza dowolną tablicę, a nowa logika (`new Date(task.dueDate)`, porównania, sortowanie) wykona się na `"abc"`, `123`, `{}`, `"2026-02-31"`, `null`. `new Date("abc")` daje `Invalid Date`, a porównania z `NaN` zawsze zwracają `false`, więc sortowanie po terminie może dawać niestabilną kolejność. AC nie mówi, gdzie ta normalizacja ma nastąpić (przy wczytaniu czy przy każdym użyciu) ani czy "uszkodzony" termin jest czyszczony w `localStorage` (co byłoby nieodwracalne).
- Do rozstrzygnięcia: normalizacja przy wczytaniu (bez zapisu zwrotnego do czasu pierwszej edycji) plus lista wartości uznawanych za nieprawidłowe.

### B-05 Brak decyzji Q-05/Q-06 – US-05 i US-06 mają AC zależne od "decyzji", której nie ma
- Dotyczy: US-05 scenariusze 2 i 4, US-06 scenariusz 3, FR-04, FR-05.
- Problem: AC zawierają zwroty "zgodnie z decyzją z Q-06" i "szczegóły wg Q-05". To nie są kryteria akceptacji, więc test nie może przejść ani zawieść. Dodatkowo FR-05 jest warunkowe ("może widok Dziś"), a US-06 traktuje je jako pewne. Nie wiadomo, czy to osobny widok, czy filtr (wpływa na `app.ts` i na to, czy `showCompleted` działa w nim).
- Do rozstrzygnięcia: do czasu odpowiedzi US-05 i US-06 mają status "niegotowe do implementacji". US-01–US-04 można zacząć po rozstrzygnięciu B-01 i B-02.

---

## 2. Brakujące edge case'y

Każdy z gotowym AC do dopisania. Zakładam wariant "sama data, lokalna strefa" (B-01); jeśli zapadnie inna decyzja, zmienia się tylko dane testowe.

### EC-01 (US-01) Termin w przeszłości przy dodawaniu
Brak AC: czy można dodać zadanie z terminem wczoraj? Obecnie nie ma ani zakazu, ani ostrzeżenia, a zadanie od razu jest czerwone.
```gherkin
Scenario: Dodanie zadania z terminem w przeszłości
  Given formularz dodawania zadania jest otwarty
  And wpisano tytuł "Zaległe sprawozdanie" i wybrano termin wczorajszy
  When użytkownik zatwierdzi formularz
  Then zadanie zostaje dodane z podanym terminem
  And zadanie jest od razu oznaczone jako po terminie
```
(Wymaga potwierdzenia przez BA, czy to ma być dozwolone; jeśli nie, dopisać komunikat walidacji.)

### EC-02 (US-01) Nieprawidłowy lub skrajny termin w formularzu
Brak AC dla wartości granicznych (rok 0001, 9999, wpisana ręcznie data typu 31.02, pole `<input type="date">` w przeglądarce bez wsparcia).
```gherkin
Scenario: Nieprawidłowa data w polu terminu
  Given formularz dodawania zadania jest otwarty z tytułem "Test"
  When użytkownik poda termin spoza dopuszczalnego zakresu lub nieistniejącą datę
  Then zadanie nie zostaje dodane
  And użytkownik widzi komunikat o błędnym terminie
  And localStorage pozostaje bez zmian
```

### EC-03 (US-01) Brak miejsca w `localStorage` przy zapisie zadania z terminem
`saveJson` połyka `QuotaExceededError`: zadanie jest w pamięci i na liście, ale po odświeżeniu go nie ma.
```gherkin
Scenario: Zapis zadania z terminem przy przepełnionym localStorage
  Given localStorage odrzuca zapis (limit przekroczony)
  When użytkownik doda zadanie "Oddać raport" z terminem
  Then aplikacja się nie wywala
  And użytkownik jest informowany, że zadanie nie zostało zapisane trwale
```

### EC-04 (US-02) Edycja samego tytułu lub kategorii nie zmienia terminu
```gherkin
Scenario: Edycja tytułu zachowuje istniejący termin
  Given na liście jest zadanie "Raport" z terminem 2026-12-01
  When użytkownik zmieni wyłącznie tytuł na "Raport roczny" i zatwierdzi
  Then zadanie ma tytuł "Raport roczny"
  And termin nadal wynosi 2026-12-01
```
```gherkin
Scenario: Zmiana kategorii zachowuje istniejący termin
  Given na liście jest zadanie z terminem 2026-12-01 w kategorii "Praca"
  When użytkownik zmieni kategorię na "Dom"
  Then termin nadal wynosi 2026-12-01
```

### EC-05 (US-02) Edycja terminu zadania ukończonego
Ukończone zadania są ukryte (`showCompleted=false`), ale po ich pokazaniu dają się edytować. Spec nie mówi, czy edycja terminu jest dozwolona i czy wpływa na wygląd.
```gherkin
Scenario: Zmiana terminu ukończonego zadania
  Given przełącznik "Pokaż ukończone" jest włączony
  And ukończone zadanie ma termin w przeszłości
  When użytkownik zmieni jego termin na przyszły
  Then zadanie pozostaje ukończone
  And termin jest zaktualizowany
```

### EC-06 (US-03) Element tablicy w `localStorage` nie jest obiektem lub ma złe typy pól
```gherkin
Scenario: Wpis zadania ma wartość null lub typ prosty
  Given w localStorage klucz todoartur.tasks zawiera tablicę z elementem null, liczbą i poprawnym zadaniem
  When aplikacja wczyta dane
  Then aplikacja się nie wywala
  And poprawne zadanie jest wyświetlone
```
```gherkin
Scenario Outline: Nieprawidłowy typ pola terminu
  Given w localStorage zadanie ma pole terminu o wartości <wartosc>
  When aplikacja wczyta dane
  Then zadanie jest wyświetlane bez terminu
  And zadanie nie jest oznaczone jako po terminie
  Examples:
    | wartosc      |
    | "abc"        |
    | 12345        |
    | {}           |
    | ""           |
    | "2026-02-31" |
    | null         |
```

### EC-07 (US-04) Granica doby: zadanie z terminem "dziś" i zmiana dnia przy otwartej aplikacji
Aplikacja działa bez przeładowania wiele godzin (karta otwarta przez noc). Wyróżnienie wyliczone raz nie zmieni się o północy.
```gherkin
Scenario: Zadanie staje się zaległe po przejściu północy
  Given zadanie z terminem na dziś jest widoczne i nie jest po terminie
  And aplikacja pozostaje otwarta
  When zegar systemowy przejdzie na następny dzień
  Then zadanie zostaje oznaczone jako po terminie bez przeładowania strony
```

### EC-08 (US-04) Ukończone zadanie z minionym terminem (Q-03) i cofnięcie ukończenia
```gherkin
Scenario: Ukończone zadanie po terminie nie jest czerwone
  Given zadanie z terminem w przeszłości jest nieukończone i czerwone
  When użytkownik oznaczy je jako ukończone
  Then zadanie przestaje być wyróżnione jako po terminie
```
```gherkin
Scenario: Cofnięcie ukończenia przywraca wyróżnienie
  Given ukończone zadanie ma termin w przeszłości
  When użytkownik odznaczy je jako ukończone
  Then zadanie jest ponownie wyróżnione jako po terminie
```

### EC-09 (US-04) "Cofnij" po usunięciu zadania po terminie i motyw ciemny
```gherkin
Scenario: Przywrócenie usuniętego zadania po terminie
  Given zadanie po terminie zostało usunięte i widoczny jest toast "Cofnij"
  When użytkownik kliknie "Cofnij"
  Then zadanie wraca na dawną pozycję ze swoim terminem
  And jest ponownie wyróżnione jako po terminie
```
```gherkin
Scenario: Wyróżnienie po terminie jest czytelne w obu motywach
  Given zadanie jest po terminie
  When użytkownik przełączy motyw jasny i ciemny
  Then oznaczenie jest widoczne w obu motywach
  And informacja o zaległości nie opiera się wyłącznie na kolorze (np. etykieta tekstowa lub ikona)
```

### EC-10 (US-05) Remisy przy sortowaniu i stabilność kolejności
Brak AC dla kilku zadań z tym samym terminem.
```gherkin
Scenario: Zadania z tym samym terminem zachowują dotychczasową kolejność
  Given trzy zadania mają ten sam termin w ręcznej kolejności A, B, C
  When użytkownik włączy sortowanie po terminie
  Then zadania pozostają w kolejności A, B, C
```

### EC-11 (US-05) Przeciąganie w trybie sortowania i dodanie/usunięcie zadania w trakcie sortowania
`reorder` zakłada ręczną kolejność, a `drop` pobiera `active()`. Jeśli lista jest posortowana tylko widokowo, indeksy `previousIndex`/`currentIndex` nie odpowiadają kolejności w `_tasks`.
```gherkin
Scenario: Przeciąganie przy włączonym sortowaniu po terminie
  Given włączone jest sortowanie po terminie
  When użytkownik spróbuje przeciągnąć zadanie
  Then przeciąganie jest zablokowane lub zachowuje się zgodnie z decyzją Q-06
  And kolejność zapisana w localStorage nie ulega uszkodzeniu
```
```gherkin
Scenario: Dodanie zadania przy włączonym sortowaniu
  Given włączone jest sortowanie po terminie
  When użytkownik doda zadanie z terminem wcześniejszym niż wszystkie istniejące
  Then nowe zadanie pojawia się na właściwej pozycji wg terminu
```

### EC-12 (US-06) Widok "Dziś" w interakcji z filtrem kategorii, wieloma kartami i pustą kategorią
```gherkin
Scenario: Widok "Dziś" z aktywnym filtrem kategorii
  Given wybrano filtr kategorii "Praca"
  And zadania na dziś są w kategoriach "Praca" i "Dom"
  When użytkownik otworzy widok "Dziś"
  Then widoczne są tylko zadania na dziś i zaległe z kategorii "Praca"
```
```gherkin
Scenario: Komunikat pustego widoku "Dziś" przy aktywnym filtrze
  Given w kategorii "Dom" nie ma zadań na dziś, ale są w "Praca"
  And wybrano filtr "Dom"
  When użytkownik otworzy widok "Dziś"
  Then wyświetlany jest komunikat o braku zadań na dziś w tej kategorii
```
```gherkin
Scenario: Zmiany z innej karty przeglądarki
  Given aplikacja jest otwarta w dwóch kartach
  When w karcie A użytkownik ustawi termin zadania i zapisze
  And w karcie B użytkownik edytuje inne zadanie
  Then zmiana z karty A nie zostaje utracona po zapisie z karty B
```
(Ostatni scenariusz wykrywa istniejący problem: brak nasłuchu `storage`, a `setTasks` zapisuje cały stan z pamięci danej karty. Do decyzji BA, czy to w zakresie; patrz R-04.)

---

## 3. Niespójności

- **N-01 FR-02 vs US-01/US-02.** FR-02 mówi "przy dodawaniu oraz zmienić/usunąć przy edycji" i jest pokryte przez dwie historie, a "Pokrywa" w US-01 podaje FR-02 bez rozróżnienia. Nie jest błędem, ale tabela pokrycia nie wskazuje, która historia odpowiada za którą część FR-02. Przy zmianie zakresu łatwo pominąć jedną.
- **N-02 Q-03 vs AC US-04.** Wymagania zakładają "ukończone zadania nie są wyróżniane" (Q-03), ale wszystkie AC US-04 testują wyłącznie **nieukończone** zadania. Żaden scenariusz nie pokrywa ukończonego zadania po terminie (patrz EC-08), więc założenie z wymagań nie ma pokrycia w historii.
- **N-03 US-06 scenariusz 1 vs US-04.** US-06 wprost wymaga, by zadanie z terminem "wczoraj" i "dziś" było widoczne w widoku "Dziś", a US-04 nie definiuje, czy "dziś" to już "po terminie". Jeśli BA rozstrzygnie, że dziś nie jest zaległe, widok "Dziś" pokaże zadania, które nie są czerwone, co trzeba wyraźnie opisać (BR-04 mówi "na dziś + zaległe", co potwierdza dwie różne kategorie).
- **N-04 US-03 vs "Wpływ na kod" US-03.** US-03 pisze "migracja danych nie jest konieczna", a jednocześnie wymaga obsługi uszkodzonej wartości i odpornego wczytywania. Obecny `loadJson` tego nie robi (patrz B-04), więc zmiana w `storage.ts`/`task.service.ts` jest konieczna, a nie "ewentualna". Sformułowanie sugeruje mniejszy zakres, niż w rzeczywistości jest.
- **N-05 BR-05 w tabeli pokrycia.** "BR-05 → poza zakresem/ograniczenie" – reguła jest ograniczeniem technicznym, a Q-04 (przypomnienia) nie ma żadnej historii. Brak śladu, kto i kiedy zdecyduje o przypomnieniach. Nie blokuje, ale wymaganie "żeby telefon pykał" znika ze specyfikacji bez decyzji.
- **N-06 FR-04 vs `reorder` w kodzie.** FR-04 określa sortowanie jako "uzupełnienie ręcznego przeciągania", ale `reorder` przyjmuje indeksy z `active()` i nie zna trybu sortowania. Specyfikacja nie wskazuje, że `drop` w `task-list.ts` musi się zmienić (wspomina tylko "interakcja z przeciąganiem"), więc ryzyko uszkodzenia kolejności jest niewidoczne w AC (patrz EC-11).

---

## 4. Rekomendacje

- **R-01 Kolejność prac.** Najpierw zamknąć B-01 i B-02 (jeden wspólny moduł `due-date` z `isOverdue`/`isToday`/`normalize`), potem US-03 (odporne wczytywanie), US-01, US-02, US-04. US-05 i US-06 wstrzymać do odpowiedzi na Q-05/Q-06.
- **R-02 Jedna funkcja zegara.** Funkcje czasu przyjmują `now` jako parametr (łatwe testy jednostkowe: wczoraj/dziś/jutro, przełom doby, zmiana czasu letni/zimowy). W UI sygnał `today` odświeżany przy przejściu na nowy dzień (EC-07).
- **R-03 Tabela przykładów dla EC-06 i B-04.** Dopisać do `task.service.spec.ts` test parametryczny z listą nieprawidłowych wartości terminu; to tani sposób na pewność, że "aplikacja się nie wywala".
- **R-04 Decyzja o wielu kartach.** Obecnie ostatni zapis wygrywa (stan w pamięci karty nadpisuje `localStorage`). Terminy zwiększają szansę na nieoczekiwaną utratę edycji. BA powinien zdecydować: akceptujemy ograniczenie (udokumentować) albo dodajemy nasłuch `storage`.
- **R-05 Zdefiniować "za długie dane".** Spec nie ogranicza długości tytułu (brak limitu w `addTask`), a dołożenie terminu i etykiet w `task-item` na wąskim ekranie mobilnym może zepsuć układ. Dopisać AC na układ mobilny dla bardzo długiego tytułu z terminem i etykietą "po terminie".
- **R-06 Zamienić odwołania do Q-xx w AC na konkretne wartości.** Po decyzjach BA wszystkie sformułowania "wg Q-02", "wg Q-05", "wg Q-06" w AC należy zastąpić jednoznacznymi warunkami, inaczej historie nie przejdą Definition of Ready.
