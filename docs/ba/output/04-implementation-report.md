# Raport implementacji – zaległości, szybki wrzut, tryb energii ("Todo Artur")

Wejście: `02-user-stories-spec.md` (US-01..US-12), `03-qa-review-report.md` (B-1..B-4, EC-01..EC-16), `docs/ba/input/pomysly-zaleglosci-inbox-energia-decyzje.md`.
Zasady: blokery B-1..B-4 rozstrzygnięte wg rekomendacji QA. Rekomendacje R-3..R-7 (kwestionujące Q-04..Q-06, osobne pole wrzutu, "OK" bez Cofnij) NIE wdrożone – obowiązują założenia z 02.

## Wynik

| Polecenie | Wynik |
|---|---|
| `npm run build` | OK – bez błędów i ostrzeżeń (initial 336 kB / 83 kB transfer) |
| `npm test` | OK – 6 plików testów, **196 testów zaliczonych** (było 111 w 2 plikach), 0 błędów; wszystkie dotychczasowe testy bez zmian i zielone |

`npm install` nie był uruchamiany (node_modules istniało), `package-lock.json` bez zmian. Nic nie zostało zacommitowane.

## Rozstrzygnięcie blokerów QA

| Bloker | Rozstrzygnięcie |
|---|---|
| B-1 kolejność kluczy / fałszywe kopie | `loadTasks` porównuje semantycznie: `canonicalJson` (klucze posortowane) zamiast `JSON.stringify`; `needsReview: false` traktowane jak brak flagi (EC-01b). Zdrowe dane nigdy nie zapisują kopii, więc prawdziwa kopia po uszkodzeniu nie jest nadpisywana przy kolejnych startach (EC-01). Naprawia to też istniejący błąd: poprzedni `updateTask` zapisywał klucze w innej kolejności niż `normalizeTask`, przez co kopia powstawała przy każdym starcie po edycji. Wybrano wariant "porównanie semantyczne" z rekomendacji (zamiast `buildTask`) – mniej kodu, odporne też na dane już zapisane przez starszą wersję. |
| B-2 puste stany | Czysta funkcja `emptyListMessage` (`utils/task-filters.ts`) z tabelą pierwszeństwa: bez filtrów → "Wszystko zrobione 🎉" / "Brak zadań, Dodaj pierwsze…"; tylko "Dziś" (± kategoria) → dotychczasowy komunikat; tylko "Do przejrzenia" → "Brak zadań do przejrzenia"; każda inna kombinacja → "Brak zadań pasujących do filtrów" + "Aktywne filtry: …". Przy aktywnym filtrze nigdy "Wszystko zrobione". |
| B-3 flaga a termin | Flaga znika, gdy `categoryId` po zapisie ≠ przed zapisem LUB zadanie przed zapisem nie miało `dueDate`, a po zapisie ma. Zmiana terminu na inny, tytułu, trudności lub zapis tej samej kategorii – flaga zostaje. |
| B-4 ukończone z flagą | Filtr "Do przejrzenia" obejmuje tylko nieukończone (zgodnie z licznikiem). Etykieta "Do przejrzenia" i przycisk "OK" tylko przy nieukończonych. Ukończenie nie zmienia flagi (Q-08), więc przywrócenie zadania przywraca je do licznika. |

## Zaimplementowane historie

Wszystkie: US-01 … US-12.

