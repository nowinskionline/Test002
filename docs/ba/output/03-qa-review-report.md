# Raport QA: zaległości, szybki wrzut, tryb energii

Przeglądane: `01-extracted-requirements.md`, `02-user-stories-spec.md`. Porównane z kodem w `src/` (stan wyjściowy: terminy, filtr "Dziś", "Ułóż po terminie", `normalizeTask`, kopia `todoartur.tasks.backup`).
Decyzje z `pomysly-zaleglosci-inbox-energia-decyzje.md` i "założenia domyślne" (Q-01..Q-09) w 02 przyjęte jako dane. Nie są blokerami. Wątpliwości do nich są w sekcji 4.

Podsumowanie: 4 krytyczne blokery (0 produktowych, 4 technicznych), 14 brakujących edge case'ów, 8 niespójności, 8 rekomendacji.

---

## 1. Krytyczne blokery

### B-1 [TECHNICZNY - rozstrzygnięty rekomendacją] Kolejność kluczy w JSON powoduje fałszywe kopie zapasowe (US-01, także US-04, US-06)
Dowód: `loadTasks` (`task.service.ts:283`) porównuje `JSON.stringify(tasks) !== JSON.stringify(parsed)`. To porównanie zależy od kolejności kluczy. `normalizeTask` buduje obiekt w kolejności `id, title, categoryId, completed, createdAt, dueDate, dueTime`. `updateTask` składa `{...rest, title, categoryId, ...dueResult}`, więc klucze terminu zawsze lądują na końcu.
Scenariusz: zadanie dostaje `difficulty`, a potem `dueDate`. W `localStorage` jest `...createdAt, difficulty, dueDate`. Przy następnym starcie `normalizeTask` (zgodnie z opisem US-01) wypisze klucze w innej kolejności, np. `dueDate, difficulty`. Wynik różni się od oryginału, więc powstaje kopia zapasowa przy KAŻDYM uruchomieniu. `saveRaw` nadpisuje poprzednią kopię, więc prawdziwa kopia po uszkodzeniu danych zostanie zastąpiona zdrowymi danymi. AC "Nowe pola przetrwają odświeżenie" i "nie powstaje kopia" przechodzą w teście jednego zadania z jednym polem, a zawodzą na kombinacjach.
Rekomendacja: jedna funkcja budująca zadanie w stałej kolejności kluczy, używana przez `addTask`, `updateTask` i `normalizeTask`. Albo porównywanie semantyczne zamiast `JSON.stringify`. Dopisać AC EC-01. Dodatkowo kopia nie powinna nadpisywać wcześniejszej (np. nie nadpisuj, jeśli istnieje i różni się, albo klucz z datą).

### B-2 [TECHNICZNY - rozstrzygnięty rekomendacją] Puste stany listy kolidują z istniejącą logiką (US-03, US-05, US-07)
Dowód: `task-list.html` wybiera komunikat kolejno: `todayOnly()` -> "Brak zadań na dziś ani zaległych"; `completed().length` -> "Wszystko zrobione 🎉"; inaczej "Brak zadań / Dodaj pierwsze zadanie powyżej". Spec zakłada nowe komunikaty ("Brak zadań do przejrzenia", "Brak zadań pasujących do filtrów") i nie podaje pierwszeństwa względem istniejących.
Scenariusze, które dziś dałyby błędny komunikat:
1. Tryb "Jestem wypruty" ukrywa wszystkie aktywne zadania, a istnieje choć jedno ukończone. Pokaże się "Wszystko zrobione 🎉", choć zostały ciężkie zadania. To dokładnie "zamiatanie pod dywan", którego ma unikać tryb.
2. "Do przejrzenia" razem z "Dziś", gdy obie mają pustą listę. Nie wiadomo, który komunikat wygra.
3. Filtr samej kategorii z pustym wynikiem: już dziś pokazuje "Dodaj pierwsze zadanie powyżej" (błąd istniejący, ale AC US-07 wymaga od niego odejścia i nie mówi, jak).
Rekomendacja: tabela pierwszeństwa jako AC. Najpierw "są ukryte/odfiltrowane aktywne zadania, a lista jest pusta" -> komunikat filtra z nazwami aktywnych filtrów. "Wszystko zrobione" i "Dodaj pierwsze" tylko przy braku jakichkolwiek aktywnych filtrów. Dopisać AC EC-02. Kryterium decyzyjne: czy istnieje aktywne zadanie, które filtr ukrył (nie `completed().length`).

