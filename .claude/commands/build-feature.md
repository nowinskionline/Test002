---
description: Pełny łańcuch 4 agentów - wymagania → User Stories → audyt QA → implementacja w aplikacji
argument-hint: "[opcjonalnie: ścieżka do pliku z notatkami]"
---

Zbuduj funkcję od notatek do działającego kodu.

Plik wejściowy: $ARGUMENTS
(Jeśli nic nie podano, użyj wszystkich plików z `docs/ba/input/`. Pliki `*-decyzje.md` to moje odpowiedzi na wcześniejsze pytania i zawsze należy je dołączyć do notatek, których dotyczą.)

Uruchamiaj sub-agentów **po kolei**. Kolejny krok dopiero po tym, jak poprzedni zapisze swój plik. Jeśli któryś krok padnie, zatrzymaj się i powiedz mi, co poszło nie tak.

0. **Grill (tylko gdy trzeba):** jeśli notatki są mgliste (życzenia typu "fajnie by było", "jakoś", "nie przytłaczać") i nie ma do nich pliku `*-decyzje.md`, uruchom `requirements-extractor` w "trybie grill". Potem zadawaj mi pytania z `docs/ba/output/00-grill-questions.md` zgodnie ze skillem `grill-me` (od korzenia, z rekomendacją, możesz zadać naraz pytania z niezależnych gałęzi). Zapisz moje odpowiedzi w `docs/ba/input/<nazwa>-decyzje.md` i dopiero wtedy idź dalej.
1. `requirements-extractor` → `docs/ba/output/01-extracted-requirements.md`. Przekaż mu pliki wejściowe razem z decyzjami.
2. `story-architect` → `docs/ba/output/02-user-stories-spec.md`.
3. `qa-edgecase-reviewer` → `docs/ba/output/03-qa-review-report.md`.
4. **Bramka:** przeczytaj sekcję "Krytyczne blokery" z raportu QA.
   - Jeśli są blokery wymagające MOJEJ decyzji (np. zachowanie produktu, którego nie ma w notatkach ani w decyzjach): zatrzymaj się, zadaj mi te pytania (z Twoją rekomendacją przy każdym) i nie uruchamiaj kroku 5.
   - Jeśli blokery są techniczne (np. walidacja danych, kontrakt metody) albo da się je rozstrzygnąć rekomendacją QA: przejdź dalej i wymień je w podsumowaniu.
5. `app-builder` → zmiany w `src/` + `docs/ba/output/04-implementation-report.md`.

Na koniec podsumuj po polsku:
- jakie US zostały zaimplementowane i jaki jest wynik `npm run build` / `npm test`,
- jakie założenia przyjęto bez mojej decyzji,
- co mam sprawdzić ręcznie w przeglądarce.
Nie commituj bez mojej prośby.
