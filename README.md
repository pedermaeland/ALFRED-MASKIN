# ALFRED MASKIN: HTML/CSS-utkast

Dette er nå kun et designutkast. Ingen JavaScript eller pakker er i bruk.

## Åpne og rediger

Åpne `index.html` direkte i nettleseren, eller bruk Live Server i VS Code.
Endre HTML/CSS, lagre og oppdater nettleseren.

- `index.html`: oversiktsfliser, en pågående kjøring og grupperte lister.
- `plan.html`: en fiktiv planlagt jobb med adresse og instruksjoner.
- `kunder.html`: tre fiktive kundekort.
- `kunde.html`: kundeskjema og synlige adressefelt.
- `runde.html`: runde og tre stopp. Flytt hele `li`-blokker for å endre rekkefølgen.
- `arbeid.html`: eksempel på arbeidsregistrering.
- `historikk.html`: et fast historikkort.
- `data.html`: plassholdere for sikkerhetskopi og eksport.
- `style.css`: farger, størrelser og layout for alle sidene.
- `continuous-corners.css`: G2-hjørner på kort, knapper og felt.

Kort og felter ligger direkte i HTML-filene. Kommentarene viser hvilke blokker du kan kopiere.
Headeren er gjentatt i hver fil; endre den i alle sidene ved behov.

## Utseende og første side

Startskjermen bruker Påminnelser som visuell referanse: mørk bakgrunn,
fargede oversiktsfliser og rader samlet i ett kort. De andre sidene deler
de samme mørke fargene og feltene.
Paletten bruker koksgrå flater, dempet stålblått, rustrødt og oliven.

Fargene endres i variablene øverst i `style.css`. Stilene for startskjermen
er samlet under kommentaren «Påminnelser-inspirert startside».
Rediger tekst, lenker og tall direkte i `index.html`. Tallene teller ikke
automatisk, og 30. oktober er en fast eksempeldato i både oversikten og planen.
En rad i en gruppe er én vanlig lenke. Kopier en hel `li`-blokk for flere rader.

Vi designer fortsatt med separate HTML-sider. Senere kan skjermene kobles
sammen med JavaScript til én side, samtidig som HTML og CSS beholdes.

## Kontinuerlige hjørner

Alle sidene laster `continuous-corners.css` etter `style.css`. Den bruker
`assets/continuous-corners.svg` som en ni-delt maske. Hjørnene beholder formen
når kortet blir bredere eller høyere; hele SVG-en blir ikke strukket.
`continuous-outline-*.svg`-filene tegner kantlinjer på kort og felt.
Omrisset er kalibrert til ca. 0.5 CSS-piksler øverst, 0.2 på sidene og 0.3 nederst
ved standard hjørnestørrelser. Ved svært små komponenter skaleres det ned.
Ytterkanten holdes skarp, mens den indre kanten har en smal, myk overgang.
En CSS-piksel kan dekke flere skjermpiksler, så disse delpikselbreddene gir
finere linjer på skjermer med høy pikseltetthet.

## Glasskanter

Fargene ligger samlet under kommentaren `GLASSKANTER` øverst i `style.css`:

- `--glass-edge-top`: lyst gjenskinn på toppen.
- `--glass-edge-shoulder`: lyset rundt de øvre hjørnene.
- `--glass-edge-side`: den mørkere, tynne kanten på sidene.
- `--glass-edge-lower`: overgangen rundt de nedre hjørnene.
- `--glass-edge-bottom`: svak refleks nederst.
- `--glass-edge-opacity`: total styrke. Bruk 0 for å skjule kantlyset.

`--glass-edge-paint` blander disse fargene. Maskene gjør at bare omrisset males;
bakgrunnen inni komponenten endres ikke. Kort og tilbakeknapper bruker glasslyset.
Vanlige knapper har ingen dekorativ kant. Felt og feltgrupper
har en ensfarget kant som styres av `--color-input-border`.
De gamle variablene `--card-border-color` og `--main-button-border-color` er erstattet
av denne felles paletten. Vanlige `border-color`-regler styrer ikke SVG-kanten.

Den blå plussknappen bruker vanlig CSS-avrunding. Native avkrysningsbokser og
fremdriftsindikatorer beholder vanlig nettleserutseende.

Endre fortsatt farger og radiusverdier i `style.css`. Selve maskeringen er samlet
i den separate hjørnefilen. Felt ligger i en `smooth-field`-ramme for å kunne få
en enkel kant som følger hjørnene. Vanlige sirkler og avkrysningsbokser beholder formen sin.
Dette er vår G2-tilnærming, ikke Apples eksakte geometri. Ingen JavaScript er lagt til.
Nettlesere uten støtte for masketypen beholder avrundingen fra `style.css`.

## Navigasjon og plussknapp

Oversiktsflisene og radene på startsiden brukes til navigasjon.
Undersidene har vanlige tilbake-lenker. «Data» øverst på startsiden åpner
sikkerhetskopi- og eksportsiden. Bunnmenyen og animasjonskoden er fjernet.
Tilbake-lenkene vises som runde knapper med `assets/back.svg`, kortenes
bakgrunnsfarge og samme glasskant. Målet og den tilgjengelige teksten ligger i HTML.

Den blå plussknappen ligger fast nederst til høyre på startsiden og åpner
`runde.html`. Den har teksten «Ny runde» for skjermlesere og ved musepeker.
Knappen er 52 × 52 CSS-piksler, med et 28-pikslers plussikon.
Knappen oppretter ikke data ennå; den åpner det statiske rundeutkastet.
Utseendet endres under `.floating-add` i `style.css`.

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
