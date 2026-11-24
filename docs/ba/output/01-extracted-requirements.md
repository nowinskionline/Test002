# Wyodrębnione wymagania: zaległości, szybki wrzut, tryb energii

Źródła: `pomysly-zaleglosci-inbox-energia.md` (notatki), `pomysly-zaleglosci-inbox-energia-decyzje.md` (decyzje, ważniejsze od notatek). Tło: `docs/ba/output/00-grill-questions.md`.

Stan wyjściowy (istniejący): `Task` ma `id, title, categoryId, completed, createdAt, dueDate?, dueTime?`. Aplikacja ma kategorie (Praca/Dom/Inne + własne), filtr kategorii, filtr "Dziś" (dziś + zaległe, łączony z kategorią), etykietę "Po terminie" (od północy po dacie terminu), ręczną kolejność drag & drop (zawsze nadrzędną), jednorazowe "Ułóż po terminie", ukryte ukończone, `localStorage`, brak backendu i kont. Zadanie bez terminu nigdy nie jest zaległe.

Oznaczenia: `[NOWE]` - nowa funkcja, `[ZMIANA ISTNIEJĄCEGO]` - zmiana tego, co już jest.

## Cel biznesowy (Why)
Skrócić drogę do decyzji "co teraz robię" i uniknąć zarówno przytłoczenia zaległościami, jak i chowania ich. Kryterium sukcesu wspólne dla wszystkich trzech funkcji: po gorszym dniu w 2 minuty wiem, od czego zacząć; funkcje nie mogą dokładać klikania (źródło: decyzje.md, "Kryterium sukcesu (P1.7, P3.8)").

## Aktorzy / role użytkowników
- Użytkownik (Artur): jedyna rola, jedna przeglądarka, bez kont i bez backendu.

## Wymagania funkcjonalne

### Pomoc w ogarnięciu zaległości
- **FR-01 [NOWE]** Przycisk "Ogarnij zaległe" uruchamia podpowiedź na żądanie użytkownika. Aplikacja nie wykrywa "gorszego dnia" automatycznie i nie wyświetla powiadomień. (źródło: decyzje.md, "tylko na żądanie, przyciskiem 'Ogarnij zaległe'")
- **FR-02 [NOWE]** Podpowiedź pokazuje 3 nieukończone zadania, które są zaległe lub mają termin na dziś (definicje jak w istniejącym filtrze "Dziś"), wybrane według ręcznej kolejności użytkownika. (źródło: decyzje.md, "3 zadania (zaległe + na dziś, nieukończone) według ręcznej kolejności")
- **FR-03 [NOWE]** Pod 3 zadaniami jest rozwijane "+X więcej" z pozostałymi zaległymi i dzisiejszymi zadaniami; X to ich liczba. Żadne zadanie nie znika z aplikacji. (źródło: decyzje.md, "rozwijane '+X więcej'"; kryterium P1.7 z grill-questions.md)
- **FR-04 [NOWE]** Akcja nie zmienia żadnych danych zadań, w tym terminów. Reszta listy pozostaje widoczna. (źródło: decyzje.md, "Aplikacja nie zmienia danych (terminów) sama"; "reszta zostaje widoczna")
- **FR-05 [NOWE]** Wybór zadań nie używa ukrytego algorytmu (bez własnej punktacji, bez sortowania po wieku). (źródło: decyzje.md, "Bez ukrytego algorytmu")

### Szybki wrzut
- **FR-06 [NOWE]** Szybki wrzut zadania wymaga wyłącznie tytułu; Enter zatwierdza. Kategoria i termin są dodawane później. (źródło: decyzje.md, "tylko tytuł, Enter = gotowe")
- **FR-07 [NOWE]** Zadanie dodane szybkim wrzutem trafia na główną listę (bez osobnego Inboxu) i dostaje flagę "do przejrzenia". (źródło: decyzje.md, "na główną listę z flagą 'do przejrzenia' (bez osobnego Inboxa)")
- **FR-08 [NOWE]** Licznik "do przejrzenia: X" z filtrem pokazującym tylko oznaczone zadania. (źródło: decyzje.md, "licznik 'do przejrzenia: X' z filtrem")
- **FR-09 [NOWE]** Flaga "do przejrzenia" znika automatycznie, gdy zadanie dostanie kategorię lub termin, albo po kliknięciu "OK" przy zadaniu. (źródło: decyzje.md, "Flaga znika sama, gdy zadanie dostanie kategorię lub termin, albo po kliknięciu 'OK'")
- **FR-10 [NOWE]** Zadania "do przejrzenia" nie są kasowane automatycznie. (źródło: decyzje.md, "Bez automatycznego kasowania")