### B-3 [TECHNICZNY - rozstrzygnięty rekomendacją] Reguła zdejmowania flagi przy terminie sprzeczna z własnym AC (US-04)
Dowód: Opis wpływu na kod mówi, że flagę zdejmuje "wynik ma `dueDate`". Q-01 mówi "po zapisie zadanie ma `dueDate`". `task-item.save()` zawsze wysyła pełny stan (`dueDate: draft || null`). Zadanie z flagą i już istniejącym terminem (z backupu, ręcznie edytowanych danych, albo gdy flaga i termin współistnieją po innej ścieżce) zmieni więc flagę przy edycji samego tytułu. AC negatywny US-04 mówi odwrotnie ("tylko tytuł -> flaga zostaje").
Rekomendacja: zdejmować flagę, gdy zadanie PRZED zapisem nie miało `dueDate`, a PO zapisie ma. Tak jak dla kategorii: porównanie z `current`. Dopisać AC EC-03.

### B-4 [TECHNICZNY - rozstrzygnięty rekomendacją] Ukończone zadania z flagą: licznik, filtr i "OK" opisują różne zbiory (US-03, US-05)
Dowód: licznik liczy tylko nieukończone (US-03). `matchesFilters` + `task-list.completed()` obejmą jednak ukończone zadania z flagą, widoczne pod "Pokaż ukończone (n)". Przy włączonym filtrze "Do przejrzenia: 3" lista pokaże 3 aktywne, a poniżej "Pokaż ukończone (1)" (zadanie, którego licznik nie liczy). Odznaczenie ukończonego zadania "wskrzesza" flagę i licznik rośnie bez udziału użytkownika. Spec nie mówi, czy "OK" jest widoczny przy ukończonym zadaniu z flagą.
Rekomendacja: filtr "Do przejrzenia" obejmuje tylko nieukończone (zgodnie z licznikiem). "OK" tylko przy nieukończonych. Odznaczenie (przywrócenie) przywraca flagę zgodnie z Q-08 i licznik rośnie o 1; opisać to w AC EC-04.

---

## 2. Brakujące edge case'y (gotowe AC do dopisania)

### EC-01 (US-01) Klucze w dowolnej kolejności, bez fałszywej kopii
```gherkin
Scenario: Kolejność kluczy w localStorage nie wywołuje kopii zapasowej
  Given w localStorage zadanie ma klucze w kolejności id, title, categoryId, completed, createdAt, difficulty, dueDate
  And needsReview = true
  When aplikacja się uruchamia
  Then todoartur.tasks.backup nie istnieje
  And po edycji (dodaniu terminu do zadania z trudnością) i odświeżeniu nadal nie istnieje

Scenario: Istniejąca kopia nie jest nadpisywana przez zdrowe uruchomienie
  Given w todoartur.tasks.backup jest zapisana kopia uszkodzonych danych
  When aplikacja uruchamia się 3 razy na poprawnych danych
  Then zawartość todoartur.tasks.backup jest taka sama jak przed uruchomieniami
```

### EC-01b (US-01) `needsReview: false` i starsza wersja aplikacji
```gherkin
Scenario: needsReview = false jest równoważne brakowi flagi
  Given zadanie w localStorage ma needsReview = false
  When aplikacja się uruchamia
  Then zadanie jest wczytane bez flagi
  And nie powstaje kopia zapasowa (wartość false nie jest uszkodzeniem)

Scenario: Stara wersja aplikacji w drugiej karcie
  Given zadanie ma needsReview i difficulty, a druga karta działa na starej wersji bez tych pól
  When stara wersja zapisze listę
  Then (do ustalenia przy odbiorze) nowe pola są utracone, a użytkownik widzi opis ryzyka w README
```
Uwaga: drugi scenariusz jest testem akceptacyjnym ryzyka. Stara `normalizeTask` gubi nieznane pola i nadpisuje listę.