| US | Co zrobiono | Testy (plik → opis) |
|---|---|---|
| US-01 Nowe pola, zgodność wsteczna | `Task.needsReview?: true`, `Task.difficulty?: 'light' \| 'heavy'` (+ typ `Difficulty`, `DIFFICULTY_LABELS`). `normalizeTask` przepuszcza tylko `needsReview === true` i `light`/`heavy`; reszta pomijana. Bez migracji. | `due-date.spec` → "normalizeTask – flaga i trudność" (stare dane, poprawne wartości, 5 złych trudności, 5 złych flag); `task.service.spec` → "US-01 …" (stare dane bez kopii, przetrwanie odświeżenia, złe wartości → kopia, **EC-01** kolejność kluczy, **EC-01** termin + trudność + odświeżenie, **EC-01** kopia nienadpisywana przez 3 starty, **EC-01b** `needsReview:false`) |
| US-02 Szybki wrzut | Komponent `components/quick-add/` nad formularzem: jedno pole, Enter = `TaskService.addQuickTask(title)` → góra listy, flaga, kategoria `inne` → kategoria o nazwie "Inne" (EC-09) → pierwsza istniejąca. Pole czyści się, fokus zostaje. Podpięte do istniejącego `onAdded` (toast "poza bieżącym filtrem"). Bez `maxlength` (ucinałby po cichu) – za długi tytuł zapisywany jako 200 znaków z widocznym komunikatem (EC-07). Pełny formularz bez flagi. | `task.service.spec` → "US-02 …" (wrzut, brak "Inne", **EC-09**, pusty/spacje, formularz bez flagi, **EC-10** duplikaty, **EC-07** błąd zapisu); `quick-add.spec` (Enter + czyszczenie + fokus, same spacje bez komunikatu, **EC-07** 500 znaków → 200 + informacja); `task-filters.spec` → toast dla wrzutu przy filtrze "Praca" |
| US-03 Licznik i filtr | `TaskService.reviewCount` (nieukończone z flagą, wszystkie kategorie). Przycisk "Do przejrzenia: X" (`aria-pressed`) widoczny, gdy X > 0 lub filtr włączony. `TaskFilters.reviewOnly` w `matchesFilters` (AND). Brak auto-kasowania. | `task.service.spec` → "US-03 …" (3 z 4, 0, 30 dni, **EC-04** ukończenie/przywrócenie); `task-filters.spec` → "Do przejrzenia" (tylko nieukończone – B-4, AND z kategorią, wyłączony) |
| US-04 Flaga znika sama | Reguła w `updateTask` (B-3). Edycja w `task-item` wysyła pełny stan (także trudność). Toast "poza bieżącym filtrem" po edycji działa z nowym filtrem (EC-03 sc. 3). | `task.service.spec` → "US-04 …" (kategoria, termin, negatywne: tytuł/trudność/ta sama kategoria, odrzucona edycja, **EC-03** istniejący termin + pełny stan z formularza, **EC-03** zmiana terminu na inny) |
| US-05 Przycisk "OK" | `TaskService.dismissReview(id)` – usuwa tylko klucz flagi, bez zapisu gdy flagi nie ma. Przycisk "OK" poza kontenerem akcji ukrywanym do hovera (widoczny i dostępny z Tab – EC-06), `min-h-11` na mobile. Etykieta tekstowa "Do przejrzenia" (EC-05). | `task.service.spec` → "US-05 …" (flaga znika, kolejność/kategoria/termin bez zmian, licznik; brak zapisu bez flagi). Pusty widok filtra po OK → `task-filters.spec` "tylko Do przejrzenia" |
| US-06 Trudność | Lista "Trudność: brak / lekkie / ciężkie" w `task-form` (wraca do "brak" po dodaniu – EC-16) i w edycji `task-item`. Etykieta "lekkie"/"ciężkie" na zadaniu. `addTask(title, cat, due, { difficulty })`, `TaskChanges.difficulty?: Difficulty \| null`, błąd `invalid-difficulty` + komunikat. | `task.service.spec` → "US-06 …" (dodanie "ciężkie", domyślnie brak klucza, "brak" w edycji bez `null` w storage, **EC-16** edycja tytułu zostawia trudność, wartość spoza zakresu odrzucona w `updateTask` i `addTask`) |
| US-07 Przełącznik trybu | Trójstanowa grupa przycisków "Bez trybu / Mam siłę / Jestem wypruty" (`role="group"`, `aria-pressed`), sygnał w `app.ts` (niezapamiętywany). `TaskFilters.energy`, `matchesEnergy`. Tryb symetryczny wg Q-04. Komunikat pustej listy wg B-2. | `task-filters.spec` → tryb (wypruty, mam siłę, bez trybu / brak pola, AND z "Dziś" i "Do przejrzenia", toast dla ciężkiego w trybie wypruty); `emptyListMessage` (**EC-02** tryb ukrywa wszystko przy ukończonych) |
| US-08 Zaległe i dzisiejsze zawsze widoczne | `matchesEnergy` używa `isInTodayFilter` (bez nowej definicji). "Dziś" z `TodayService`, więc północ przelicza listę. | `task-filters.spec` → zaległe ciężkie, dzisiejsze lekkie, przyszły termin nie chroni, ukończone z przeszłości nie chronione, północ |
| US-09 Miejsce = kategoria | Brak nowego pola; tryb AND kategoria. | `task-filters.spec` → "tryb + kategoria" |
| US-10 Przycisk i panel | Przycisk "Ogarnij zaległe" w drugim rzędzie paska filtrów (zawsze widoczny, `aria-expanded`); panel `components/catch-up/` nad listą, lista pod nim widoczna. Panel to tylko `computed` – niczego nie zapisuje. Pusty: "Brak zaległych i dzisiejszych zadań [w kategorii „X”]"; nie zamyka się sam. | `catch-up.spec` (util) → czysta funkcja nie zmienia danych; `components/catch-up/catch-up.spec` → otwarcie bez zapisu do `localStorage`, ostatnie "zrobione" → komunikat |
| US-11 3 zadania wg ręcznej kolejności | `utils/catch-up.ts` → `pickCatchUp(tasks, categoryId, now)` = `{ top, rest, elsewhere }`; kandydaci: nieukończone z terminem dziś/zaległe; tylko filtr kategorii (Q-06). Checkbox "zrobione" (`toggleTask`), cel dotykowy ≥ 44 px. Dodatkowo (EC-11/N-4): przy filtrze kategorii linia "W innych kategoriach: N" z przyciskiem "Pokaż wszystkie kategorie". | `utils/catch-up.spec` → A,B,C z 5, "zrobione" → B,C,D, kategoria a nie tryb (F tak, G nie), flaga ignorowana, negatywne (bez terminu/jutro/ukończone), mniej niż 3, **EC-11**, **EC-12** północ i dzień zmiany czasu; komponent → "zrobione" i wejście następnego, **EC-11** komunikat |
| US-12 "+X więcej" | Przycisk "+X więcej" / "Zwiń" (`aria-expanded`); reszta w tej samej kolejności, przewijana wewnątrz panelu (`max-h-72`, EC-14). Rozwinięcie resetuje się po zamknięciu (komponent tworzony przy otwarciu). | `utils/catch-up.spec` → 7 = 3 + 4, dokładnie 3, **EC-14** 303 → +300; komponent → "+4 więcej" i rozwinięcie |