### Tryb energii / kontekstu
- **FR-11 [NOWE]** Opcjonalne, ręczne oznaczenie trudności zadania: "lekkie" / "ciężkie", ustawiane przy dodawaniu/edycji. Domyślnie nieoznaczone. Wymaga nowego pola w `Task`. (źródło: decyzje.md, "ręczne, opcjonalne oznaczenie przy zadaniu: lekkie / ciężkie. Domyślnie nieoznaczone")
- **FR-12 [NOWE]** Ręczny przełącznik stanu "mam siłę / jestem wypruty", działający jak filtr łączony z filtrem "Dziś" i filtrem kategorii. (źródło: decyzje.md, "działa jak filtr (łączy się z 'Dziś' i kategorią)")
- **FR-13 [NOWE]** Zaległe i dzisiejsze zadania są zawsze widoczne niezależnie od wybranego trybu. (źródło: decyzje.md, "Zaległe i dzisiejsze zadania są zawsze widoczne niezależnie od trybu")
- **FR-14 [NOWE]** Zadania bez oznaczenia trudności są zawsze pokazywane; tryb ukrywa tylko zadania jawnie oznaczone jako niepasujące do stanu. (źródło: decyzje.md, "zadania bez oznaczenia trudności są POKAZYWANE")
- **FR-15 [NOWE]** Miejsce/kontekst realizuje istniejący filtr kategorii (Dom, Praca, własne); nie powstaje nowe pole miejsca. (źródło: decyzje.md, "istniejący filtr kategorii... Bez nowego pola")

### Zmiany istniejącego zachowania
- **FR-16 [ZMIANA ISTNIEJĄCEGO]** Model `Task` zyskuje pola: flaga "do przejrzenia" i trudność; zadania zapisane wcześniej w `localStorage` (bez tych pól) muszą działać bez migracji ręcznej, jako "nieoznaczone" i bez flagi. (wniosek z decyzji: nowe pola są opcjonalne i domyślnie puste; źródło: decyzje.md, "Domyślnie nieoznaczone"; grill-questions.md, "Wymaga migracji danych")
- **FR-17 [ZMIANA ISTNIEJĄCEGO]** Obecny formularz dodawania zadania pozostaje w pełnym zakresie (tytuł, kategoria, termin); szybki wrzut jest dodatkową ścieżką z samym tytułem. Zadanie dodane pełnym formularzem nie dostaje flagi "do przejrzenia". Zob. Q-01, Q-02.

## Wymagania niefunkcjonalne
- **NFR-01** Szybki wrzut i "Ogarnij zaległe" nie mogą dokładać klikania względem obecnego przepływu: wrzut to wpisanie tytułu i Enter. (źródło: decyzje.md, "nie dokładać klikania")
- **NFR-02** Po gorszym dniu użytkownik wie, od czego zacząć, w ok. 2 minuty. (źródło: decyzje.md, "w 2 minuty wiem, od czego zacząć")
- **NFR-03** Zachowanie deterministyczne i testowalne: bez zgadywania trudności, stanu ani gorszego dnia. (źródło: decyzje.md, "Poza zakresem v1")
- **NFR-04** Dane nadal wyłącznie w `localStorage`, bez backendu; zapis i obsługa błędów zapisu zgodnie z istniejącym mechanizmem. (kontekst: README.md)
- **NFR-05** Istniejące dane (w tym uszkodzone/backup) nie mogą być utracone po dodaniu nowych pól. (wniosek z FR-16)

