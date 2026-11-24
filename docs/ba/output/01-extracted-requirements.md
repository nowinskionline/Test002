# Wyodrębnione wymagania – terminy zadań

Źródła: `przyklad-terminy-zadan.md` (notatki, skrót: notatki) oraz `przyklad-terminy-zadan-decyzje.md` (decyzje Artura, skrót: decyzje). Decyzje mają pierwszeństwo przed notatkami.

Stan obecny aplikacji (README, `task.model.ts`): zadanie ma `id`, `title`, `categoryId`, `completed`, `createdAt`. Istnieją: dodawanie/edycja/usuwanie z "Cofnij", kategorie, filtr po kategorii, ukryte ukończone z przełącznikiem, ręczna kolejność drag & drop, motywy, zapis w `localStorage`.

## Cel biznesowy (Why)

Użytkownik chce planować zadania w czasie: nadawać im termin, widzieć, co jest zaległe, i skupić się na tym, co ważne dziś. (źródło: notatki, "chciałbym żeby zadania miały termin"; "może widok 'Dziś' – tylko to co na dziś + zaległe")

## Aktorzy / role użytkowników

- Użytkownik aplikacji – jedyna rola; brak kont i backendu. (źródło: kontekst produktu)

## Wymagania funkcjonalne

- **FR-01 [ZMIANA ISTNIEJĄCEGO]** Zadanie może mieć opcjonalny termin: data + godzina. Godzina jest opcjonalna; sama data jest poprawnym terminem. (źródło: decyzje Q-01, "termin = data + godzina. Godzina jest opcjonalna"; notatki, "termin nie jest obowiązkowy")
- **FR-02 [ZMIANA ISTNIEJĄCEGO]** Termin można ustawić przy dodawaniu zadania i przy jego edycji. (źródło: notatki, "chciałbym żeby zadania miały termin"; wynika z istniejących funkcji dodawania/edycji)
- **FR-03 [ZMIANA ISTNIEJĄCEGO]** Istniejące zadania zapisane bez terminu pozostają bez terminu i działają jak dotąd. (źródło: notatki, "stare zadania mają zostać bez terminu")
- **FR-04 [NOWE]** Zadanie nieukończone jest "po terminie" od północy następnego dnia po dacie terminu (lokalna strefa czasowa przeglądarki). Zadanie z terminem na dziś (z godziną lub bez) nie jest zaległe; godzina nie przyspiesza statusu zaległości. (źródło: decyzje Q-02, "po terminie dopiero po północy… Zadanie z terminem 'dziś' NIE jest zaległe")
- **FR-05 [ZMIANA ISTNIEJĄCEGO]** Zadanie po terminie jest wyróżnione kolorem czerwonym oraz tekstową etykietą "Po terminie". (źródło: notatki, "wyróżniać, np. na czerwono"; decyzje Q-07, "tekstowa etykieta 'Po terminie'")
- **FR-06 [ZMIANA ISTNIEJĄCEGO]** Ukończone zadania nie są wyróżniane jako po terminie. (źródło: decyzje Q-03, "ukończone zadania nie są wyróżniane na czerwono")
- **FR-07 [ZMIANA ISTNIEJĄCEGO]** Termin jest wyświetlany na zadaniu względnie: "dziś", "jutro", dalej np. "pt 28.11"; jeśli jest godzina, jest dopisana ("dziś 14:00"). (źródło: decyzje Q-08, "'dziś', 'jutro', a dalej 'pt 28.11'")
- **FR-08 [ZMIANA ISTNIEJĄCEGO]** Filtr "Dziś" jako dodatkowy filtr obok filtra kategorii (nie osobny widok). Pokazuje zadania z terminem na dziś oraz zaległe i łączy się z filtrem kategorii. (źródło: decyzje Q-05, "dodatkowy filtr obok filtra kategorii… Łączy się z filtrem kategorii"; notatki, "widok 'Dziś'")
- **FR-09 [NOWE]** Ręczna kolejność (drag & drop) jest zawsze nadrzędna; nie ma trwałego trybu sortowania po terminie. (źródło: decyzje Q-06, "ręczna kolejność… jest zawsze ważniejsza. Nie ma trwałego trybu sortowania po terminie")
- **FR-10 [NOWE]** Dopuszczalna jednorazowa akcja "Ułóż po terminie", która przestawia ręczną kolejność (zadania bez terminu na koniec); potem użytkownik dalej przeciąga ręcznie. (źródło: decyzje Q-06, "dopuszczalna jest jednorazowa akcja 'Ułóż po terminie'"; notatki, "fajnie by było sortować po terminie")

