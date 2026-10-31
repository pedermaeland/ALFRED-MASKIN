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
- `continuous-corners.css`: G2-hjørner på kort, knapper, navigasjon og felt.

Kort og felter ligger direkte i HTML-filene. Kommentarene viser hvilke blokker du kan kopiere.
Header og meny er gjentatt i hver fil; endre dem i alle sidene ved behov.

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
bakgrunnen inni komponenten endres ikke. `.card` og `Ny runde` bruker glasslyset.
Andre knapper og navigasjonen har ingen dekorativ kant. Felt og feltgrupper
har en ensfarget kant som styres av `--color-input-border`.
Den mørke markøren i navigasjonen viser hvilken side som er valgt.
De gamle variablene `--card-border-color` og `--main-button-border-color` er erstattet
av denne felles paletten. Vanlige `border-color`-regler styrer ikke SVG-kanten.

`Ny runde` beholder ekte halvsirkler i endene, og pilknappen beholder sirkelformen.
Begge bruker vanlig CSS-avrunding og egne SVG-omriss for glasskanten. Native avkrysningsbokser og
fremdriftsindikatorer beholder vanlig nettleserutseende.

Endre fortsatt farger og radiusverdier i `style.css`. Selve maskeringen er samlet
i den separate hjørnefilen. Felt ligger i en `smooth-field`-ramme for å kunne få
en enkel kant som følger hjørnene. Vanlige sirkler og avkrysningsbokser beholder formen sin.
Dette er vår G2-tilnærming, ikke Apples eksakte geometri. Ingen JavaScript er lagt til.
Nettlesere uten støtte for masketypen beholder avrundingen fra `style.css`.

## Glidende navigasjon

Den aktive pillen glir mellom menypunktene med CSS. Bruk Live Server for å se animasjonen
mellom sidene. Direkte åpning av HTML-filene viser fortsatt menyen, men uten denne animasjonen.

I `style.css` finner du `--nav-slide-duration: 380ms` øverst. Lavere tall gir raskere glidning.
Selve animasjonsreglene er merket «Sliding navbar». Det er fortsatt ingen JavaScript i prosjektet.
`view-transition-name: none` på `:root` hindrer at hele siden blir tatt som et
stort øyeblikksbilde ved sideskift. Bare de navngitte delene i navigasjonen tas
med i animasjonen. Å skjule `view-transition-old(root)` ga fortsatt dette ekstra
arbeidet og svært få oppdateringer i WebKit-testen.
Bare markøren flytter seg. Menyteksten står stille, og navigasjonen bruker ikke
bakgrunnsblur. Markøren har vanlig CSS-avrunding uten en egen SVG-maske for å
redusere arbeidet ved sideskift på telefoner.
Selve menylinjen har ingen formmaske rundt lenkene. Bakgrunnen bruker en egen
maskert `::before` under lenkene. Endringen skal hindre
at bakgrunnen forsvinner når nettleseren tar øyeblikksbilder av de animerte delene.
Dette må også bekreftes på telefonen.
På mobil er markørens bredde og høyde låst under overgangen, slik at bare
posisjonen animeres. Beregningen ligger ved `view-transition-group(nav-highlight)`
i `style.css` og må følge menyens marger, padding og mellomrom hvis de endres.
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
