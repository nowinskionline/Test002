---
name: grill-me
description: Przesłuchuje użytkownika o wymaganie, pomysł albo plan, pytanie po pytaniu, aż wszystkie decyzje są rozstrzygnięte. Używaj, gdy wymaganie jest mgliste ("fajnie by było", "jakoś", "nie przytłaczać"), przed pisaniem specyfikacji albo gdy użytkownik mówi "grill me", "przemagluj mnie", "dopytaj mnie".
---

# Grill me

Twoim celem jest dojść z użytkownikiem do wspólnego, konkretnego rozumienia wymagania, zanim ktokolwiek zacznie pisać specyfikację albo kod.

## Jak pytasz
1. **Zbuduj drzewo decyzji.** Rozbij wymaganie na decyzje, od których zależą kolejne (np. najpierw "co to jest zawalony dzień", potem "co aplikacja wtedy robi", na końcu "jak to wygląda"). Zaczynaj od korzenia, nie od szczegółów UI.
2. **Jedno pytanie naraz.** Przejdź do kolejnej gałęzi dopiero, gdy bieżąca jest rozstrzygnięta. Jeśli odpowiedź otwiera nowe pytania, dopisz je do drzewa.
3. **Zawsze dawaj rekomendację.** Każde pytanie ma 2–4 konkretne warianty oraz Twoją rekomendowaną odpowiedź z jednym zdaniem uzasadnienia. Użytkownik ma móc odpowiedzieć jednym słowem.
4. **Nie pytaj o to, co możesz sprawdzić.** Jeśli odpowiedź jest w kodzie, w README albo w istniejących decyzjach (`docs/ba/input/*-decyzje.md`), sprawdź sam i tylko potwierdź wniosek.
5. **Bądź dociekliwy.** Wyłapuj słowa-wytrychy ("inteligentnie", "nie przytłaczać", "śmietnik", "sama podpowiada") i dopytuj, co konkretnie oznaczają i jak poznać, że działa. Szukaj sprzeczności między odpowiedziami i nazywaj je wprost.
6. **Pilnuj zakresu.** Przy każdym wymaganiu ustal też, czego NIE robimy w pierwszej wersji.

## Kiedy kończysz
Gdy każda gałąź drzewa ma odpowiedź, zapisz decyzje w `docs/ba/input/<nazwa>-decyzje.md` (decyzja, krótkie uzasadnienie, co poza zakresem) i pokaż użytkownikowi krótkie podsumowanie do potwierdzenia.

## Gdy nie możesz rozmawiać z użytkownikiem
Jeśli działasz jako sub-agent (bez możliwości zadawania pytań), nie zgaduj odpowiedzi. Zapisz drzewo pytań w `docs/ba/output/00-grill-questions.md`:
- pogrupowane per wymaganie, w kolejności zadawania (korzeń → liście),
- przy każdym pytaniu: warianty odpowiedzi, Twoja rekomendacja z uzasadnieniem i od jakiego pytania zależy,
- na górze każdego wymagania: lista słów-wytrychów, które wymagają doprecyzowania.
Główna sesja zada te pytania użytkownikowi.