### EC-02 (US-03, US-07) Priorytet komunikatów pustej listy
```gherkin
Scenario: Tryb ukrywa wszystkie aktywne, ale są ukończone
  Given 2 aktywne zadania "ciężkie" bez terminu i 1 ukończone
  When wybieram "Jestem wypruty"
  Then lista pokazuje "Brak zadań pasujących do filtrów"
  And nie pokazuje "Wszystko zrobione"

Scenario: Filtr samej kategorii bez wyników
  Given kategoria "Dom" bez zadań, a w innych kategoriach są zadania
  When wybieram kategorię "Dom"
  Then lista nie pokazuje "Dodaj pierwsze zadanie powyżej"

Scenario: Dwa filtry puste naraz
  Given włączone "Dziś" i "Do przejrzenia", brak pasujących zadań
  Then pokazuje się jeden komunikat wymieniający aktywne filtry: "Dziś", "Do przejrzenia"
```

### EC-03 (US-04) Termin już istniejący, edycja tytułu
```gherkin
Scenario: Zadanie z flagą i istniejącym terminem, edycja tytułu
  Given zadanie ma flagę i dueDate 2026-12-01 (np. z danych wczytanych z backupu)
  When w edycji zmieniam tylko tytuł i zapisuję
  Then flaga zostaje

Scenario: Zmiana terminu na inny nie zdejmuje flagi
  Given zadanie ma flagę i dueDate 2026-12-01
  When zmieniam termin na 2026-12-02
  Then flaga zostaje

Scenario: Zdjęcie flagi widoczne przy filtrze "Do przejrzenia"
  Given filtr "Do przejrzenia" jest włączony i widzę zadanie z flagą
  When w edycji zmieniam kategorię na "Dom" i zapisuję
  Then zadanie znika z widoku filtra
  And pokazuje się toast "Zapisano ... poza bieżącym filtrem"
```

### EC-04 (US-03, US-05) Ukończone zadanie z flagą
```gherkin
Scenario: Ukończenie zadania z flagą
  Given licznik pokazuje "Do przejrzenia: 3"
  When zaznaczam jedno zadanie z flagą jako ukończone
  Then licznik pokazuje "Do przejrzenia: 2"
  And przy włączonym filtrze "Do przejrzenia" ukończone zadanie nie jest na liście

Scenario: Przywrócenie ukończonego zadania z flagą
  Given ukończone zadanie ma flagę
  When odznaczam je jako nieukończone
  Then licznik rośnie o 1 i przy zadaniu jest widoczny przycisk "OK"

Scenario: Brak przycisku OK przy ukończonym
  Given ukończone zadanie ma flagę
  Then przy nim nie ma przycisku "OK"
```

### EC-05 (US-02) Widoczność flagi na zadaniu
Spec nigdy nie definiuje wizualnego oznaczenia flagi na liście. "Ma flagę" jest nieweryfikowalne z poziomu UI.
```gherkin
Scenario: Flaga jest widoczna na zadaniu
  Given zadanie ma flagę "do przejrzenia"
  Then na zadaniu jest etykieta "Do przejrzenia" widoczna w jasnym i ciemnym motywie
  And czytnik ekranu odczytuje ją tekstem, nie samym kolorem
```

### EC-06 (US-05) Przycisk "OK" bez hovera i na mobile
Dowód: akcje w `task-item.html` mają `sm:opacity-0 sm:group-hover:opacity-100`. "OK" dodany do tego kontenera byłby niewidoczny do najechania myszą, co łamie "nie dokładaj klikania" (NFR-01).
```gherkin
Scenario: OK widoczny bez najechania
  Given zadanie z flagą na desktopie, mysz poza zadaniem
  Then przycisk "OK" jest widoczny i dostępny z klawiatury (Tab)

Scenario: OK na ekranie 360 px
  Given szerokość ekranu 360 px
  Then przycisk "OK", uchwyt, checkbox, etykiety i akcje nie nachodzą na siebie, a cel dotykowy ma co najmniej 44 px
```

### EC-07 (US-02) Zapis nie powiódł się i długi tytuł
```gherkin
Scenario: Brak miejsca w localStorage przy wrzucie
  Given zapis do localStorage kończy się błędem
  When wrzucam "Kupić mleko"
  Then zadanie pojawia się na liście w pamięci
  And widoczny jest baner "Nie udało się zapisać zmian..."
  And pole jest wyczyszczone i ma fokus

Scenario: Wklejenie tytułu dłuższego niż 200 znaków
  Given wklejam 500 znaków do pola "Szybki wrzut"
  When naciskam Enter
  Then zadanie ma tytuł o długości co najmniej 1 i co najwyżej 200 znaków
  And użytkownik jest o tym poinformowany (nie jest to ciche ucięcie)
```
Dowód: istniejące pola mają `maxlength="200"`, które w przeglądarce ucina wklejony tekst bez ostrzeżenia. Wrzut to "wyrzucanie z głowy", więc cicha utrata treści jest tu szczególnie kosztowna.

