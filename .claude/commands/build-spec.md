---
description: Uruchamia 3-agentowy pipeline analizy biznesowej (wymagania → User Stories → audyt QA) na notatkach z docs/ba/input/
argument-hint: "[opcjonalnie: ścieżka do pliku z notatkami]"
---

Przygotuj specyfikację wymagań na podstawie materiałów wejściowych.

Plik wejściowy: $ARGUMENTS
(Jeśli powyżej nic nie podano, użyj wszystkich plików z `docs/ba/input/`. Jeśli ten folder jest pusty, zatrzymaj się i poproś mnie o notatki.)

Wykonaj te 3 kroki **po kolei**, każdy przez dedykowanego sub-agenta. Kolejny krok uruchamiaj dopiero, gdy poprzedni zapisze swój plik:

1. **Ekstrakcja:** sub-agent `requirements-extractor`. Przekaż mu, który plik wejściowy ma przeczytać (albo że ma przeczytać cały `docs/ba/input/`). Wynik: `docs/ba/output/01-extracted-requirements.md`.
2. **User Stories:** sub-agent `story-architect`. Wynik: `docs/ba/output/02-user-stories-spec.md`.
3. **Audyt QA:** sub-agent `qa-edgecase-reviewer`. Wynik: `docs/ba/output/03-qa-review-report.md`.

Jeśli któryś krok się nie powiedzie albo plik nie powstanie, zatrzymaj się i powiedz mi, co poszło nie tak. Nie przechodź dalej.

Na koniec przedstaw mi krótkie podsumowanie po polsku:
- ile powstało epików i User Stories,
- najważniejsze otwarte pytania (Q-xx), na które muszę odpowiedzieć,
- 3 najpoważniejsze luki znalezione przez QA.

Zapytaj, czy chcę, żebyś dopisał brakujące edge case'y z raportu QA do `02-user-stories-spec.md`.
