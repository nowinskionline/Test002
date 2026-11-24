# Decyzje do "pomysły: zaległości, szybki wrzut, energia" (grill-me z Arturem, 24.11)

Kontekst: opiera się na terminach zadań (data + opcjonalna godzina, zaległe od północy następnego dnia, filtr "Dziś", ręczna kolejność zawsze wygrywa).

## 1. Ogarnianie zaległości po gorszym dniu
- **Co to jest pomoc (P1.1):** podpowiedź na dziś: krótka lista zadań do zrobienia, reszta zostaje widoczna. Aplikacja nie zmienia danych (terminów) sama.
- **Kiedy (P1.2):** tylko na żądanie, przyciskiem "Ogarnij zaległe". Bez automatycznego wykrywania "gorszego dnia".
- **Co widać (P1.3/P1.4):** 3 zadania (zaległe + na dziś, nieukończone) według ręcznej kolejności użytkownika, pod nimi rozwijane "+X więcej". Bez ukrytego algorytmu.
- **Poza zakresem v1:** zbiorcze przeplanowanie terminów, automatyczne wykrywanie gorszego dnia, powiadomienia.

## 2. Szybki wrzut zadania z głowy
- **Gdzie ląduje (P2.1):** na główną listę z flagą "do przejrzenia" (bez osobnego Inboxa).
- **Pola (P2.2):** tylko tytuł, Enter = gotowe. Kategoria i termin dodawane później.
- **Anty-śmietnik (P2.6/P2.7):** licznik "do przejrzenia: X" z filtrem. Flaga znika sama, gdy zadanie dostanie kategorię lub termin, albo po kliknięciu "OK". Bez automatycznego kasowania.
- **Poza zakresem v1:** powiązania między zadaniami, skróty w tytule ("!", "#kategoria"), osobna flaga "pilne" (pilność wynika z terminu).

## 3. Tryb skupienia pod energię / kontekst
- **Trudność (P3.1/P3.2):** ręczne, opcjonalne oznaczenie przy zadaniu: lekkie / ciężkie. Domyślnie nieoznaczone.
- **Miejsce (P3.3):** istniejący filtr kategorii (Dom, Praca, własne). Bez nowego pola.
- **Tryb (P3.4–P3.6):** ręczny przełącznik "mam siłę / jestem wypruty", działa jak filtr (łączy się z "Dziś" i kategorią). Zaległe i dzisiejsze zadania są zawsze widoczne niezależnie od trybu.
- **Nieoznaczone zadania (P3.7):** w trybie "jestem wypruty" (i "mam siłę") zadania bez oznaczenia trudności są POKAZYWANE. Tryb ukrywa tylko zadania jawnie oznaczone jako niepasujące.
- **Poza zakresem v1:** zgadywanie trudności po treści, zgadywanie stanu po porze dnia, GPS.

## Kryterium sukcesu (P1.7, P3.8) – wspólne dla wszystkich trzech
- Po gorszym dniu w 2 minuty wiem, od czego zacząć. Każda z funkcji ma skracać drogę do decyzji "co teraz robię", a nie dokładać klikania.