### EC-08 (US-02) Toast przy wrzucie wypiera "Cofnij"
Dowód: `ToastService` ma jedno miejsce na toast, nowy zastępuje poprzedni. Przy aktywnym filtrze "Dziś" (typowym po złym dniu) KAŻDY wrzut (zawsze bez terminu) jest poza filtrem i pokazuje toast.
```gherkin
Scenario: Wrzut nie kasuje szansy na Cofnij
  Given usunąłem zadanie i widzę toast "Usunięto ... Cofnij"
  When w ciągu 5 sekund wrzucam nowe zadanie przy aktywnym filtrze "Dziś"
  Then (do ustalenia) przycisk "Cofnij" nadal jest dostępny, albo toast wrzutu nie zastępuje toasta z akcją

Scenario: Seria wrzutów przy aktywnym filtrze
  Given aktywny jest filtr "Dziś"
  When wrzucam 3 zadania pod rząd
  Then pojawia się co najwyżej jeden toast naraz z tekstem o ostatnim zadaniu
  And pole zachowuje fokus
```

### EC-09 (US-02) Kategoria "Inne" po usunięciu i ponownym utworzeniu
Dowód: spec szuka id `inne`. Użytkownik, który usunął domyślną "Inne" i stworzył własną o nazwie "Inne" (nowe UUID), dostaje wrzuty do pierwszej kategorii (np. "Praca"), choć "Inne" istnieje.
```gherkin
Scenario: Kategoria o nazwie "Inne" z innym id
  Given kategoria o id "inne" nie istnieje, ale istnieje kategoria o nazwie "Inne" (id inne niż "inne")
  When wrzucam zadanie
  Then zadanie trafia do kategorii o nazwie "Inne"
```

### EC-10 (US-02) Duplikaty i identyczne wrzuty
```gherkin
Scenario: Ten sam tytuł dwa razy
  Given wrzuciłem "Zadzwonić do lekarza"
  When wrzucam "Zadzwonić do lekarza" jeszcze raz
  Then powstają dwa osobne zadania z flagą, a licznik rośnie o 2
```

### EC-11 (US-10, US-11) Komunikat pustego panelu przy aktywnym filtrze kategorii
Dowód: panel respektuje filtr kategorii (Q-06), ale komunikat brzmi "Brak zaległych i dzisiejszych zadań". Przy filtrze "Dom" oraz zaległych w "Praca" komunikat jest fałszywy.
```gherkin
Scenario: Zaległe są tylko w innej kategorii
  Given aktywna kategoria "Dom" bez zaległych, a "Praca" ma 2 zaległe
  When klikam "Ogarnij zaległe"
  Then panel pokazuje "Brak zaległych i dzisiejszych zadań w kategorii Dom"
  And informuje, że w innych kategoriach są zadania do ogarnięcia (liczba), z możliwością pokazania wszystkich
```

### EC-12 (US-11, US-12) Północ, uśpiona karta i panel otwarty
```gherkin
Scenario: Minięcie północy przy otwartym panelu
  Given panel jest otwarty, a zadanie z terminem jutro nie jest w panelu
  When mija północ (albo karta wraca z uśpienia: visibilitychange)
  Then zadanie pojawia się w panelu bez odświeżania strony
  And zadanie z terminem "dziś" ma etykietę "Po terminie" i nadal jest w panelu

Scenario: Zmiana czasu
  Given dzień zmiany czasu (23 h lub 25 h)
  Then zadanie z terminem wczorajszym jest zaległe, a z dzisiejszym nie
```

### EC-13 (US-11) Odznaczenie w panelu i zaznaczenie przez pomyłkę
```gherkin
Scenario: Pomyłkowe kliknięcie "zrobione" w panelu
  Given panel pokazuje A, B, C
  When zaznaczam "zrobione" przy A
  Then A znika z panelu
  And pokazuje się toast "Zrobione ... Cofnij" przywracający A na to samo miejsce (do ustalenia)

Scenario: Wszystkie zrobione z panelu
  Given w panelu zostało jedno zadanie
  When zaznaczam je jako zrobione
  Then panel pokazuje komunikat "Brak zaległych i dzisiejszych zadań"
  And nie zamyka się samoczynnie
```
Dowód: `toggleTask` nie ma "Cofnij", a w panelu zadanie znika natychmiast z miejsca kliknięcia, więc odznaczenie wymaga otwarcia "Pokaż ukończone".

