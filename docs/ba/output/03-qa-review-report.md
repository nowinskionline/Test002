# Raport QA – terminy zadań ("Todo Artur"), audyt wersji 2

Zakres: `01-extracted-requirements.md`, `02-user-stories-spec.md`, decyzje z `docs/ba/input/przyklad-terminy-zadan-decyzje.md`, porównanie z kodem w `src/app`.

Nie zgłaszam jako problemów rzeczy rozstrzygniętych decyzjami Artura (termin = data + opcjonalna godzina, zaległość od północy, filtr "Dziś" łączony z kategorią, ręczna kolejność nadrzędna, akcja "Ułóż po terminie" dopuszczalna, brak przypomnień) ani "założeń domyślnych" z 02. Te założenia, które uważam za ryzykowne, są w sekcji Rekomendacje.

Podsumowanie: 5 blokerów (wszystkie techniczne, żaden nie wymaga decyzji produktowej), 11 brakujących edge case'ów, 7 niespójności, 6 rekomendacji.

---

## 1. Krytyczne blokery

### B-01 [TECHNICZNY] Brak kontraktu "odrzucenia zmiany" – AC z komunikatem o błędzie nie da się zaimplementować na obecnym kodzie
Dotyczy: US-01 (scenariusze negatywne), US-02 ("Nieprawidłowy termin przy edycji"), K-02.
- `TaskService.addTask` zwraca `Task | null`, ale `TaskForm.submit` emituje `added` i od razu robi `title.set('')`. Odrzucenie przez serwis oznacza utratę wpisanego tytułu, a AC mówi "zadanie nie zostaje dodane" i "użytkownik widzi komunikat".
- `TaskItem.save` po `edited.emit` zawsze robi `editing.set(false)`. `updateTask` zwraca `void`. Gdy "cała zmiana jest odrzucona", edycja i tak się zamyka i wpisane dane przepadają.
- `updateTask` dziś cicho ignoruje pusty tytuł. K-02 nie mówi, czy to ma się zmienić na wynik zwracany.
- **Rekomendacja:** `addTask` i `updateTask` zwracają wynik (`ok` albo kod błędu, np. `invalid-date`, `time-without-date`). Formularz i element zadania czyszczą lub zamykają się dopiero po sukcesie. Walidację pokazują inline przy polu, a stan formularza zostaje. Wpisać to jako nowy K-08.

### B-02 [TECHNICZNY] Scenariusze "nieistniejąca data (31.02)" są nieosiągalne z UI, jeśli pole to `<input type="date">`
Dotyczy: US-01, US-02, US-03.
- Spec nie mówi, jakiej kontrolki użyć. Natywny `type="date"` nie pozwala wysłać 31.02. Przy niepełnej dacie (np. Firefox desktop, wpisany tylko dzień i miesiąc) `value` to `""`, czyli aplikacja cicho potraktuje to jak brak terminu. Chrome przyjmuje lata do 275760, a `value` ma wtedy 6 cyfr roku, więc nie pasuje do `YYYY-MM-DD` z K-01.
- Skutek: AC "użytkownik poda nieistniejącą datę" da się sprawdzić tylko testem jednostkowym serwisu, a nie scenariuszem UI. Brakuje też AC dla "częściowo wpisana data".
- **Rekomendacja:** zdecydować, że pola to natywne `type="date"` i `type="time"`. AC walidacyjne przepisać na poziom serwisu (wywołanie `addTask`/`updateTask` z wartością), a w UI dodać AC z EC-02 (niepełna data i rok spoza zakresu).