## Reguły biznesowe i ograniczenia
- **BR-01** Definicja "zaległe" bez zmian: termin przed dzisiejszym dniem (od północy), nieukończone; zadanie bez terminu nigdy nie jest zaległe. (źródło: przyklad-terminy-zadan-decyzje.md, Q-02)
- **BR-02** Ręczna kolejność zawsze wygrywa; funkcje z tych notatek jej nie zmieniają ani nie nadpisują. (źródło: decyzje.md "według ręcznej kolejności"; przyklad-terminy-zadan-decyzje.md, Q-06)
- **BR-03** Aplikacja nie zmienia terminów sama. (źródło: decyzje.md)
- **BR-04** Pilność wynika z terminu; nie ma osobnej flagi "pilne". (źródło: decyzje.md, "pilność wynika z terminu")
- **BR-05** Zaległe i dzisiejsze zadania nie są ukrywane przez tryb energii. (źródło: decyzje.md)
- **BR-06** Nieoznaczone zadania nie znikają w żadnym trybie. (źródło: decyzje.md)
- **BR-07** Brak automatycznego kasowania zadań. (źródło: decyzje.md)

## Poza zakresem
- Zbiorcze przeplanowanie terminów zaległych.
- Automatyczne wykrywanie gorszego dnia; powiadomienia i przypomnienia.
- Osobny Inbox (widok/skrzynka).
- Powiązania między zadaniami (podzadania, zależności).
- Skróty w tytule ("!", "#kategoria") i osobna flaga "pilne".
- Zgadywanie trudności po treści, zgadywanie stanu po porze dnia, GPS.
- Nowe pole miejsca.
- Uwaga: pozycje typu aplikacja mobilna, rozszerzenie, głosowe dodawanie, statystyki, uczenie maszynowe pochodzą tylko z rekomendacji w grill-questions.md, nie z decyzji; traktowane jako niewymagane, ale do potwierdzenia (Q-09).

## Otwarte pytania do interesariuszy
- **Q-01** Szybki wrzut ma tylko tytuł, a `categoryId` jest w modelu wymagane. Jaka kategoria domyślna dla wrzutu: "Inne" (rekomendacja z grill-questions)? Jeśli tak, to co znaczy "flaga znika, gdy zadanie dostanie kategorię" - zmianę kategorii na inną niż domyślna, czy każdy zapis kategorii (także "Inne")? (decyzje: "Kategoria i termin dodawane później")
- **Q-02** Czy szybki wrzut to osobne pole/skrót, czy obecny formularz zyskuje tryb "tylko tytuł"? Czy skrót klawiaturowy z dowolnego miejsca (P2.3, nie rozstrzygnięte w decyzjach) jest w zakresie? Czy zadanie z pełnego formularza ma flagę "do przejrzenia" (założono, że nie)?
- **Q-03** Gdzie dokładnie jest przycisk "OK" (na zadaniu, w widoku filtra "do przejrzenia")? Czy ustawienie samej trudności również zdejmuje flagę (decyzja wymienia tylko kategorię i termin)?
- **Q-04** Co oznacza "mam siłę" dla zadań oznaczonych "lekkie": są ukryte czy widoczne? Decyzja mówi, że tryb ukrywa tylko jawnie niepasujące, więc założenie: "wypruty" ukrywa "ciężkie", "mam siłę" ukrywa "lekkie" - do potwierdzenia, bo ukrywanie lekkich przy sile może być niepożądane.
- **Q-05** Czy przełącznik trybu ma stan neutralny (wyłączony, wszystko widoczne) jako domyślny, i czy jego wybór jest zapamiętywany po odświeżeniu strony?
- **Q-06** Czy podpowiedź "Ogarnij zaległe" respektuje aktywny filtr kategorii / tryb energii, czy zawsze obejmuje wszystkie zadania? Co pokazać, gdy zaległych i dzisiejszych jest 0 (lub mniej niż 3)?
- **Q-07** Czy "Ogarnij zaległe" to osobny panel/okno, czy zmienia widok głównej listy (i jak się go zamyka)? Czy w podpowiedzi zadania są klikalne/odhaczalne?
- **Q-08** Jak łączy się filtr "do przejrzenia" z filtrem kategorii, "Dziś" i trybem energii (AND jak pozostałe?) oraz czy zadania ukończone z flagą są liczone w liczniku?
- **Q-09** Potwierdzenie listy "poza zakresem" w części dotyczącej pozycji z grill-questions, których decyzje nie powtarzają (aplikacja mobilna/rozszerzenie/głos, statystyki, streaki, synchronizacja).
