# ALFRED MASKIN

En enkel arbeidslogg for brøyting, strøing og annet arbeid. Alfred kan legge inn kunder og arbeidsadresser, planlegge jobber, sette opp faste runder og se tidligere besøk i **Logg**.

## Prøv appen

Bruk fiktive kunder i den første forhåndsvisningen.

1. Legg inn en kunde og en arbeidsadresse under **Kunder**.
2. Lag en runde under **Runder**, legg til adressen og start en kjøring.
3. Registrer et utført stopp og finn besøket igjen under **Logg**.

## Egne tjenester

Under **Kunder → Ny kunde** eller **Rediger kunde** kan du skrive et navn under **Ny tjeneste** og trykke **Legg til tjeneste**. Navnet lagres for senere bruk, også om kunden ennå ikke er lagret. Kryss deretter av hvilke tjenester som gjelder for hver arbeidsadresse. Du kan velge flere per adresse.

Tjenestene kan brukes i planlagte jobber og nye kjøringer, og vises i loggens tjenestefilter. De følger med i sikkerhetskopier. Eksisterende kunder og arbeidsregistreringer beholder tjenestene sine.

## Kalender

Åpne **Kalender** og velg en dato for å se dagens jobber. Bruk pilene for å bytte måned, **I dag** for å gå tilbake til dagens dato eller **Gå til dato** for å hoppe lenger frem. Tallene i kalenderen viser hvor mange jobber som ligger på hver dato.

**Planlegg jobb** bruker datoen du har valgt. Du kan velge arbeidsadresse, tjeneste, klokkeslett og notat, og redigere eller fjerne en jobb frem til arbeidet er startet. Kommende jobber vises også på oversikten. Faste runder ligger fortsatt under **Runder** og legges ikke automatisk inn i kalenderen.

## Lagring og frakoblet bruk

Data lagres i nettleseren på enheten du bruker. Under **Data** kan du laste ned en sikkerhetskopi, gjenopprette en kopi og eksportere arbeidsloggen som CSV. Gjenoppretting erstatter dataene i den aktuelle nettleseren.

Åpne appen med nett første gang og vent til **Data** viser at den er klargjort for frakoblet bruk. Før du legger inn ekte kundedata, prøv en runde i flymodus og test at en sikkerhetskopi kan gjenopprettes.

## Startposisjon

Når du trykker **Start arbeid**, starter tidtakeren med en gang. Appen ber samtidig om én posisjon fra enheten. Tillat posisjon når nettleseren spør. Posisjon krever HTTPS eller localhost; en lokal HTTP-adresse som `http://192.168…` på nettbrettet støtter normalt ikke dette.

Posisjonen lagres sammen med tidspunktet den ble hentet og enhetens oppgitte nøyaktighet. Du finner den under **Detaljer og notat**, i oppsummeringen etter lagring og under **Posisjon** i loggen. Den følger også med i sikkerhetskopier og CSV. Trykk på koordinatene for å åpne Google Maps i en ny fane. Først når du åpner lenken, sendes disse koordinatene til Google Maps. Kartvisningen trenger normalt nett.

Hvis posisjon ikke kan hentes, kan arbeidet likevel pauses og lagres. **Hent posisjon nå** henter posisjonen der enheten er da; dette merkes som en posisjon hentet etter start. Etter at appen er lukket eller lastet på nytt, må et avbrutt posisjonssøk startes på nytt manuelt. Appen sporer ikke kjøreruten.

## Lokal utvikling

Åpne prosjektet med Live Server i VS Code. Skjermene ligger i `index.html`, stilene i `style.css` og funksjonaliteten i `js/`.