### B-03 [TECHNICZNY] "Cofnij" dla "Ułóż po terminie" ma niedookreślone działanie
Dotyczy: US-10 (scenariusz "Cofnięcie akcji"), Q-04 założenie.
- AC: "przywracana jest poprzednia ręczna kolejność". Toast ma 5 s i `ToastService` pokazuje jeden komunikat naraz. W tym oknie użytkownik może dodać, usunąć lub przeciągnąć zadanie. Przywrócenie "migawki całej listy" skasowałoby nowe zadanie albo wskrzesiło usunięte.
- Przy aktywnym filtrze migawka obejmuje tylko widoczne zadania, więc nie wiadomo, co przywracać.
- Dodatkowo: nowy toast zastępuje poprzedni, więc "Cofnij" usunięcia znika po użyciu "Ułóż po terminie" i odwrotnie.
- **Rekomendacja:** "Cofnij" zapamiętuje poprzednią kolejność samych id zadań, które akcja ruszyła, i przy cofaniu przestawia tylko te id na ich dawne sloty (w stylu `reorder`). Zadania dodane w międzyczasie nie są ruszane. Zadania usunięte w międzyczasie są pomijane. Zastąpienie toasta jest akceptowalne, ale ma być wpisane w AC (EC-05).

### B-04 [TECHNICZNY] Brak kanału komunikatów: toast jest jednomiejscowy, a spec dokłada dwa rodzaje komunikatów
Dotyczy: US-11, US-01, US-02, US-05, US-10.
- US-11 każe pokazać komunikat o niezapisaniu. Jedyny istniejący mechanizm (`ToastService.show`) nadpisuje bieżący toast. Scenariusz: użytkownik usuwa zadanie, zapis się nie udaje, komunikat o błędzie wypiera "Cofnij" (albo odwrotnie), i usunięcie staje się nieodwracalne.
- Błędy walidacji (US-01, US-02) nie mają zdefiniowanego miejsca ani treści.
- **Rekomendacja:** rozdzielić: błędy walidacji inline przy polu, błąd zapisu jako osobny, trwały baner (nie znika po 5 s, nie wypiera toasta "Cofnij"). Podać dokładne teksty po polsku (zob. N-05).

### B-05 [TECHNICZNY] K-06 i `normalizeTask`: ciche, trwałe kasowanie danych oraz zduplikowane `id`
Dotyczy: US-03, K-06.
- K-06: normalizacja tylko w pamięci, zapis całego stanu przy pierwszej zwykłej zmianie. Skutek: elementy odrzucone przy wczytaniu (null, obiekt bez `id`/`title`), a także poprawny zapis z nieprawidłowym `dueDate` (np. `"2026-02-31"`) są trwale nadpisane po pierwszym dodaniu zadania. Użytkownik nigdy się nie dowie, że coś zniknęło.
- Całkowicie uszkodzony JSON w `todoartur.tasks` (albo wartość nie będąca tablicą): `loadJson` zwraca `[]`, pierwszy zapis kasuje oryginał. US-03 tego nie obejmuje.
- Zduplikowane `id` w zapisanych danych: `reorder` buduje `Map` po id i podstawia ten sam obiekt w dwa sloty, więc jedno zadanie znika. "Ułóż po terminie", które wg 02 używa tej samej techniki, odziedziczy błąd. `normalizeTask` o duplikatach nie mówi.
- **Rekomendacja:** przed pierwszym nadpisaniem zapisać surową wartość do kopii (np. klucz `todoartur.tasks.backup`), a deduplikację `id` dopisać do normalizacji (EC-07, EC-08).

---

## 2. Brakujące edge case'y (gotowe AC do dopisania)

### EC-01 (US-02) Usunięcie samej godziny
K-02 przewiduje `dueTime: null`, ale żadne AC tego nie sprawdza.
```gherkin
Scenario: Usunięcie samej godziny
  Given zadanie ma dueDate "2026-12-01" i dueTime "14:00"
  When użytkownik wyczyści pole godziny, zostawi datę i zatwierdzi
  Then zadanie ma dueDate "2026-12-01" i nie ma klucza dueTime
  And termin jest wyświetlany bez godziny
```

