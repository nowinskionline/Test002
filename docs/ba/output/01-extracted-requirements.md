# Wyodrębnione wymagania – terminy zadań

Źródło: `docs/ba/input/przyklad-terminy-zadan.md` (rozmowa z Kasią, 24.11).
Stan istniejącej aplikacji ("Todo Artur"): zadanie ma pola `id`, `title`, `categoryId`, `completed`, `createdAt`; dane w `localStorage`; ręczna zmiana kolejności przez przeciąganie; filtr po kategorii; ukończone ukryte z przełącznikiem "Pokaż ukończone"; brak backendu i kont użytkowników.

## Cel biznesowy (Why)

Użytkownik chce lepiej kontrolować czas wykonania zadań: wiedzieć, które mają termin, które go przekroczyły i co jest do zrobienia dziś. Obecnie zadania nie mają żadnej informacji o czasie, a kolejność jest wyłącznie ręczna. (źródło: przyklad-terminy-zadan.md, "chciałbym żeby zadania miały termin")

## Aktorzy / role użytkowników

- **Użytkownik aplikacji** – jedyna rola (brak kont i backendu); dodaje zadania, ustawia terminy, przegląda listę.
- **Kasia** – osoba, z którą odbyła się rozmowa (źródło informacji; z notatek nie wynika, czy jest użytkownikiem aplikacji).

## Wymagania funkcjonalne

- **FR-01 [ZMIANA ISTNIEJĄCEGO]** Zadanie może mieć termin wykonania (data; ewentualnie także godzina – patrz Q-01). Wymaga rozszerzenia modelu zadania. (źródło: przyklad-terminy-zadan.md, "chciałbym żeby zadania miały termin (data, może godzina?)")
- **FR-02 [ZMIANA ISTNIEJĄCEGO]** Termin można ustawić przy dodawaniu zadania oraz zmienić/usunąć przy edycji. (wniosek z FR-01 i istniejących funkcji dodawania/edycji; źródło: "zadania miały termin")
- **FR-03 [NOWE]** Zadania po terminie są wizualnie wyróżnione, np. kolorem czerwonym. (źródło: "zadania po terminie powinny się jakoś wyróżniać, np. na czerwono")
- **FR-04 [NOWE]** Możliwość sortowania listy po terminie, jako uzupełnienie ręcznego przeciągania. (źródło: "fajnie by było sortować po terminie zamiast tylko ręcznie przeciągać")
- **FR-05 [NOWE]** Widok "Dziś" pokazujący tylko zadania z terminem na dziś oraz zaległe. (źródło: "może widok "Dziś" – tylko to co na dziś + zaległe") – wymaganie warunkowe ("może"), do potwierdzenia, patrz Q-05.
- **FR-06 [ZMIANA ISTNIEJĄCEGO]** Istniejące zadania zapisane w `localStorage` bez terminu pozostają poprawne i działają bez terminu po wdrożeniu zmiany. (źródło: "stare zadania mają zostać bez terminu")

## Wymagania niefunkcjonalne

- **NFR-01** Zmiana musi zachować zgodność wsteczną z danymi już zapisanymi w `localStorage` (brak utraty istniejących zadań). (źródło: "stare zadania mają zostać bez terminu"; ograniczenie wynikające z architektury)
- **NFR-02** Rozwiązanie działa bez serwera, w ramach obecnej architektury (dane tylko w `localStorage`). (źródło: "nie wiem czy to da radę bez serwera"; README)

## Reguły biznesowe i ograniczenia

- **BR-01** Termin jest opcjonalny – zadanie bez terminu jest w pełni poprawne. (źródło: "termin nie jest obowiązkowy")
- **BR-02** Istniejące zadania nie otrzymują terminu automatycznie. (źródło: "stare zadania mają zostać bez terminu")
- **BR-03** Zadanie jest "po terminie", gdy jego termin minął (dokładna definicja – patrz Q-02, Q-03).
- **BR-04** Widok "Dziś" obejmuje zadania na dziś oraz zaległe (z terminem przed dniem dzisiejszym). (źródło: "tylko to co na dziś + zaległe")
- **BR-05** Ograniczenie techniczne: aplikacja nie ma backendu ani kont, więc nie ma serwera do wysyłania powiadomień. (źródło: README; "bez serwera")

## Poza zakresem

- Przypomnienia / powiadomienia na telefonie ("żeby telefon pykał") – nie ustalono, że wchodzą do zakresu; wątpliwość czy wykonalne bez serwera (patrz Q-04). Do czasu decyzji traktowane jako poza zakresem.
- Nadawanie terminów istniejącym zadaniom w sposób automatyczny.
- Backend, konta użytkowników, synchronizacja między urządzeniami (nie wspomniano w notatkach).

## Otwarte pytania do interesariuszy

- **Q-01** Czy termin ma zawierać samą datę, czy datę i godzinę? Notatki: "data, może godzinę?". Od tego zależy też moment uznania zadania za zaległe.
- **Q-02** Kiedy zadanie jest "po terminie" – po upływie dnia (północ), czy po konkretnej godzinie (jeśli godzina jest wspierana)? Czy zadanie z terminem "dziś" bez godziny jest już zaległe?
- **Q-03** Czy ukończone zadania z minionym terminem mają być wyróżniane na czerwono? (Zakładamy, że nie – do potwierdzenia.)
- **Q-04** Czy przypomnienia (powiadomienia na telefonie) mają wejść do zakresu? Bez serwera i bez konta byłyby ograniczone (np. tylko gdy aplikacja/przeglądarka jest otwarta lub przez Notification API/PWA). Czy akceptowalne jest ograniczone rozwiązanie, czy odkładamy temat?
- **Q-05** Czy widok "Dziś" jest wymagany, czy to tylko pomysł ("może")? Czy ma być osobnym widokiem/zakładką, czy filtrem obok filtra kategorii, i czy współdziała z filtrem kategorii oraz "Pokaż ukończone"?
- **Q-06** Jak sortować po terminie zadania bez terminu (na koniec listy?) i w jaki sposób sortowanie współgra z ręczną kolejnością (przełącznik trybu sortowania, jednorazowe sortowanie, czy trwała zmiana kolejności)? Czy przeciąganie ma być wyłączone w trybie sortowania po terminie?
- **Q-07** Czy oprócz czerwonego koloru potrzebne są inne wyróżnienia (np. dla zadań na dziś, ikona/etykieta tekstowa – dostępność dla osób niedowidzących kolory)?
- **Q-08** Jak ma być wyświetlany termin przy zadaniu (format daty, wskazanie względne typu "jutro")?
