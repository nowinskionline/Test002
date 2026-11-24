# Drzewo pytań (grill-me, wariant sub-agenta)

Źródło: `docs/ba/input/pomysly-zaleglosci-inbox-energia.md` (3 pomysły, 24.11).
Kontekst sprawdzony samodzielnie (nie pytamy o to):
- Istniejący model `Task`: `id, title, categoryId, completed, createdAt`. Brak priorytetu, notatki, powiązań, trudności, miejsca. Są kategorie (Praca/Dom/Inne + własne), ręczna kolejność (drag & drop), ukryte ukończone, filtr kategorii, `localStorage`, brak backendu i kont.
- Decyzje z `przyklad-terminy-zadan-decyzje.md`: termin = data + opcjonalna godzina; "po terminie" dopiero od następnego dnia (lokalna strefa); filtr "Dziś" = dziś + zaległe, łączy się z filtrem kategorii; ręczna kolejność zawsze ważniejsza, dopuszczalna jednorazowa akcja "Ułóż po terminie"; etykieta "Po terminie"; przypomnienia usunięte z zakresu.
- Wniosek: "zaległe" jest już zdefiniowane (po północy po dacie terminu). Zadanie bez terminu nigdy nie jest zaległe. Nie pytamy więc "co to zaległe", tylko "co z tym robimy".

Konwencja: Pn.X = pytanie, "Zależy od" = pytanie, którego odpowiedź musi być znana wcześniej. Rekomendacja oznaczona (R).

---

## Wymaganie 1. Ogarnianie zaległości po gorszym dniu

**Słowa-wytrychy do doprecyzowania:** "inteligentnie", "zawalony dzień", "nic nie ruszyłem / większość zadań została", "odbić się", "nie przytłaczać", "chować pod dywan", "jakoś pomóc".

**Sprzeczność do nazwania:** "nie przytłaczać" vs "nie chować pod dywan". Pierwsze sugeruje ukrywanie/zmniejszanie liczby widocznych zaległych, drugie zabrania ukrywania. Trzeba ustalić, co jest widoczne zawsze, a co jest redukowane.

### P1.1 (KORZEŃ) Czym jest "pomoc" w odbiciu się?
Zależy od: nic.
- A. Podpowiedź na dziś: aplikacja proponuje krótką listę zadań do zrobienia dziś z zaległych, reszta zostaje widoczna.
- B. Przeplanowanie: akcja zbiorcza zmieniająca terminy zaległych na nowe daty (dziś/jutro/wybór).
- C. Tylko widok: zaległe zwinięte w jedną sekcję z licznikiem, bez zmian danych.
- D. Połączenie A + B.
- (R) A. Najmniej ingeruje w dane, odpowiada na "nie przytłaczać" (krótka lista) i "nie pod dywan" (reszta widoczna); B można dodać później.

### P1.2 Kiedy aplikacja uznaje, że to "gorszy dzień"?
Zależy od: P1.1.
- A. Nigdy automatycznie, użytkownik sam wywołuje akcję ("Ogarnij zaległe").
- B. Automatycznie po progu (np. 3+ zaległe lub >50% zadań z dziś nieukończone).
- C. Przy pierwszym otwarciu aplikacji następnego dnia, jeśli są zaległe.
- (R) A. Brak powiadomień/przypomnień w zakresie, a próg to zgadywanie bez danych; akcja na żądanie jest testowalna.

### P1.3 Co dokładnie widzi użytkownik, żeby nie czuć się przytłoczony?
Zależy od: P1.1, P1.2.
- A. Maksymalnie N zadań w podpowiedzi (jakie N?), reszta zwinięta z liczbą.
- B. Zaległe pogrupowane wg wieku (wczoraj / ten tydzień / starsze).
- C. Zaległe zawsze w pełnej liście, bez zmian.
- (R) A z N=3 (do potwierdzenia) i widocznym licznikiem "+X więcej", bo spełnia oba przeciwstawne wymagania.