### EC-02 (US-01) Niepełna data i rok spoza zakresu w natywnym polu
```gherkin
Scenario Outline: Niepoprawna wartość pola daty z przeglądarki
  Given wpisano tytuł "Test"
  When pole daty ma wartość <wartosc>, a użytkownik zatwierdzi formularz
  Then <wynik>
  Examples:
    | wartosc       | wynik                                                                 |
    | ""  (niepełna)| zadanie dodane bez terminu                                           |
    | "275760-09-13"| zadanie nie jest dodane, widoczny komunikat o błędnym terminie       |
    | "1899-12-31"  | zadanie nie jest dodane, widoczny komunikat o błędnym terminie       |
    | "2101-01-01"  | zadanie nie jest dodane, widoczny komunikat o błędnym terminie       |
    | "1900-01-01"  | zadanie dodane z dueDate "1900-01-01"                                |
    | "2100-12-31"  | zadanie dodane z dueDate "2100-12-31"                                |
```
Uwaga: pierwszy wiersz (cicho brak terminu) jest ryzykowny, zob. R-03.

### EC-03 (US-08, US-02) Zadanie znika z listy po zmianie terminu przy aktywnym filtrze "Dziś"
```gherkin
Scenario: Edycja terminu wyprowadza zadanie poza filtr "Dziś"
  Given filtr "Dziś" jest włączony i widoczne jest zadanie z terminem na dziś
  When użytkownik zmieni jego termin na jutro i zatwierdzi
  Then zadanie znika z listy
  And użytkownik widzi informację, że zadanie zostało zapisane i jest poza bieżącym filtrem

Scenario: Dodanie zadania poza filtrem "Dziś"
  Given filtr "Dziś" jest włączony
  When użytkownik doda zadanie z terminem za tydzień lub bez terminu
  Then zadanie jest zapisane
  And użytkownik widzi informację, że zadanie jest poza bieżącym filtrem
```
Dziś nowe zadanie bez terminu po prostu nie pojawia się na liście i użytkownik uzna, że dodawanie nie zadziałało.

### EC-04 (US-04, US-08) Północ w trakcie przeciągania
`drop` bierze `active()` w chwili upuszczenia, a `event.previousIndex` pochodzi ze starego renderu.
```gherkin
Scenario: Zmiana doby w trakcie przeciągania przy filtrze "Dziś"
  Given filtr "Dziś" jest włączony, lista ma zadania A, B, C (B z terminem na dziś)
  And użytkownik trzyma zadanie A w trakcie przeciągania
  When lokalny zegar przejdzie na następny dzień i skład listy się zmieni
  Then upuszczenie nie przenosi innego zadania niż trzymane
  And żadne zadanie nie jest zdublowane ani utracone w localStorage
```

### EC-05 (US-10) Zmiany użytkownika w oknie "Cofnij" i wypieranie toasta
```gherkin
Scenario: Cofnięcie ułożenia po dodaniu zadania w międzyczasie
  Given kolejność przed akcją: A, B, C, a po "Ułóż po terminie": C, A, B
  And w czasie 5 s użytkownik doda zadanie N
  When użytkownik kliknie "Cofnij"
  Then pozostałe zadania wracają do względnej kolejności A, B, C
  And zadanie N nie znika

Scenario: Cofnięcie ułożenia, gdy zadanie zostało usunięte w międzyczasie
  Given po akcji użytkownik usunął zadanie B i kliknął "Cofnij" przy ułożeniu (jeśli toast jest jeszcze aktywny)
  Then B nie wraca przez cofnięcie ułożenia
  And kolejność pozostałych to A, C

Scenario: Toast ułożenia zastępuje toast usunięcia
  Given widoczny jest toast "Cofnij" po usunięciu zadania
  When użytkownik kliknie "Ułóż po terminie"
  Then toast usunięcia znika, a nowy toast dotyczy ułożenia
```

### EC-06 (US-10) Stabilność i brzegi komparatora
```gherkin
Scenario: Godzina 00:00 jest godziną, a nie brakiem godziny
  Given zadania: P (2026-12-01 bez godziny), Q (2026-12-01 00:00), R (2026-12-01 23:59)
  When użytkownik kliknie "Ułóż po terminie"
  Then kolejność wynosi Q, R, P

Scenario: Zadania zaległe idą przed dzisiejszymi
  Given zadania: X (dziś), Y (2 dni temu), Z (bez terminu)
  When użytkownik kliknie "Ułóż po terminie"
  Then kolejność wynosi Y, X, Z

Scenario: Akcja pomija ukończone przy aktywnym "Pokaż ukończone"
  Given widoczna jest sekcja ukończonych z terminami w nieuporządkowanej kolejności
  When użytkownik kliknie "Ułóż po terminie"
  Then kolejność zadań ukończonych się nie zmienia
```

