# Todo Artur

Prosta lista zadań z kategoriami. Projekt do nauki Angulara.

**Stack:** Angular 21 (standalone components, Signals, zoneless) · Tailwind CSS 4 · Angular CDK (drag & drop) · Vitest

## Uruchomienie

```bash
npm install
npm start        # http://localhost:4200
npm test         # jeden przykładowy test serwisu
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
- jasny i ciemny motyw (domyślnie ciemny)
- wszystko zapisywane w `localStorage`

## Struktura

```
src/app/
├── models/task.model.ts          # typy Task/Category, domyślne kategorie, kolory
├── services/
│   ├── task.service.ts           # stan aplikacji (signals) + zapis do localStorage
│   ├── task.service.spec.ts      # test
│   ├── toast.service.ts          # komunikat z akcją "Cofnij"
│   ├── theme.service.ts          # jasny/ciemny motyw
│   └── storage.ts                # bezpieczny odczyt/zapis localStorage
├── components/
│   ├── task-form/                # dodawanie zadania
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
