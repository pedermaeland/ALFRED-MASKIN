# ALFRED MASKIN: HTML/CSS-utkast

Dette er nå kun et designutkast. Ingen JavaScript eller pakker er i bruk.

## Åpne og rediger

Åpne `index.html` direkte i nettleseren, eller bruk Live Server i VS Code.
Endre HTML/CSS, lagre og oppdater nettleseren.

- `index.html`: rundekort og eksempel på en tidligere kjøring.
- `kunder.html`: tre fiktive kundekort.
- `kunde.html`: kundeskjema og synlige adressefelt.
- `runde.html`: runde og tre stopp. Flytt hele `li`-blokker for å endre rekkefølgen.
- `arbeid.html`: eksempel på arbeidsregistrering.
- `historikk.html`: et fast historikkort.
- `data.html`: plassholdere for sikkerhetskopi og eksport.
- `style.css`: farger, størrelser og layout for alle sidene.

Kort og felter ligger direkte i HTML-filene. Kommentarene viser hvilke blokker du kan kopiere.
Header og meny er gjentatt i hver fil; endre dem i alle sidene ved behov.

## Glidende navigasjon

Den aktive pillen glir mellom menypunktene med CSS. Bruk Live Server for å se animasjonen
mellom sidene. Direkte åpning av HTML-filene viser fortsatt menyen, men uten denne animasjonen.

I `style.css` finner du `--nav-slide-duration: 380ms` øverst. Lavere tall gir raskere glidning.
Selve animasjonsreglene er merket «Sliding navbar». Det er fortsatt ingen JavaScript i prosjektet.
Nettlesere uten støtte bytter side normalt. Redusert bevegelse i enhetsinnstillingene slår av animasjonen.

## Hva virker?

Menylenker og forhåndsvisningslenker fungerer. Du kan prøve vanlige inndatafelt.
Alle knapper som ville lagret, arkivert, filtrert eller eksportert er deaktivert.
Eksempelhistorikken oppdateres ikke når du skriver i feltene.

## Hva kommer senere?

Kundelagring, runder, arbeidsregistrering, søk, filtrering, arkivering, sikkerhetskopi og offline-installasjon.
Ingen av disse funksjonene er aktive nå. HTML-filer som åpnes lokalt trenger ikke nettverk,
men dette er ikke en testet, installerbar offline-app for Alfreds telefon.

## Tidligere kode

JavaScript-versjonen er bevart i snapshots fra før overgangen til HTML/CSS, sammen med den tidligere HTML-en.
Tidligere nettleserlagring er ikke slettet, men blir verken lest eller endret av dette utkastet.
Kodesnapshots inneholder ikke nettleserens lagrede arbeidsdata.