### EC-07 (US-03) Uszkodzony lub nie-tablicowy JSON w całości oraz kopia przed nadpisaniem
```gherkin
Scenario Outline: Całkowicie nieczytelna wartość klucza todoartur.tasks
  Given w localStorage klucz todoartur.tasks ma wartość <wartosc>
  When aplikacja się uruchomi i użytkownik doda zadanie
  Then aplikacja nie wywala się i pokazuje pustą listę z nowym zadaniem
  And oryginalna wartość jest nadal dostępna w kopii zapasowej
  Examples:
    | wartosc          |
    | "{ucięty json"   |
    | "{\"a\":1}"      |
    | "\"tekst\""      |
```

### EC-08 (US-03) Zduplikowane id oraz pola podstawowe o złym typie
```gherkin
Scenario: Dwa zadania z tym samym id
  Given w localStorage dwa różne zadania mają id "x1"
  When aplikacja wczyta dane i użytkownik przeciągnie jedno z nich
  Then oba zadania nadal istnieją (id jest unikalizowane przy wczytaniu)

Scenario Outline: Pola podstawowe o złym typie
  Given zadanie ma poprawne id i title, a pole <pole> ma wartość <wartosc>
  When aplikacja wczyta dane
  Then zadanie jest wyświetlone z wartością domyślną (<domyslna>)
  Examples:
    | pole       | wartosc   | domyslna                         |
    | completed  | "false"   | false                            |
    | categoryId | 7         | pierwsza istniejąca kategoria    |
    | createdAt  | "wczoraj" | bieżący czas lub 0               |
    | title      | 12345     | zadanie odrzucone (zgodnie z US-03) |
```
Dotychczasowy US-03 sprawdza tylko pola terminu. `categoryId` wskazujące nieistniejącą kategorię dziś ukrywa zadanie w widoku z filtrem kategorii i nie da się go usunąć wraz z kategorią.

### EC-09 (US-04, US-07) Zmiana czasu i strefy; poprawne parsowanie daty
Dziś tylko wzmianka "testy jednostkowe" w sekcji Wpływ na kod, bez AC.
```gherkin
Scenario Outline: Granica doby przy zmianie czasu
  Given strefa przeglądarki to Europe/Warsaw, a bieżąca chwila to <teraz>
  And zadanie ma dueDate <data> bez godziny
  When aplikacja policzy status i tekst terminu
  Then isOverdue zwraca <zalegle> i termin jest wyświetlony jako <tekst>
  Examples:
    | teraz            | data       | zalegle | tekst   |
    | 2026-03-29 00:30 | 2026-03-28 | true    | wczoraj |
    | 2026-03-29 03:30 | 2026-03-29 | false   | dziś    |
    | 2026-03-28 23:30 | 2026-03-29 | false   | jutro   |
    | 2026-10-25 00:30 | 2026-10-24 | true    | wczoraj |
    | 2026-10-26 00:00 | 2026-10-25 | true    | wczoraj |

Scenario: Strefa o ujemnym przesunięciu względem UTC
  Given strefa przeglądarki to America/Los_Angeles i jest 2026-11-24 20:00 czasu lokalnego
  And zadanie ma dueDate "2026-11-24"
  When użytkownik zobaczy zadanie
  Then termin to "dziś" (data nie jest parsowana jako UTC)
  And zadanie nie jest po terminie
```
Zmiana doby po przebudzeniu laptopa lub powrocie do karty na telefonie:
```gherkin
Scenario: Powrót do karty po północy
  Given zadanie z terminem na dziś jest widoczne, karta jest w tle, a zegar minął północ
  When użytkownik wróci do karty (visibilitychange)
  Then zadanie jest po terminie i filtr "Dziś" jest przeliczony bez przeładowania
```

