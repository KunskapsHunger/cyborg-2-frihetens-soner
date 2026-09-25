# CYBÖRG II: FRIHETENS SÖNER

**Spela i webbläsaren:** https://kunskapshunger.github.io/cyborg-2-frihetens-soner/

Uppföljaren till *CYBÖRG*, nu som **PS2-demake**: en taktisk smygthriller i
*Metal Gear Solid 2*-anda i ett snöigt, stormigt Göteborg i december 2047, med
Simon Stålenhags framtidsbild i vinterljus. Spelet är på svenska och helt röstsatt.

Det har gått ett år sedan Tornet. Rörelsen styr staden som Folkrådet, men Arkivet
med allas minnen finns kvar. På luciamorgonen tar Frihetens söner, ledda av Sara
Nyberg, Karlatornet och luciatåget som gisslan. Där står Elsa i ljuskronan. Staten
skickar in **Enhet Åtta**, som har tränat i simuleringen i tretusen timmar och
leds av en röst på radion som kanske inte är den han tror. **Henrik** kommer
ändå, med eller utan tillstånd.

> *A PS2-style stealth thriller in a snowbound, near-future Gothenburg.
> Swedish language, fully voiced. Runs in any modern desktop browser.*

## Kapitel

| | Kapitel | Spelare |
|---|---|---|
| Prolog | Advent | Henrik |
| I | Färjan: M/S Friheten i snöstorm, boss Vargen | Henrik |
| II | Simuleringen | Åtta |
| III | Frihamnen: fotspår i snön | Åtta |
| IV | Haga: julmarknaden, spanarna | Henrik |
| V | Karlatornet: sprängladdningar, gisslan, boss Minnesläsaren | Åtta |
| VI | Glitchen: taket, radion går sönder | Åtta |
| VII | Älven: boss Järnjätten | Henrik och Åtta |
| Epilog | Lucia | |

## Nytt jämfört med ettan

- **PS2-grafik:**
  - 448p utan PS1-darr och ljus per pixel med glans på is och våt asfalt
  - bloom, filmisk tonmappning, färggradering och djupskärpa i mellansekvenserna
  - spökbild vid larm, snöfall och snöyra som följer vinden, frostkant och synlig andedräkt
- **Mellansekvenser:** spelas i spelmotorn med kameraregi, filmkanter och röster. Serie-intermezzon finns kvar som hommage.
- **Nya förmågor och prylar:** skåp att gömma sig i, kartongen, knackningar och upphållning av vakter som man sedan skakar på ID-brickor. *Lyssna in* läser vakternas tankar och visar deras patrullvägar.
- **Smartare vakter:** de följer fotspår i snön och kontrollerar via radion var tredje minut. Kommer inget svar skickar de förstärkning med sköldar.
- **Mer i nivåerna:** frysspray mot sprängladdningar och lampor som går att skjuta sönder.
- **Radio:** man kan själv ringa kontakterna, som kommenterar platsen och sparar spelet.
- **Rankning:** ett kodnamn efter ett svenskt djur, som räknas fram ur hur man spelade.

## Kontroller

| Tangent | Funktion |
|---|---|
| W A S D / piltangenter, mus | gå och vrid kameran |
| Shift, C | springa, huka |
| E | kvävgrepp, bära, skaka, använda (håll in för att frysa en laddning) |
| Högerklick, vänsterklick | sikta (bakifrån håller du upp vakten), skjuta |
| 1 / 2 | paralysator / tjänstevapen |
| Q, T, håll R | EMP, termosyn, lyssna in |
| B, F | kartongen, knacka |
| V, H | radio, reparationspaket |
| Tab, Esc | uppdrag, paus |

## Utveckling

```bash
npm install
npm run dev      # http://localhost:5175
npm test
npm run build
```

Alla texturer, modeller, ljud och all musik är genererade med egna skript
(Python, Blender i headless-läge, numpy/ffmpeg), och rösterna med Gemini TTS.
Generatorerna ingår inte i det här repot, bara de färdiga filerna i
`public/assets/`. Ledmotivet är *Du gamla, du fria* (Dybeck 1844, folkmelodi),
och ettans Bellmansvisa återkommer. Karin Boye citeras. Camus och Baudrillard
finns bara med som teman. Design och manusformat beskrivs i `docs/`.