### P1.4 Jak wybieramy zadania do podpowiedzi?
Zależy od: P1.3.
- A. Najstarszy termin najpierw.
- B. Według ręcznej kolejności użytkownika (zgodnie z zasadą "ręczna kolejność zawsze ważniejsza").
- C. Najpierw zadania z dzisiejszym terminem, potem najstarsze zaległe.
- (R) B, bo istniejąca decyzja mówi, że ręczna kolejność wygrywa; unikamy ukrytego algorytmu ("inteligentnie").

### P1.5 Czy aplikacja zmienia terminy zadań sama?
Zależy od: P1.1.
- A. Nie, tylko za wyraźną akcją użytkownika.
- B. Tak, automatycznie przesuwa zaległe na dziś.
- (R) A, bo automatyczna zmiana terminów to "chowanie pod dywan" i kłóci się ze stanem "Po terminie".

### P1.6 Czy zaległe zadania tracą etykietę "Po terminie" po przeplanowaniu?
Zależy od: P1.5 (jeśli w ogóle istnieje przeplanowanie).
- A. Tak, nowy termin = zadanie nie jest zaległe (spójnie z definicją).
- B. Zostaje ślad ("przeniesione z 20.11").
- (R) A, B to rozszerzenie wymagające nowego pola w modelu; do wersji 2.

### P1.7 Jak poznamy, że działa? (kryterium sukcesu)
Zależy od: P1.1–P1.4.
- A. Akcja daje listę max N zadań i liczbę pozostałych zaległych, a żadne zaległe zadanie nie znika z aplikacji.
- B. Pomiar jakościowy (Artur ocenia po tygodniu).
- (R) A, bo jest sprawdzalne testem akceptacyjnym.

### P1.8 Poza zakresem v1 (do potwierdzenia)
- Powiadomienia i przypomnienia (już usunięte).
- Uczenie się nawyków, statystyki, "streaki".
- Automatyczne przesuwanie terminów.
- Synchronizacja między urządzeniami.
- (R) Potwierdzić całą listę.

---

## Wymaganie 2. Szybki wrzut zadania z głowy (inbox)

**Słowa-wytrychy do doprecyzowania:** "w locie", "bez rozpraszania", "zwykła pierdoła", "coś pilnego", "powiązane z czymś innym", "robi śmietnik", "potem".

**Sprzeczność do nazwania:** "szybki wrzut bez rozpraszania" (zero pól) vs "pilne / powiązane / bez śmietnika" (wymaga metadanych). Trzeba ustalić, co jest wpisywane przy wrzucie, a co dopiero później.

### P2.1 (KORZEŃ) Czy wrzut ma osobne miejsce (skrzynka), czy trafia od razu na listę?
Zależy od: nic.
- A. Osobna skrzynka "Inbox": zadania wpadają tam bez kategorii, a użytkownik później je porządkuje.
- B. Od razu na główną listę, z kategorią domyślną (np. "Inne"), bez osobnej skrzynki.
- C. Główna lista, ale z oznaczeniem "do przejrzenia" (bez osobnego widoku).
- (R) C, bo najmniej zmian: kategoria "Inne" już istnieje, a flaga "do przejrzenia" pozwala uniknąć "śmietnika" bez nowego widoku. A jest sensowne, jeśli Artur chce czystej głównej listy (to jest właśnie do rozstrzygnięcia).

### P2.2 Ile pól przy wrzucie?
Zależy od: P2.1.
- A. Tylko tytuł (Enter = gotowe).
- B. Tytuł + opcjonalnie kategoria.
- C. Tytuł + skróty (np. "!" = pilne, "#kategoria", termin).
- (R) A, bo "bez rozpraszania"; resztę dopowiada się przy porządkowaniu.

### P2.3 Skąd wrzut jest dostępny?
Zależy od: P2.1.
- A. Zawsze widoczne pole na górze strony (już jest formularz dodawania).
- B. Skrót klawiaturowy otwierający pole z dowolnego miejsca aplikacji.
- C. Poza aplikacją (rozszerzenie, widżet, PWA).
- (R) B. Sprawdzić najpierw, czy obecny formularz już spełnia "w locie"; C wychodzi poza obecny stack (brak backendu), więc poza zakresem.

