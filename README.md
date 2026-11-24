# Todo Artur

Prosta lista zadań z kategoriami. Projekt do nauki Angulara.

**Stack:** Angular 21 (standalone components, Signals, zoneless) · Tailwind CSS 4 · Angular CDK (drag & drop) · Vitest

## Uruchomienie

```bash
npm install
npm start        # http://localhost:4200
npm test         # testy jednostkowe (Vitest)
npm run build    # wersja produkcyjna w dist/
```

> Jeśli `npm install` kończy się błędem `Cannot read properties of null (reading 'edgesOut')`
> (błąd npm 10), użyj nowszego npm: `npx npm@11 install`.

## Funkcje

- dodawanie, edycja (dwuklik lub ołówek) i usuwanie zadań z opcją „Cofnij”
- własne kategorie z kolorami (domyślnie: Praca, Dom, Inne)
- filtr po kategorii
- ukończone zadania są ukryte na dole, z przełącznikiem „Pokaż ukończone”
- zmiana kolejności przez przeciąganie
- opcjonalny termin zadania (data + opcjonalna godzina) przy dodawaniu i edycji; wyświetlany względnie („dziś”, „jutro 09:30”, „sb 28.11”)
- zaległe zadania (termin przed dzisiejszym dniem, nieukończone) mają czerwony termin i etykietę „Po terminie”; status przelicza się sam o północy
- filtr „Dziś” (zadania na dziś + zaległe), łączony z filtrem kategorii
- jednorazowa akcja „Ułóż po terminie” z opcją „Cofnij” (ręczna kolejność pozostaje nadrzędna)
- szybki wrzut: osobne pole nad formularzem – sam tytuł + Enter; zadanie trafia na górę listy do kategorii „Inne” z etykietą „Do przejrzenia”
- licznik i filtr „Do przejrzenia: X” (tylko nieukończone); flaga znika sama po zmianie kategorii lub nadaniu terminu albo po kliknięciu „OK” przy zadaniu
- opcjonalna trudność zadania („lekkie” / „ciężkie”) przy dodawaniu i edycji
- tryb energii „Bez trybu / Mam siłę / Jestem wypruty”: „Jestem wypruty” ukrywa ciężkie, „Mam siłę” ukrywa lekkie; nieoznaczone, zaległe i dzisiejsze są zawsze widoczne; tryb nie jest zapamiętywany po odświeżeniu
- „Ogarnij zaległe”: na żądanie panel z 3 zadaniami (zaległe + na dziś) w Twojej kolejności, z polem „zrobione” i rozwijanym „+X więcej”; respektuje filtr kategorii i pokazuje, ile czeka w innych; niczego nie przeplanowuje
- komunikat, gdy zmian nie udało się zapisać w `localStorage`
- jasny i ciemny motyw (domyślnie ciemny)
- wszystko zapisywane w `localStorage`; uszkodzone dane są pomijane przy wczytaniu, a oryginał trafia do kopii `todoartur.tasks.backup`

> **Ograniczenie: kilka kart naraz.** Karty nie synchronizują się. Przykład utraty danych: w karcie A
> dodajesz zadanie, potem w otwartej od wczoraj karcie B odhaczasz inne zadanie – karta B zapisuje
> swój (stary) stan i zadanie dodane w A znika. Pracuj w jednej karcie.
> Szczególnie: starsza wersja aplikacji otwarta w innej karcie nie zna flagi „Do przejrzenia”
> ani trudności i przy zapisie je usunie.

## Struktura

```
src/app/
├── models/task.model.ts          # typy Task/Category, domyślne kategorie, kolory
├── services/
│   ├── task.service.ts           # stan aplikacji (signals) + zapis do localStorage
│   ├── task.service.spec.ts      # testy serwisu
│   ├── today.service.ts          # sygnał "dziś" (odświeżany o północy)
│   ├── toast.service.ts          # komunikat z akcją "Cofnij"
│   ├── theme.service.ts          # jasny/ciemny motyw
│   └── storage.ts                # bezpieczny odczyt/zapis localStorage
├── utils/
│   ├── due-date.ts               # terminy: walidacja, dziś/zaległe, format, sortowanie
│   ├── task-filters.ts           # filtry (kategoria, "Dziś", "Do przejrzenia", tryb energii) + komunikat pustej listy
│   └── catch-up.ts               # wybór zadań do panelu "Ogarnij zaległe"
├── components/
│   ├── quick-add/                # szybki wrzut (sam tytuł + Enter)
│   ├── task-form/                # dodawanie zadania
│   ├── catch-up/                 # panel "Ogarnij zaległe"
│   ├── task-list/                # lista aktywnych + ukończonych, drag & drop
│   ├── task-item/                # pojedyncze zadanie (podgląd/edycja)
│   ├── category-manager/         # dodawanie/usuwanie kategorii
│   └── toast/                    # wyświetlanie komunikatu
├── app.ts / app.html             # układ strony, filtr kategorii
└── app.config.ts
```

**Przepływ danych:** komponenty czytają sygnały z `TaskService` i wywołują jego metody.
Serwis zmienia sygnał i od razu zapisuje stan do `localStorage`. Angular sam odświeża widok,
bo szablony czytają sygnały.