### EC-14 (US-12) Bardzo długa lista i mobile
```gherkin
Scenario: Pozostałych zadań jest 300
  Given jest 303 kwalifikujących się zadań
  Then pod 3 zadaniami widzę "+300 więcej"
  When rozwijam
  Then rozwinięta lista przewija się wewnątrz panelu (max wysokość) i nie wypycha listy głównej poza ekran
  And otwarcie nie trwa dłużej niż 1 s

Scenario: Panel na ekranie 360 px
  Given szerokość 360 px
  When otwieram panel z 3 zadaniami z długimi tytułami (200 znaków)
  Then tytuły się zawijają, a checkbox "zrobione" ma cel dotykowy co najmniej 44 px
```

### EC-15 (US-07, wspólne) Wiele kart i brak nasłuchu na `storage`
Dowód: w `src/` nie ma nasłuchu zdarzenia `storage`. Każda karta trzyma własny stan w sygnałach i zapisuje całą listę. Wrzut z przypiętej karty ginie przy następnym zapisie z drugiej.
```gherkin
Scenario: Wrzut w jednej karcie, edycja w drugiej
  Given dwie karty otwarte na tej samej liście
  When w karcie 1 wrzucam zadanie "X", a potem w karcie 2 odznaczam inne zadanie
  Then zadanie "X" nadal istnieje po odświeżeniu obu kart
```
Ten scenariusz dziś by nie przeszedł (problem istniejący, ale wrzut zwiększa jego wagę). Do decyzji: dopisać nasłuch `storage`, albo świadomie przyjąć ryzyko i wpisać do README.

### EC-16 (US-06) Trudność przy edycji i zgodność z formularzem
```gherkin
Scenario: Edycja zapisuje pełny stan trudności
  Given zadanie jest "ciężkie"
  When w edycji zmieniam tylko tytuł i zapisuję
  Then zadanie nadal jest "ciężkie" (brak klucza difficulty w zmianach nie zeruje pola)

Scenario: Pole trudności w formularzu po dodaniu
  Given w formularzu wybrałem "ciężkie" i dodałem zadanie
  Then pole trudności wraca do "brak" (jak termin), by kolejne zadanie nie dziedziczyło oznaczenia
```

---

## 3. Niespójności

- **N-1 (US-03 vs `matchesFilters`):** licznik liczy nieukończone, a filtr z `matchesFilters` objąłby też ukończone. Zob. B-4.
- **N-2 (US-04 Opis vs AC negatywny):** "wynik ma `dueDate`" zdejmuje flagę, a AC mówi, że edycja samego tytułu jej nie zdejmuje. Zob. B-3.
- **N-3 (Uwagi do realizacji vs US-11):** "US-10..US-12 nie zależą od nowych pól modelu". AC US-11 "Filtr kategorii, ale nie tryb energii" wymaga zadań z `difficulty` (US-06), więc tego AC nie da się przetestować przed US-06.
- **N-4 (01 FR-02/FR-03 vs 02 US-11/US-12):** FR-02 mówi o 3 zadaniach spośród zaległych i dzisiejszych, a FR-03/KPI mówi "żadne zadanie nie znika". Wg założenia Q-06 panel obcina do kategorii, więc "+X" nie obejmuje zaległych z innych kategorii. Z punktu widzenia KPI "nie chować zaległych" to cichy wyjątek (zob. EC-11).
- **N-5 (US-10 AC "w localStorage nie było zapisu" vs NFR-04):** `loadTasks` zapisuje kopię zapasową przy starcie, gdy normalizacja coś zmieniła (nie tylko po edycji). AC powinien mówić "nie było zapisu `todoartur.tasks` wywołanego przez panel", inaczej bywa fałszywie czerwony na danych z kopią.
- **N-6 (01 FR-17 vs US-06):** FR-17 deklaruje "obecny formularz pozostaje w pełnym zakresie", a US-06 dodaje do niego trzecią kontrolkę (trudność). To zgodne, ale FR-17 nie jest wymieniony w "Pokrywa" US-06 i odwrotnie. Brak śladu w tabeli pokrycia.
- **N-7 (NFR-02 "ok. 2 minuty"):** ma "pokrycie: całość" i nie ma żadnego AC. Nie da się go sprawdzić jednoznacznie.
- **N-8 (US-12 AC "Nic nie znika z aplikacji"):** "zgodnie z jej filtrami" czyni AC niefalsyfikowalnym (zawsze prawdziwy). Brak liczby, którą można sprawdzić.

