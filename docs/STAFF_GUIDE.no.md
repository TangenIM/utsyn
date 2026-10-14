# Brukerveiledning for Restaurant Utsyn

Denne veiledningen gjelder ansatte og administratorer. IT finner installasjon og drift i [README](../README.md). Administrasjonssidene bruker norsk. Gjestene kan velge norsk eller engelsk.

## Logg inn

1. Åpne restaurantens nettsted og gå til `/admin`.
2. Skriv brukernavn og passord som administratoren har opprettet for deg.
3. Logg inn. Bruk menyen for å åpne **Reservasjoner**, **Bord** eller **Meny**.
4. Logg ut når du er ferdig, særlig på en delt PC.

Hvis du har glemt passordet, kontakt en administrator. Nettstedet sender ikke e-post for tilbakestilling av passord. Ikke slett databasen for å få tilgang igjen.

## Behandle en ny reservasjon

1. Åpne **Reservasjoner** og velg dato. Bruk statusfilteret ved behov.
2. En ny bestilling står som **Venter på bord**. Den første SMS-en betyr at bestillingen er mottatt, ikke at bordet er bekreftet.
3. Kontroller navn, antall gjester, tidspunkt, telefon og eventuelle kommentarer eller allergier.
4. Åpne **Bord** og velg samme dato og tidspunkt.
5. Tildel ett eller flere aktive bord. Samlet kapasitet må være minst like stor som antall gjester. Et bord som allerede er tildelt en annen reservasjon i samme tidsluke, kan ikke brukes samtidig.
6. Bekreft reservasjonen når nok plasser er tildelt. Kontroller bekreftelsen på skjermen.
7. Hvis SMS er aktivert, kontroller **SMS-logg**. **Levert** betyr at leverandøren har rapportert levering. Se [SMS-veiledningen](SMS.md) ved feil.

Hvis nettleseren viser en nettverksfeil etter lagring, last listen på nytt og kontroller reservasjonen før du prøver samme handling igjen. Den kan allerede være lagret.

## Hva statusene betyr

| Status | Betydning og handling |
| --- | --- |
| Venter på bord | Mottatt bestilling. Tildel nok plasser og bekreft den. |
| Bekreftet | Bord er tildelt og reservasjonen er bekreftet. |
| Fullført | Besøket er avsluttet. Reservasjonen beholder kapasiteten for sin opprinnelige tidsluke. |
| Kansellert | Bestillingen er avlyst. Kapasitet og bordtildelinger frigjøres. |
| Møtte ikke | Gjesten møtte ikke. Kapasitet og bordtildelinger frigjøres. |

Kansellering og **Møtte ikke** kan sende SMS. Velg derfor riktig reservasjon og kontroller datoen før du endrer status. Sletting fjerner reservasjonen; bruk kansellering når du vil beholde historikken og varsle gjesten.

Når en kansellert reservasjon gjenopprettes, kontrollerer systemet kapasiteten på nytt. Gamle bordtildelinger gjenbrukes ikke. Tildel bord på nytt før bekreftelse.

## Bord og romplan

- Velg dato og tidspunkt før du tildeler bord.
- Kontroller kapasiteten og om hvert bord er aktivt. Ikke sett kapasiteten høyere enn antall plasser som faktisk finnes. Hvis en endring gjør at en bekreftet reservasjon har for få aktive plasser, settes den tilbake til **Venter på bord**. Tildel nok plasser og bekreft den på nytt.
- I redigeringsmodus kan du flytte bordene på romplanen og lagre plasseringen.
- **Lagre permanent** lagrer grunnplanen. **Lagre for i dag** lagrer en egen plan for valgt dato; kontroller hvilken dato som er valgt.
- En tilbakestilling av en dagsplan fjerner dagens overstyring og viser grunnplanen igjen. Den sletter ikke den permanente planen.
- Last siden på nytt etter lagring for å kontrollere at planen er lagret.

Bordkonflikter gjelder samme dato og samme ankomsttid. Systemet beregner ikke hvor lenge et måltid varer. Hvis gjester fra klokken 12 fortsatt sitter ved bordet klokken 13, må ansatte ta hensyn til dette. Bruk tydelig adskilte serveringer når det er nødvendig.

## Meny

Vanlige ansatte kan håndtere retter og dagsmenyer. Oppretting og sletting av kategorier krever administratortilgang.

1. Åpne **Meny**.
2. Opprett eller velg en kategori. Fyll ut både norsk og engelsk navn.
3. Opprett eller rediger retten: kategori, navn på begge språk, beskrivelser og pris. Pris lagres som et helt antall kroner.
4. Kontroller om retten er aktiv.
5. Velg dato og sett opp hvilke retter som skal vises den dagen.
6. Lagre og kontroller den offentlige siden på begge språk.

Å slette en kategori sletter også rettene i kategorien. Å slette en rett fjerner også koblingen til dagsmenyer. Bruk inaktiv status hvis du bare vil skjule en rett midlertidig.

## Innstillinger og åpningstider

Dette krever administratortilgang.

1. Åpne **Innstillinger**.
2. Fyll ut tekst på norsk og engelsk, kontaktinformasjon og priser.
3. Sett maksimal kapasitet og bestillingsfrist. Fristen er antall minutter før ankomst som nye bestillinger må være registrert.
4. Kontroller åpne ukedager og tilgjengelige tidsluker.
5. Registrer ferier, stengte dager og ekstra åpne datoer. En spesiell dato overstyrer den vanlige ukeplanen. En ekstra åpen dato må ha egne tidsluker.
6. Lagre og sjekk hvilke datoer og tider en gjest faktisk kan velge.

Alle bestillingstider følger **Europe/Oslo**, også når serveren står i et annet land. Tidligere datoer og utløpte tidsluker kan ikke bestilles. Standardinnholdet må kontrolleres før publisering.

## Brukere

Dette krever administratortilgang.

1. Åpne **Brukere** og opprett en personlig konto for hver ansatt.
2. Velg **staff** for vanlig arbeid eller **admin** for tilgang til innstillinger og brukere.
3. Bruk et unikt brukernavn og et passord med minst 12 tegn og høyst 72 UTF-8-byte.
4. Gi passordet til personen gjennom skolens godkjente kanal.
5. Fjern kontoen når personen ikke lenger skal ha tilgang. En slettet bruker mister tilgang også med en gammel innloggingsinformasjonskapsel.

Systemet lar deg ikke slette din egen konto eller den siste administratoren. Opprett en ekstra administrator for gjenoppretting. Skjermen oppretter og sletter brukere; den har ikke et eget skjema for å endre et eksisterende passord eller en rolle. En annen administrator kan opprette en erstatningskonto og deretter fjerne den gamle kontoen.

## Daglig kontroll

Før servering: kontroller dagens meny, åpningstider, reservasjoner, kommentarer, bordtildelinger og mislykkede SMS-er. Etter servering: oppdater reservasjonene til riktig status og logg ut. Kontakt IT hvis lagring feiler, nettsiden er utilgjengelig eller SMS-levering er usikker. Ikke opprett en ny bestilling for å reparere en SMS-feil.
