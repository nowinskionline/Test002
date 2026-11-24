# Pipeline analizy biznesowej (agenci Claude Code)

Trzech sub-agentów (`.claude/agents/`) uruchamianych komendą `/build-spec`:

| Krok | Agent | Wynik |
|---|---|---|
| 1 | `requirements-extractor` | `output/01-extracted-requirements.md` |
| 2 | `story-architect` | `output/02-user-stories-spec.md` |
| 3 | `qa-edgecase-reviewer` | `output/03-qa-review-report.md` |

## Pełny łańcuch z implementacją: `/build-feature`

`/build-feature docs/ba/input/plik.md` przechodzi przez kroki:
0. grill: gdy notatki są mgliste, agent przygotowuje drzewo pytań, a główna sesja Cię magluje (skill `grill-me`). Odpowiedzi trafiają do `input/<nazwa>-decyzje.md`.
1–3. wymagania → User Stories → audyt QA (jak w `/build-spec`).
4. bramka: jeśli QA znajdzie blokery wymagające Twojej decyzji, łańcuch staje i pyta.
5. `app-builder` (opus) implementuje w `src/`, dopisuje testy, odpala build i testy, a raport zapisuje w `output/04-implementation-report.md`.

Skill `grill-me` możesz też wywołać sam (`/grill-me`), żeby przemaglować dowolny pomysł.

## Użycie `/build-spec` (sama specyfikacja)

1. Wrzuć notatki, transkrypcję albo maila do `docs/ba/input/` (np. `nowa-funkcja.md`).
2. W katalogu projektu uruchom `claude` i wpisz:
   - `/build-spec` – przetwarza wszystkie pliki z `input/`
   - `/build-spec docs/ba/input/nowa-funkcja.md` – tylko jeden plik
3. Wyniki trafią do `docs/ba/output/`. Każde uruchomienie nadpisuje poprzednie pliki,
   więc jeśli chcesz zachować starą specyfikację, skopiuj ją albo zrób commit.

W `input/` jest przykładowa notatka `przyklad-terminy-zadan.md` do pierwszego testu.
Gdy dodasz własne notatki, usuń ją albo wskaż konkretny plik w argumencie komendy.