### EC-10 (US-07) Brzegi formatu terminu
```gherkin
Scenario Outline: Granice formatu terminu (dziś = wtorek 2026-11-24)
  Given zadanie ma dueDate <data>
  Then termin jest wyświetlony jako <tekst>
  Examples:
    | data       | tekst            |
    | 2026-11-22 | nd 22.11         |
    | 2026-12-31 | cz 31.12   |
    | 2025-12-31 | śr 31.12.2025    |
    | 2026-01-05 | pn 05.01         |
    | 2027-01-01 | pt 01.01.2027    |
    | 1900-01-01 | pn 01.01.1900    |
```
Spec nie mówi też, czy "wczoraj" i "dziś" dotyczą tylko daty bez roku, co ma znaczenie na przełomie roku (dziś 2027-01-01, termin 2026-12-31 to "wczoraj").

### EC-11 (US-05, US-06) Wyróżnienie przy bardzo długich danych i na mobile
```gherkin
Scenario: Etykieta i termin przy najdłuższym tytule (200 znaków) na ekranie 320 px
  Given zadanie ma tytuł 200 znaków bez spacji, termin z godziną i jest po terminie
  When użytkownik zobaczy listę w szerokości 320 px
  Then tytuł, termin i etykieta "Po terminie" są widoczne
  And nie ma poziomego przewijania strony

Scenario: Uchwyt przeciągania i przyciski nie nakładają się z etykietą
  Given zadanie po terminie z kategorią i godziną na ekranie 320 px
  When użytkownik dotknie uchwytu, checkboxa i przycisków edycji i usuwania
  Then każdy element reaguje poprawnie, a cele dotyku mają co najmniej 24x24 px
```

---

## 3. Niespójności

- **N-01 Numeracja pytań/decyzji (01 vs decyzje).** W 01 źródła wskazują "decyzje Q-02", "Q-03", "Q-07", "Q-08" (numeracja z pliku decyzji), a sekcja "Otwarte pytania" w tym samym pliku ma własne Q-01 do Q-07 o innym znaczeniu (np. 01 Q-03 = "Ułóż po terminie", decyzje Q-03 = ukończone nie na czerwono). W 02 tabela "Założenia domyślne" używa numeracji z 01, a nagłówek 02 odwołuje się do "decyzji Q-04" z pliku decyzji. Recenzent nie jest w stanie bez zgadywania powiązać "Q-07" z konkretną sprawą. Zaproponować prefiksy: `D-xx` dla decyzji, `OQ-xx` dla otwartych pytań.
- **N-02 FR-08 "zaległe" kontra założenie Q-01 w 02.** FR-08 i decyzja: filtr "Dziś" = na dziś + zaległe. FR-06/BR-04: ukończone nigdy nie są zaległe. Założenie Q-01 (US-08) każe jednak po włączeniu "Pokaż ukończone" pokazać ukończone z terminem "dziś lub wcześniejszym", czyli ukończone zadanie sprzed roku trafi do filtra "Dziś". To rozszerza definicję poza decyzję Artura. Scenariusz AC w US-08 sprawdza tylko ukończone "z terminem dziś", więc przypadek ukończone-zaległe nie ma AC. Zob. R-02.
- **N-03 FR-05 "wyróżnione kolorem czerwonym" kontra założenie Q-05 "czerwona etykieta".** FR-05 mówi o zadaniu, założenie i US-05 o etykiecie (badge). AC "zadanie ma czerwone wyróżnienie" jest niejednoznaczne: czerwony wiersz, obramowanie, tekst terminu czy sama etykieta? Niemożliwe do jednoznacznego sprawdzenia. Wskazać element (np. etykieta + czerwony tekst terminu) i wymagać dla niego kontrastu.
- **N-04 US-11 bez pokrycia w wymaganiach.** US-11 powołuje się na NFR-01, ale NFR-01 mówi o odczycie starych danych, nie o błędzie zapisu. Brak FR/NFR dla informowania o niezapisaniu; historia wprowadza zachowanie spoza decyzji Artura (i spoza notatek). Dodać NFR-05 albo oznaczyć US-11 jako propozycję QA do zatwierdzenia.
- **N-05 Komunikaty bez treści.** US-01, US-02, US-11 wymagają "komunikatu", ale AC nie podaje tekstu ani miejsca. Test "użytkownik widzi komunikat o błędnym terminie" nie jest jednoznaczny. Podać dokładne treści, np. "Godzina wymaga wybrania daty." i "Nie udało się zapisać zmian. Po odświeżeniu mogą zniknąć.".
- **N-06 Nagłówek 02 powołuje się na 03 jako źródło, a 03 jest nadpisywany.** Spec zależy od dokumentu, który z definicji się zmienia. Po zamknięciu tego audytu przenieść ustalenia (K-01 do K-07 i nowe K-08) do samej specyfikacji i usunąć zależność.
- **N-07 Tabela pokrycia: "wszystkie FR pokryte".** Pokrycie jest formalnie kompletne, ale FR-02 ("termin przy edycji") ma w US-02 tylko jedno AC dla głównej ścieżki i nie ma AC wyświetlania pola edycji z wstępnie wypełnioną wartością. Dopisać: po wejściu w edycję pola daty i godziny pokazują aktualny termin.