## Zmienione pliki

Zmienione:
- `src/app/models/task.model.ts` – pola `needsReview`, `difficulty`, typ `Difficulty`, etykiety.
- `src/app/utils/due-date.ts` – `normalizeTask` (nowe pola), `isDifficulty`.
- `src/app/utils/task-filters.ts` – `EnergyMode`, `reviewOnly`, `energy`, `matchesEnergy`, `hasActiveFilters`, `emptyListMessage`.
- `src/app/services/task.service.ts` – `reviewCount`, `addQuickTask`, `dismissReview`, opcje `addTask`, trudność i reguła flagi w `updateTask`, `invalid-difficulty`, porównanie semantyczne w `loadTasks` (`canonicalJson`).
- `src/app/app.ts`, `src/app/app.html` – szybki wrzut, drugi rząd filtrów ("Ogarnij zaległe", "Do przejrzenia: X", tryb energii), panel, jeden obiekt `filters` dla listy i toasta.
- `src/app/components/task-list/task-list.ts/.html` – wejście `filters` (zamiast `categoryFilter` + `todayOnly`), komunikat pustej listy, podpięcie "OK".
- `src/app/components/task-item/task-item.ts/.html` – trudność w edycji, etykiety "lekkie/ciężkie" i "Do przejrzenia", przycisk "OK".
- `src/app/components/task-form/task-form.ts/.html` – pole trudności.
- `src/app/services/task.service.spec.ts`, `src/app/utils/due-date.spec.ts` – tylko dopisane testy.
- `README.md` – sekcje "Funkcje", ograniczenie wielu kart, "Struktura".