---

## 4. Rekomendacje

1. **Wspólny kontrakt kolejności kluczy (B-1).** Jedna funkcja `buildTask` używana wszędzie. To zmniejsza też ryzyko przy każdym przyszłym polu.
2. **Kopia zapasowa nie powinna być nadpisywana** przez kolejne uruchomienia (zob. EC-01). To rozszerza istniejące zachowanie, ale nowe pola zwiększają ryzyko, że będzie nadpisywana zdrową kopią.
3. **Zakwestionowanie Q-04 (tryb symetryczny):** "Mam siłę" ukrywa zadania "lekkie". Dla użytkownika "mam siłę" zwykle znaczy "pokaż wszystko". Dodatkowo domyślne "Bez trybu" już pokazuje wszystko, więc "Mam siłę" niczego nie dodaje poza ukryciem. Warto potwierdzić z Arturem przed implementacją US-07, bo odwrócenie reguły po fakcie zmienia testy US-07/US-08/US-09/US-11.
4. **Zakwestionowanie Q-05:** tryb niezapamiętywany po odświeżeniu. Po złym dniu, który kończy się odświeżeniem strony, tryb "wypruty" wraca do "Bez trybu" bez słowa. Lepiej choć pokazywać wskaźnik "ukryto N zadań" (jest w "poza zakresem"). Bez niego tryb chowa zadania bez śladu.
5. **Zakwestionowanie Q-06 (panel respektuje kategorię):** wynik z kategorią jest zgodny z filtrami, ale sprzeczny z intencją "ogarnij wszystko po złym dniu". Rozważyć domyślnie wszystkie kategorie albo wyraźną informację o aktywnym filtrze w panelu.
6. **Zakwestionowanie decyzji "osobne pole wrzutu":** obecny formularz już przyjmuje sam tytuł + Enter (kategoria = pierwsza, termin pusty). Nowe pole dokłada drugi input tytułu na ekranie i zwiększa ryzyko pomyłki, które z nich jest które. Mimo to wartość nowego pola to flaga i kategoria "Inne". Alternatywa: tryb "bez kategorii" w istniejącym formularzu. To decyzja już podjęta, więc tylko do rozważenia przy odbiorze.
7. **"OK" bez Cofnij** (US-05): flagi po kliknięciu nie da się przywrócić (nie ma ręcznego "oznacz do przejrzenia"). Pomyłkowe kliknięcie w trybie filtra "Do przejrzenia" znika zadanie bez toasta. Rozważyć toast z "Cofnij" (mechanizm już istnieje).
8. **Nawigacja filtrów na wąskim ekranie:** `nav` ma już "Dziś", "Wszystkie", kategorie i "Kategorie". Dochodzą "Do przejrzenia: X", trójstanowy przełącznik i "Ogarnij zaległe". Dodać AC wizualne dla 360 px i dla ciemnego motywu (nowe elementy: panel, etykiety, "OK").

---

## Lista blokerów z oznaczeniem

| ID | Oznaczenie | US | Skrót |
|---|---|---|---|
| B-1 | [TECHNICZNY - rozstrzygnięty rekomendacją] | US-01 (+US-04, US-06) | Kolejność kluczy JSON daje fałszywe kopie zapasowe i nadpisuje prawdziwą |
| B-2 | [TECHNICZNY - rozstrzygnięty rekomendacją] | US-03, US-05, US-07 | Puste stany: "Wszystko zrobione 🎉" przy ukrytych przez tryb zadaniach |
| B-3 | [TECHNICZNY - rozstrzygnięty rekomendacją] | US-04 | Reguła "wynik ma dueDate" zdejmuje flagę przy edycji samego tytułu |
| B-4 | [TECHNICZNY - rozstrzygnięty rekomendacją] | US-03, US-05 | Ukończone zadania z flagą: licznik, filtr i "OK" niespójne |

Blokery produktowe (wymagające decyzji użytkownika): brak. Wątpliwości do podjętych decyzji są w Rekomendacjach 3-7.