### P2.4 Co znaczy "pilne"?
Zależy od: P2.2.
- A. Zadanie z terminem na dziś (wykorzystuje istniejący termin i filtr "Dziś").
- B. Osobna flaga "pilne" (nowe pole).
- C. Nie robimy, pilność wynika wyłącznie z terminu.
- (R) C lub A, bo nowa flaga duplikuje termin i pogłębia chaos; potwierdzić z Arturem, czy "pilne" to to samo co "na dziś".

### P2.5 Co znaczy "powiązane z czymś innym"?
Zależy od: P2.1.
- A. Powiązanie z innym zadaniem (relacja zadanie-zadanie, podzadania lub "blokuje").
- B. Powiązanie z kategorią (to już istnieje).
- C. Dowolna notatka/link tekstowy do kontekstu.
- D. Nie robimy w v1.
- (R) D (lub B jako domyślna odpowiedź), bo relacje między zadaniami to duża zmiana modelu; ustalić, czy chodzi o A, bo od tego zależy zakres.

### P2.6 Jak definiujemy "śmietnik" i jak mu zapobiegamy?
Zależy od: P2.1, P2.2.
- A. Limit/licznik: skrzynka z licznikiem "do przejrzenia: X" i jednym kliknięciem zatwierdzenia lub usunięcia.
- B. Automatyczne czyszczenie zadań "do przejrzenia" starszych niż N dni.
- C. Użytkownik sam dba, bez mechanizmu.
- (R) A. B kasuje dane bez wiedzy użytkownika, co grozi utratą pomysłów.

### P2.7 Przegląd wrzuconych zadań, czyli kiedy i jak "porządkuje"?
Zależy od: P2.6.
- A. Użytkownik wchodzi w "do przejrzenia" i dla każdego ustawia kategorię/termin/usuń.
- B. Zadanie "przestaje być do przejrzenia" po pierwszej edycji (kategoria, termin).
- C. Przegląd w trybie jedno-zadanie-na-raz.
- (R) B (nieinwazyjne, oparte o istniejącą edycję) z listą z A.

### P2.8 Poza zakresem v1 (do potwierdzenia)
- Aplikacja mobilna, rozszerzenie, głosowe dodawanie.
- Podzadania i zależności.
- Automatyczna klasyfikacja treści.
- Kasowanie automatyczne.
- (R) Potwierdzić całą listę.

---

## Wymaganie 3. Tryb skupienia pod energię / kontekst

**Słowa-wytrychy do doprecyzowania:** "tryb skupienia", "energia", "głowa do ciężkich rzeczy", "wypruty", "coś prostego", "w konkretnym miejscu", "sama podpowiadała", "co teraz ma sens".

**Sprzeczność/ryzyko do nazwania:** "sama podpowiadała" (brak pytań) vs brak w modelu danych o trudności i miejscu. Aplikacja nie może zgadnąć trudności ani miejsca zadania, więc ktoś musi to wprowadzić (użytkownik lub heurystyka). Pytanie o koszt wprowadzenia tych danych kłóci się z "bez rozpraszania" z wymagania 2.

### P3.1 (KORZEŃ) Skąd aplikacja wie, jak trudne jest zadanie?
Zależy od: nic.
- A. Użytkownik ręcznie oznacza zadanie (np. proste/ciężkie).
- B. Aplikacja zgaduje po treści (długość tytułu, słowa kluczowe).
- C. Kategoria wyznacza trudność (np. Praca = ciężkie).
- D. Nie oceniamy trudności, tylko kontekst (miejsce) i termin.
- (R) A z domyślną wartością "nieoznaczone", bo B jest nieweryfikowalne ("inteligentnie"), a C jest błędne (zadanie w "Pracy" może być banalne). Wymaga nowego pola `[NOWE]` w `Task`.

### P3.2 Ile poziomów energii/trudności?
Zależy od: P3.1 (jeśli A).
- A. 2 (lekkie / ciężkie).
- B. 3 (lekkie / średnie / ciężkie).
- C. Wolna skala 1-5.
- (R) A, bo odpowiada słowom Artura ("ciężkie" vs "coś prostego") i jest najszybsze do oznaczania.