Nowe:
- `src/app/components/quick-add/quick-add.ts/.html/.spec.ts`
- `src/app/components/catch-up/catch-up.ts/.html/.spec.ts`
- `src/app/utils/catch-up.ts`, `src/app/utils/catch-up.spec.ts`
- `src/app/utils/task-filters.spec.ts`

## Pominięte, założone i dlaczego

- **R-3..R-7 nie wdrożone** (zgodnie z poleceniem): tryb symetryczny (Q-04), tryb niezapamiętywany i bez licznika ukrytych (Q-05), panel respektuje kategorię (Q-06), osobne pole wrzutu (Q-02), "OK" bez toasta/Cofnij (US-05).
- **EC-11 / N-4** – wdrożone w formie informacyjnej (liczba w innych kategoriach + przycisk "Pokaż wszystkie kategorie", który tylko zdejmuje filtr kategorii). Nie zmienia zachowania Q-06; dodaje klik wyłącznie wtedy, gdy panel coś pomija.
- **Kopia zapasowa (B-1, część "dodatkowo")** – zastosowano porównanie semantyczne, dzięki któremu kopia powstaje tylko przy rzeczywistej utracie danych; nie wprowadzono reguły "nigdy nie nadpisuj istniejącej kopii". Powód: poprzednie wersje tworzyły fałszywe kopie przy każdym starcie po edycji, więc wielu użytkowników ma już w `todoartur.tasks.backup` zdrowe dane; blokada nadpisywania sprawiłaby, że przyszłe prawdziwe uszkodzenie nie zostałoby zachowane. AC EC-01 ("zdrowe uruchomienia nie zmieniają kopii") jest spełnione i przetestowane.
- **EC-07** – zamiast cichego ucięcia przez `maxlength` tytuł wrzutu jest skracany do 200 znaków z widocznym komunikatem (`role="status"`). Reszta tekstu nie jest zachowywana.
- **EC-13** (toast "Cofnij" po "zrobione" w panelu) – oznaczony w QA "do ustalenia"; niewdrożony. Odznaczenie możliwe przez "Pokaż ukończone".
- **EC-06 / EC-14 (360 px, 44 px)** – cele dotykowe "OK", checkboxa panelu i "+X więcej" mają `min-h-11` na mobile; wygląd w 360 px i w obu motywach nie był sprawdzany w przeglądarce (brak testów wizualnych w projekcie) – do odbioru ręcznego.
- **Etykieta "Do przejrzenia" i "OK"** nie są pokazywane przy ukończonych zadaniach (B-4); flaga pozostaje w danych.
- **N-5** – test "otwarcie panelu bez zapisu" sprawdza brak zapisu wywołanego przez panel (dane wejściowe zdrowe, więc start nie tworzy kopii).

## Otwarte ryzyka

1. **Wiele kart (EC-15)** – poza zakresem: brak nasłuchu zdarzenia `storage`. Wrzut w jednej karcie może zniknąć po zapisie z drugiej; dodatkowo starsza wersja aplikacji w innej karcie usunie `needsReview` i `difficulty` (EC-01b sc. 2). Opisane w README.
2. **Kolejka toastów (EC-08)** – poza zakresem: `ToastService` pokazuje jeden toast; wrzut poza filtrem (np. przy włączonym "Dziś" każdy wrzut) wypiera toast "Usunięto … Cofnij". Przy serii wrzutów widać jeden toast z ostatnim zadaniem.
3. **Gęstość paska filtrów na wąskim ekranie (R-8)** – drugi rząd ("Ogarnij zaległe", "Do przejrzenia: X", 3 przyciski trybu) zawija się; do sprawdzenia wizualnie w 360 px i w obu motywach.
4. **Założenia Q-01..Q-09 wymagają potwierdzenia przy odbiorze** – zwłaszcza Q-04 (czy "Mam siłę" ma ukrywać lekkie) i Q-06 (czy panel ma respektować kategorię); zmiana którejkolwiek reguły dotyka `matchesEnergy` / `pickCatchUp` i ich testów (jedno miejsce w kodzie każda).
5. **Brak "Cofnij" dla "OK" i "zrobione" w panelu** – pomyłkowe kliknięcie "OK" nie da się odwrócić z UI (nie ma ręcznego "oznacz do przejrzenia").