---

## 4. Rekomendacje

- **R-01 (US-04, K-05) Odświeżanie doby przez timer jest kruche w testach i w tle.** Timery w kartach w tle na mobile są dławione. Zalecam sygnał `today` zasilany funkcją `now()` wstrzykiwaną (token DI), żeby testy nie używały prawdziwego zegara. AC "Przejście północy" ma być testowane z fałszywym zegarem, a nie czekaniem.
- **R-02 (US-08, założenie Q-01) Zakwestionować założenie o ukończonych w filtrze "Dziś".** Bezpieczniejsze: ukończone w filtrze "Dziś" tylko z terminem dokładnie na dziś. Lista "Dziś" nie powinna rosnąć o wszystko ukończone z historii. Wymaga krótkiego potwierdzenia Artura; do tego czasu implementować wariant ostrożny.
- **R-03 (US-01, EC-02) Ciche porzucenie niepełnej daty.** Użytkownik, który wpisał tylko część daty, dostanie zadanie bez terminu bez żadnego sygnału. Rozważyć wymóg, by `input` z nieprawidłowym stanem (`validity.badInput`) blokował zapis z komunikatem.
- **R-04 (założenie Q-02, US-01) Termin w przeszłości bez ostrzeżenia.** Łatwa pomyłka: kalendarz otwarty na zły miesiąc/rok daje od razu czerwone zadanie. Skoro Artur nie odpowiedział, rozważyć subtelną podpowiedź przy polu ("data w przeszłości"), bez blokowania. Opcjonalne.
- **R-05 (założenie Q-05, US-05, US-06) Kontrast ukończonych zadań.** Wiersz ukończony ma już `opacity-60`. Jeśli termin "w stonowanym stylu" jest dodany na tym tle, tekst terminu może spaść poniżej 4.5:1 w ciemnym motywie. AC kontrastu dotyczy tylko etykiety. Dopisać pomiar również dla tekstu terminu w ukończonych i na tle `red-500/15` nad faktycznym tłem karty w ciemnym motywie (kontrast zależy od podłoża).
- **R-06 (US-11, wiele kart) Ograniczenie "ostatni zapis wygrywa" jest groźniejsze po zmianie.** Karta otwarta od wczoraj ma w pamięci stary stan; pierwsza zmiana (np. wskazanie ukończenia) nadpisze zadania dodane w drugiej karcie. Z `visibilitychange` i tak wprowadzamy nasłuch (K-05), więc taniej jest przy powrocie do karty ponownie wczytać zadania z `localStorage`. Jeśli decyzja "brak synchronizacji" zostaje, AC w README powinno podać konkretny scenariusz utraty danych.