## Wymagania niefunkcjonalne

- **NFR-01** Dane (w tym terminy) są zapisywane w `localStorage`, bez backendu; odczyt starych danych bez terminu nie może się psuć. (źródło: kontekst produktu; notatki, "stare zadania mają zostać bez terminu")
- **NFR-02** Dostępność: informacja o zaległości nie może opierać się wyłącznie na kolorze – wymagana etykieta tekstowa. (źródło: decyzje Q-07, "(dostępność)")
- **NFR-03** Wszystkie obliczenia dat ("dziś", "jutro", zaległość) używają lokalnej strefy czasowej przeglądarki. (źródło: decyzje Q-02, "Lokalna strefa czasowa przeglądarki")
- **NFR-04** Wyróżnienie zaległych zadań musi być czytelne w jasnym i ciemnym motywie. (źródło: README, "jasny i ciemny motyw"; wniosek z istniejącej funkcji – do potwierdzenia, zob. Q-05)

## Reguły biznesowe i ograniczenia

- **BR-01** Termin nie jest obowiązkowy. (źródło: notatki, "termin nie jest obowiązkowy")
- **BR-02** Zaległość liczona jest od dnia następnego po dacie terminu (od północy), niezależnie od godziny. (źródło: decyzje Q-02)
- **BR-03** Zadanie z terminem na dziś nie jest zaległe. (źródło: decyzje Q-02)
- **BR-04** Ukończone zadanie nie jest oznaczane jako po terminie. (źródło: decyzje Q-03, przyjęta rekomendacja BA/QA – brak odpowiedzi interesariusza)
- **BR-05** Zadania bez terminu trafiają na koniec przy akcji "Ułóż po terminie". (źródło: decyzje Q-06)
- **BR-06** Filtr "Dziś" łączy się z filtrem kategorii (iloczyn warunków). (źródło: decyzje Q-05)
- **BR-07** Ręczne przeciąganie ma pierwszeństwo przed jakimkolwiek automatycznym porządkiem. (źródło: decyzje Q-06)

## Poza zakresem

- Trwały tryb sortowania po terminie (źródło: decyzje Q-06, "Nie ma trwałego trybu sortowania po terminie").
- Osobny widok/ekran "Dziś" – to filtr, nie widok (źródło: decyzje Q-05, "nie osobny widok").
- Backend, konta użytkowników (źródło: kontekst produktu).

## Otwarte pytania do interesariuszy

- **Q-01** Czy filtr "Dziś" pokazuje ukończone zadania z terminem na dziś, czy tylko nieukończone? Czy podlega przełącznikowi "Pokaż ukończone"? (Notatki i decyzje nie rozstrzygają.)
- **Q-02** Czy można ustawić termin w przeszłości przy dodawaniu/edycji (zadanie od razu zaległe)? Czy można termin usunąć po ustawieniu? (Notatki nie mówią.)
- **Q-03** Czy akcja "Ułóż po terminie" (FR-10) ma wejść do tej zmiany, skoro decyzja mówi tylko, że jest "dopuszczalna"? Jak działa przy aktywnym filtrze (kategoria/"Dziś") i jak porządkuje zadania z tą samą datą, z godziną i bez?
- **Q-04** Czy akcja "Ułóż po terminie" ma być odwracalna (np. "Cofnij" jak przy usuwaniu)? Wymaga potwierdzenia, bo nadpisuje ręczną kolejność.
- **Q-05** Czy etykieta "Po terminie" i czerwony kolor wymagają konkretnych kontrastów/wyglądu w obu motywach? (Notatki podają tylko "np. na czerwono".)
- **Q-06** Format wyświetlania terminu dla dat odleglejszych niż tydzień lub z innego roku (decyzja podaje tylko wzór "pt 28.11") oraz dla dat w przeszłości (np. "wczoraj"?).
- **Q-07** Czy zadanie z datą po terminie, ukończone, nadal pokazuje swój termin (bez wyróżnienia)?
