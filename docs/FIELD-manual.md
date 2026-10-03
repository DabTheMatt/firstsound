# FIELD — podręcznik

FIELD to przeglądarkowy instrument granularny. Ten podręcznik opisuje zachowanie interfejsu Focus, modulacji LFO i motywów.

## EQ Focus

W trybie Focus, pod przełącznikiem WAVE / EQ / FFT / AUTO, lewa kolumna pokazuje listę wszystkich aktywnych filtrów bieżącego EQ.

Każdy wiersz zawiera kolor filtra, numer (EQ 1, EQ 2, …), częstotliwość środka oraz typ filtra. Częstotliwość na liście jest wartością bazową, żeby lista nie mrugała podczas modulacji.

Kliknięcie wiersza wybiera ten sam `selectedBandId`, który wybiera kliknięcie węzła na wykresie. Pokrętła wybranego filtra pojawiają się w zarezerwowanym polu na środku. Przycisk `+` dodaje dzwonek (Bell) i od razu go zaznacza.

Pole pokręteł ma stałą wysokość. Zmiana typu filtra (Bell, Low Cut, Shelf) ani brak zaznaczenia nie przesuwa wykresu w pionie.

Na wąskim ekranie lista chowa się pod przyciskiem Filtry. Selektor pokazuje ten sam filtr, a stan zaznaczenia jest wspólny z wersją desktopową.

## Pokrętła Focus

Pokrętła Focus są większe i cichsze wizualnie: cienki tor, łuk w kolorze wybranego filtra, kreska wskazująca aktualną wartość. Kółko myszy zmienia wartość dopiero po wejściu w edycję pokrętła.

## Odczyt wskaźnika

Ruch wskaźnika nad wykresem EQ pokazuje nutę i częstotliwość z tej samej osi, co wykres, w stroju równomiernym A4 = 440 Hz. Przykład: `A4 · 440 Hz`, `C4 · 261.6 Hz`. Etykieta nie łapie kliknięć. Przy dotyku i przeciąganiu zostaje widoczna do końca gestu.

## Siatka częstotliwości

W ustawieniach wykresu (`•••`) gęstość pionowych prowadnic to 6, 12 albo 24. Prowadnice są rozmieszczone logarytmicznie. Gęstsza siatka ma mniej etykiet. Ustawienie jest tylko prezentacją i nie zmienia EQ, analizatora, automatyki ani LFO. Domyślnie jest 12.

## LFO

Przypisanie LFO dotyczy stabilnego identyfikatora parametru i, dla efektów, konkretnej instancji. Delay B Feedback nie steruje Delay A. Pasmo EQ jest dodatkowo związane z identyfikatorem pasma, nie z samą pozycją na liście.

Kolejność wartości: baza, potem automatyka (gdy transport gra), potem Random, potem LFO wokół tego środka, potem ograniczenie do zakresu parametru. Jedna funkcja rozwiązuje wartość końcową dla DSP, pokrętła, odczytu i węzła EQ.

Pokrętło i liczba pokazują bieżącą wartość skuteczną. Cienki łuk pokazuje realny zakres wynikający ze środka, głębokości i granic parametru. Mały znak fali oznacza, że LFO jest podłączone. Znacznik orbitujący wokół pokrętła nie jest używany.

Częstotliwość EQ porusza węzeł w poziomie, wzmocnienie w pionie. Q zmienia szerokość odpowiedzi i nie przesuwa węzła.

Speed moduluje rzeczywiste tempo odtwarzania w dozwolonym zakresie (powyżej zera, bez wartości ujemnych). Źródło nie jest tworzone od nowa w każdej klatce.

Rate, Depth i Shape zostają zapisane, gdy LFO jest nieaktywne. Parametr wraca do środka. Usunięcie trasy to osobna czynność.

Pauza zatrzymuje fazę LFO, DSP i wizualizację na tej samej wartości. Wznowienie kontynuuje od tej fazy. Stop używa dotychczasowej semantyki transportu.

## Motywy

Selektor grupuje motywy: Monochromatyczne, Kolor, Jasne, Przyjazne oczom. W grupie przyjaznej oczom są Soft Slate, Warm Paper i Dusk. Tekst zwykły celuje w kontrast co najmniej 4.5:1, a istotne krawędzie w co najmniej 3:1.

## Delay

Między przełącznikiem MONO / STEREO a panelami LEFT / RIGHT jest stały odstęp. Obie kolumny zaczynają się na tej samej wysokości.