### P3.3 Czym jest "konkretne miejsce / kontekst"?
Zależy od: nic (równoległa gałąź do P3.1).
- A. Etykieta miejsca wpisywana ręcznie (dom, biuro, sklep, w drodze).
- B. Lokalizacja GPS.
- C. Kategoria pełni rolę kontekstu (Dom, Praca).
- D. Poza zakresem v1, tylko energia.
- (R) C lub D. B niemożliwe bez backendu/uprawnień i poza stackiem; sprawdzić, czy kategoria "Dom/Praca" wystarcza Arturowi. Jeśli nie, A jako osobne pole (rozstrzygnąć).

### P3.4 Jak użytkownik zgłasza swój obecny stan?
Zależy od: P3.1, P3.3.
- A. Przełącznik/filtr "mam energię / jestem zmęczony" ustawiany ręcznie.
- B. Aplikacja zgaduje po porze dnia lub liczbie ukończonych zadań.
- C. Brak deklaracji, aplikacja wyświetla jedną "następną rzecz".
- (R) A, bo "sama podpowiadała" bez danych o stanie to zgadywanie; odpowiedź Artura potrzebna, czy akceptuje jedno kliknięcie.

### P3.5 Co dokładnie robi "tryb"?
Zależy od: P3.4.
- A. Filtr: pokazuje tylko zadania pasujące do stanu (jak istniejący filtr kategorii, łączy się z "Dziś").
- B. Podświetla/sortuje pasujące, reszta zostaje widoczna.
- C. Pokazuje jedno zadanie ("co teraz").
- (R) A (wzorem filtra "Dziś"), bo reużywa wzorca i jest testowalny. B łamie zasadę "ręczna kolejność zawsze ważniejsza".

### P3.6 Jak tryb zachowuje się wobec zaległych i terminów?
Zależy od: P3.5, wymaganie 1.
- A. Zaległe i dzisiejsze zawsze widoczne niezależnie od trybu.
- B. Tryb filtruje wszystko, także zaległe.
- C. Zaległe wyróżnione ponad wynikami trybu.
- (R) A, bo filtrowanie zaległych byłoby właśnie "chowaniem pod dywan" (spójne z wymaganiem 1).

### P3.7 Co z zadaniami nieoznaczonymi?
Zależy od: P3.1, P3.5.
- A. Pokazywane w każdym trybie.
- B. Ukryte w trybie filtrowanym.
- C. Traktowane jak "lekkie".
- (R) A, bo istniejące zadania i wrzuty z wymagania 2 nie mają oznaczenia i nie mogą znikać.

### P3.8 Jak poznamy, że działa?
Zależy od: P3.4, P3.5.
- A. Po wybraniu stanu lista zawiera wyłącznie pasujące i nieoznaczone zadania plus zaległe/dzisiejsze.
- B. Subiektywna ocena po tygodniu.
- (R) A.

### P3.9 Poza zakresem v1 (do potwierdzenia)
- GPS i geofencing.
- Automatyczne wykrywanie stanu, uczenie maszynowe.
- Statystyki energii w czasie.
- Przypomnienia.
- (R) Potwierdzić całą listę.

---

## Zależności między wymaganiami (do rozstrzygnięcia w kolejności)
1. P1.1 przed P1.3-P1.6.
2. P2.1 przed pozostałymi pytaniami 2.x; od P2.1 zależy, czy "do przejrzenia" jest statusem, czy widokiem.
3. P3.1 i P3.3 (równolegle) przed P3.4-P3.8.
4. P3.6 zależy od wyniku wymagania 1 (co jest "zaległe, zawsze widoczne").
5. P2.4 zależy od modelu terminów (już zdecydowany): "pilne" bez własnej flagi.
6. Wspólny ślad modelu `Task` (pola `[NOWE]`): kandydaci to flaga "do przejrzenia" (W2) i poziom trudności (W3). Wspólnie z `dueDate/dueTime` z terminów. Wymaga migracji danych w `localStorage` (zadania istniejące bez nowych pól muszą działać).

## Pytania, które główna sesja powinna zadać w pierwszej kolejności
1. P1.1, 2. P2.1, 3. P3.1.
