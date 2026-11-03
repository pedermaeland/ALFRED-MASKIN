# ALFRED MASKIN

Arbeidsloggen er et utkast med fiktive data. Åpne `index.html` direkte i nettleseren, eller bruk Live Server i VS Code.

## Endre en skjerm

Alle åtte skjermene ligger i `index.html`. Søk etter en av ID-ene for å finne riktig blokk.

| ID | Skjerm |
| --- | --- |
| `oversikt` | Oversiktsfliser, pågående runde og dagens plan |
| `plan` | Dagens plan |
| `runde` | Rundedetaljer og kjørerekkefølge |
| `kunder` | Kundeliste |
| `kunde` | Kundeskjema |
| `arbeid` | Arbeidsskjerm og prøvevisning |
| `logg` | Eksempelhistorikk |
| `data` | Sikkerhetskopi og eksport |

En skjerm er en `<section>` med `data-screen`. En lenke med `href="#runde"` åpner skjermen med `id="runde"`. En lenke kan også peke på noe inni skjermen. For eksempel åpner `#jobb-a` planen og hopper til jobbkortet. Alle skjermene deler samme topptekst.

Farger og layout ligger i `style.css`. SVG-maskene for de kontinuerlige hjørnene på store kort og fliser ligger i `continuous-corners.css`.

## Hva gjør JavaScript?

Filene ligger i `js/`. De lastes med `defer` i HTML, slik at nettleseren leser HTML-en før koden prøver å finne knappene og feltene.

- **`navigation.js`** leser delen av adressen etter `#` og bruker den til å finne skjermen. Den skjuler forrige skjerm med `hidden` og viser den nye. Det du har skrevet i feltene blir værende mens du bytter skjerm. `history.pushState` gir nettleserens Tilbake- og Frem-knapper et steg å gå til.
- **`navigation.js`** måler også lenken du trykket på, før den skjules. En kopi av den gamle skjermen ligger bak mens `clip-path` åpner den nye skjermen fra lenkens form. Lenken og fargen tones ut i løpet av 90 ms. Selve åpningen tar 320 ms. Tilbakepilen bruker en horisontal slide på 310 ms. Bevegelsesreduksjon hopper rett til skjermen.
- **`press.js`** legger CSS-klassen `is-pressed` på et element når du tar på det. Når du slipper eller begynner å rulle, fjernes klassen. Farge og skalering styres i `style.css`.
- **`arbeid.js`** leser tjenesten og notatet når du trykker «Se prøvevisning». Den samler verdiene i et objekt som heter `visit` og viser dem ved knappen. `textContent` viser teksten som tekst, selv om notatet inneholder tegn som ligner HTML.

## Hva kan prøves nå?

Navigasjon, felter og prøvevisning kan prøves med testdata. Å bytte skjerm beholder det du har skrevet, mens en oppdatering av nettleseren starter med eksempelverdiene igjen. Lagring, filtrering, eksport, sikkerhetskopi og installerbar offline-bruk er senere steg.
