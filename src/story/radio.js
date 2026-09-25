// CYBÖRG II: FRIHETENS SÖNER — radio (codec) calls. Schema: docs/STORY_SCHEMA.md.
// who: henrik | atta | kall | astrom | sara | linnea | glitch.
// 3–10 lines per RADIO call, 2–5 lines per CODEC call, ~160 chars max.
//
// `glitch` is Samordnaren speaking with Kall's voice as it breaks down (roof
// chapter onwards). Voice it with Kall's voice plus heavy processing: stutter,
// dropouts, wrong pitch. In `ro_truth` it speaks flat, like a machine.
//
// Scripted order per level (the engine triggers them):
//   ferry:     fe_start → (ferry_hold) fe_hold → fe_vargen → fe_vargen_down → (ferry_sink)
//   sim2:      (sim2_intro) s2_intro → s2_locker → s2_box → s2_knock → s2_holdup → s2_scan → s2_end
//   frihamnen: (frihamnen_intro) fh_start → fh_tracks (first footprints) → fh_radio (first check-in)
//              → (frihamnen_stranger) fh_stranger → fh_tunnel
//   haga:      (haga_intro) ha_start → ha_found (first scout) → ha_all (all three) → (haga_maja)
//   tower:     (tower_lobby) to_start → to_bombs → to_bomb_last → (tower_hostages) → to_reader
//              → (tower_reader) → to_reader_ports (after the Reader dodges a few times)
//              → (tower_reader_down) to_reader_down → to_elevator → (tower_elevator)
//   roof:      (roof_glitch) ro_glitch_1 → ro_glitch_2 → ro_glitch_3 → ro_linnea → (roof_linnea)
//              → ro_truth → (roof_sara)
//   river:     ri_start → (river_intro) ri_jatte → ri_jatte_down → (river_sara_live|dies) → (river_archive)
// Optional: ro_glitch_reloads replaces nothing; play it once on the roof when the
// page has been loaded many times. `{n}` = number of page loads.

export const RADIO = {
  // ---------------------------------------------------------------- FERRY
  fe_start: [
    { who: 'astrom', text: 'Henrik, det är Ruth. Du är ombord. Friheten, nattfärjan från Frederikshavn. Hon lägger till i Göteborg vid fyra, om vädret tillåter.' },
    { who: 'henrik', text: 'Vädret tillåter ingenting. Det snöar vågrätt.' },
    { who: 'astrom', text: 'Lasten står någonstans under däck. Fotografera den. Ingenting mer. Du är inte polis längre.' },
    { who: 'henrik', text: 'Det har jag hört. Mest från mig själv.' },
    { who: 'astrom', text: 'Däcket är snötäckt. Du lämnar spår, och vakterna läser spår. Nysnön täcker dem efter en stund. Vänta, om du kan.' },
    { who: 'astrom', text: 'Ser du ett skåp, gå in i det med E. Det är inte värdigt. Det är inte meningen att det ska vara värdigt.' },
    { who: 'astrom', text: 'Och kärnan tål inte kylan. Stanna inte ute på däck längre än du måste.' },
    { who: 'henrik', text: 'Jag lovade Maja att vara hemma före lucia.' },
    { who: 'astrom', text: 'Då har du en anledning. Det är mer än de flesta har här ute i natt.' },
  ],
  fe_hold: [
    { who: 'henrik', text: 'Jag har bilden. En maskin. Gul, fyra ben, stor som ett hus. Det står NGAB 4 på plåten.' },
    { who: 'astrom', text: 'Norrbottens Gruv. De stängde gruvan när Kiruna hade flyttat klart. Den skulle ha skrotats för tio år sen.' },
    { who: 'henrik', text: 'Den ser inte skrotad ut. Den ser ut att vänta.' },
    { who: 'astrom', text: 'Det är en borrmaskin, Henrik. Den äter berg.' },
    { who: 'henrik', text: 'Karlatornet står på berg.' },
    { who: 'astrom', text: 'Och under tornet ligger SIM:s gamla skyddsrum. Folkrådet säger att det står tomt.' },
    { who: 'henrik', text: 'Folkrådet säger mycket.' },
    { who: 'astrom', text: 'Gå upp på däck. Vakterna pratar om en prickskytt. De kallar henne Vargen. Det låter inte som ett smeknamn.' },
  ],
  fe_vargen: [
    { who: 'astrom', text: 'Hon ligger högt, på bryggtaket eller vid livbåtarna. Hon flyttar sig efter varje skott.' },
    { who: 'astrom', text: 'Snöbyarna kortar hennes sikt. Rör dig när det blåser som mest. Stå still när det mojnar.' },
    { who: 'henrik', text: 'Hon ser mig i värmesyn.' },
    { who: 'astrom', text: 'Hon ser din andedräkt. Du andas fortfarande som en människa. Det är det enda jag aldrig lyckades laga.' },
    { who: 'astrom', text: 'Paralysatorn räcker. Hon har också någon som väntar på henne. Kanske bara en hund, men ändå.' },
  ],
  fe_vargen_down: [
    { who: 'henrik', text: 'Hon ligger på däck. Hon andas.' },
    { who: 'astrom', text: 'Lägg henne i lä. Snön tar henne annars.' },
    { who: 'henrik', text: 'Hon sa att hon har följt mina spår sen bildäcket. Att jag går som ett skadskjutet djur.' },
    { who: 'astrom', text: 'Hon har rätt. Din vänstra höft slits. Vi tar den på torsdag.' },
    { who: 'henrik', text: 'Det luktar diesel från aktern. Mycket diesel. Och båten lutar.' },
    { who: 'astrom', text: 'Henrik. Någon har öppnat bottenventilerna. De sänker henne. Ta dig mot fören. Nu.' },
  ],

  // ----------------------------------------------------------------- SIM2
  s2_intro: [
    { who: 'kall', text: 'Enhet Åtta. Grundrörelserna kan du. Du har gjort dem i tretusen timmar. Vi repeterar bara det som är nytt.' },
    { who: 'kall', text: 'Den här simuleringen är noggrannare än staden. Lita på den.' },
    { who: 'linnea', text: 'Och jag sitter bredvid dig hela tiden. Nästan bredvid. Du förstår vad jag menar.' },
    { who: 'atta', text: 'Uppfattat.' },
    { who: 'linnea', text: 'Du får säga något annat än uppfattat, vet du. Det är inte förbjudet.' },
    { who: 'atta', text: 'Vad ska jag säga?' },
    { who: 'linnea', text: 'Det är det som är det roliga. Man vet inte.' },
    { who: 'kall', text: 'Radion når du med V. Analytikern sparar dina data när du ringer henne. Fortsätt till första stationen.' },
  ],
  s2_locker: [
    { who: 'kall', text: 'Skåp. Gå in med E. Du syns inte inifrån, och du hör allt.' },
    { who: 'kall', text: 'En kropp får också plats i ett skåp. Det är en rekommendation.' },
    { who: 'linnea', text: 'Jag vet att du inte tycker om trånga utrymmen.' },
    { who: 'atta', text: 'Jag tycker inte om någonting.' },
    { who: 'linnea', text: 'Du sa det i Marstrand. Vi stod i en telefonkiosk medan det regnade, och du sa att du inte fick luft.' },
    { who: 'atta', text: 'Jag minns inte Marstrand.' },
    { who: 'linnea', text: 'Det gör inget. Jag har det kvar. Jag har oss båda kvar.' },
  ],
  s2_box: [
    { who: 'kall', text: 'Kartongen. En standardiserad flyttkartong, nittio gånger sjuttio centimeter. Statens mest underskattade taktiska resurs.' },
    { who: 'kall', text: 'Tryck B, så kryper du in under den. En kartong som står still väcker inga frågor. En kartong som går gör det.' },
    { who: 'atta', text: 'Varför?' },
    { who: 'kall', text: 'För att kartonger inte går, Enhet Åtta.' },
    { who: 'linnea', text: 'Han frågade varför. Hörde du? Han frågade varför.' },
    { who: 'kall', text: 'Noterat.' },
  ],
  s2_knock: [
    { who: 'kall', text: 'Ställ dig mot en vägg och knacka med F. Vakten kommer för att se efter. Han kommer ensam, och han kommer dit du vill.' },
    { who: 'kall', text: 'Knacka inifrån ett skåp om du vill ha honom närmare. Det är ett gammalt trick. Det fungerar fortfarande.' },
    { who: 'linnea', text: 'Min mormor knackade i väggen när grannen spelade dragspel. Grannen kom aldrig. Det gjorde polisen.' },
    { who: 'atta', text: 'Ska jag knacka nu?' },
    { who: 'kall', text: 'Nu.' },
  ],
  s2_holdup: [
    { who: 'kall', text: 'Sikta på en vakt bakifrån med höger musknapp. Han räcker upp händerna. Det gör de nästan alltid.' },
    { who: 'kall', text: 'Skaka honom med E medan han står så. Han tappar det han bär, och sin ID-bricka.' },
    { who: 'kall', text: 'Samla brickorna. Staten vill veta vem de är.' },
    { who: 'linnea', text: 'Jag vill också veta vem de är. Namnen, alltså. Inte på statens sätt.' },
    { who: 'atta', text: 'Är det skillnad?' },
    { who: 'linnea', text: 'Ja. Fråga mig igen när du har några.' },
  ],
  s2_scan: [
    { who: 'kall', text: 'Lyssna in. Håll R. Du hör vakterna i närheten, du ser vägarna de går, och du läser en tanke.' },
    { who: 'atta', text: 'En tanke?' },
    { who: 'kall', text: 'Det de tänker när de tror att ingen hör. Det kostar kärnenergi. Använd det när det lönar sig.' },
    { who: 'linnea', text: 'Det känns som att läsa någons dagbok.' },
    { who: 'kall', text: 'Dagböcker skrivs för att läsas. Annars skulle ingen skriva ner något.' },
    { who: 'atta', text: 'Uppfattat.' },
    { who: 'linnea', text: 'Säg inte uppfattat till det där.' },
  ],
  s2_end: [
    { who: 'kall', text: 'Godkänt. Du rörde dig som ingen. Det är det högsta betyget vi har.' },
    { who: 'atta', text: 'Tack.' },
    { who: 'kall', text: 'Tack är överflödigt. I morgon klockan sju tar en väpnad grupp Karlatornet under invigningen.' },
    { who: 'atta', text: 'Har det hänt?' },
    { who: 'kall', text: 'Det händer i morgon klockan sju.' },
    { who: 'atta', text: 'Uppfattat.' },
    { who: 'linnea', text: 'Sov lite nu. Jag sparar dig. I morgon är det lucia.' },
    { who: 'atta', text: 'Vad är lucia?' },
    { who: 'linnea', text: 'Ljus i mörkret, och lussekatter. Du tappade din strut i luciatåget i trean. Alla skrattade. Du också.' },
  ],

  // ------------------------------------------------------------ FRIHAMNEN
  fh_start: [
    { who: 'kall', text: 'Enhet Åtta. Du är i Frihamnen. Tornet ligger västerut. Klockan sju tog Frihetens söner det.' },
    { who: 'kall', text: 'De har luciatåget och elva ledamöter av Folkrådet. De kräver att något som inte finns ska göras offentligt.' },
    { who: 'atta', text: 'Vad är det som inte finns?' },
    { who: 'kall', text: 'Det behöver du inte veta. Ta dig till tornets servicetunnel. Den börjar under kajen.' },
    { who: 'kall', text: 'Allmänheten har inte informerats. Teve sänder gårdagens repetition. Folk ser lucia. Det är bättre så.' },
    { who: 'linnea', text: 'Tänk dig. Hela stan sitter och blir rörd av samma barn som i går.' },
    { who: 'kall', text: 'Det är en rimlig känsla. Den stör ingen.' },
  ],
  fh_tracks: [
    { who: 'linnea', text: 'Titta bakom dig. Du lämnar spår i snön, som en hund på ett nybäddat lakan.' },
    { who: 'linnea', text: 'Vakterna följer spår. Håll dig där det är plogat, eller vänta på en snöby. Då fylls de igen.' },
    { who: 'atta', text: 'Jag lämnade inga spår i simuleringen.' },
    { who: 'kall', text: 'Simuleringen hade ingen snö som låg kvar. Det var en förenkling.' },
    { who: 'linnea', text: 'Den här snön ligger kvar. Du kan skriva ditt namn i den.' },
    { who: 'atta', text: 'Jag har inget namn.' },
    { who: 'linnea', text: 'Skriv mitt, då.' },
  ],
  fh_radio: [
    { who: 'kall', text: 'Vakterna rapporterar till tornet var tredje minut. Lyssna efter det.' },
    { who: 'kall', text: 'Ligger en vakt nedslagen när det är hans tur frågar de efter honom. Svarar han inte skickar de folk.' },
    { who: 'linnea', text: 'Så slå inte ner någon precis innan han ska svara. Det är som att ringa på och springa, fast tvärtom.' },
    { who: 'atta', text: 'Hur vet jag när det är dags?' },
    { who: 'linnea', text: 'Du hör det. De säger nästan samma sak varje gång. Folk gör det.' },
  ],
  fh_stranger: [
    { who: 'atta', text: 'Kall. Det står en man i rock uppe på kranen. Han släckte strålkastaren åt mig.' },
    { who: 'kall', text: 'Det finns ingen där.' },
    { who: 'atta', text: 'Han har ett rött öga. Han tittar på mig.' },
    { who: 'kall', text: 'Ignorera honom. Han ingår inte i övningen.' },
    { who: 'atta', text: 'Övningen?' },
    { who: 'kall', text: 'Operationen. Fortsätt.' },
    { who: 'linnea', text: 'Det var ett fint öga. Som en cigarett i mörkret.' },
    { who: 'atta', text: 'Han hjälpte mig. Varför?' },
    { who: 'kall', text: 'Varför är inte en operativ fråga, Enhet Åtta.' },
    { who: 'atta', text: 'Uppfattat.' },
  ],
  fh_tunnel: [
    { who: 'kall', text: 'Servicetunneln. Den går under kajen till tornets källare. Därifrån tar du dig upp.' },
    { who: 'linnea', text: 'Det är varmt därinne. Tina fingrarna innan du rör något.' },
    { who: 'atta', text: 'Mina fingrar fryser inte.' },
    { who: 'linnea', text: 'Tina dem ändå. För min skull.' },
    { who: 'atta', text: 'Uppfattat.' },
    { who: 'linnea', text: 'Jag sparar dig vid ingången. Gå inte vilse under älven.' },
  ],

  // ----------------------------------------------------------------- HAGA
  ha_start: [
    { who: 'astrom', text: 'Henrik? Henrik! Din signal var borta i sex timmar. Jag hade börjat skriva minnesord om dig.' },
    { who: 'henrik', text: 'Hur långt kom du?' },
    { who: 'astrom', text: 'Tre meningar. Två av dem var ursäkter.' },
    { who: 'henrik', text: 'Jag är i Haga. Frihetens söner pratade om Maja på radion i Frihamnen. Mamman i Haga. Vi håller ögonen på henne.' },
    { who: 'astrom', text: 'Hur många?' },
    { who: 'henrik', text: 'Tre spanare, i vanliga kläder. De ser ut som alla andra här. Det är det som är poängen.' },
    { who: 'astrom', text: 'Lyssna in. Håll R. Du hör vem som bär radio, och vad de tänker. Men Maja får inte se dig. Då vet de att du är här.' },
    { who: 'astrom', text: 'Och kärnan är nedkyld efter vattnet. Den håller i kväll. Fråga mig inte om i morgon.' },
    { who: 'henrik', text: 'Jag frågar aldrig om i morgon.' },
  ],
  ha_found: [
    { who: 'henrik', text: 'En av dem. Han bar radio och en termos glögg. Han hade ett foto av Maja i fickan.' },
    { who: 'astrom', text: 'Står det något på baksidan?' },
    { who: 'henrik', text: 'Bara en tid. Sjutton noll noll.' },
    { who: 'astrom', text: 'Då ska något hända med henne klockan fem. Två kvar, Henrik.' },
    { who: 'henrik', text: 'Glöggen var alkoholfri. Revolutionen har blivit ansvarsfull.' },
    { who: 'astrom', text: 'Det är sånt som oroar mig mest.' },
  ],
  ha_all: [
    { who: 'henrik', text: 'Alla tre. Ingen såg mig. Jag tror inte att de ville henne illa. En av dem skulle ta henne över till Hisingen om det gick åt skogen.' },
    { who: 'astrom', text: 'Sara skyddar henne.' },
    { who: 'henrik', text: 'Eller tar henne. Med en röd armbindel på är det samma sak.' },
    { who: 'astrom', text: 'Henrik. Jag har gått igenom deras radiotrafik. Det finns en till enhet i tornet. Staten skickade in honom i gryningen.' },
    { who: 'henrik', text: 'Åtta.' },
    { who: 'astrom', text: 'Jag byggde honom också. Han har aldrig varit utanför glaset förut. Han är ett barn med en paralysator.' },
    { who: 'henrik', text: 'Han stod i vår trappa i tre dagar förra året.' },
    { who: 'astrom', text: 'Jag vet. Det var jag som hämtade honom. Gå till Maja nu. Hon står vid trapporna upp mot Skansen Kronan.' },
  ],

  // ---------------------------------------------------------------- TOWER
  to_start: [
    { who: 'kall', text: 'Du är inne, Enhet Åtta. Lobbyn, kontorsplanet, teknikplanet. Sedan taket.' },
    { who: 'kall', text: 'Frihetens söner har placerat laddningar på fyra bärande pelare. Går de av faller tornet i älven.' },
    { who: 'linnea', text: 'Med alla därinne. Med lucian.' },
    { who: 'kall', text: 'Gisslan är inte ditt mål. Ditt mål är Sara Nyberg. Hon är på taket.' },
    { who: 'atta', text: 'Uppfattat.' },
    { who: 'linnea', text: 'Han säger uppfattat, men han tänker. Jag hör det på andningen.' },
    { who: 'kall', text: 'Analytikern ska inte höra saker på andningen.' },
  ],
  to_bombs: [
    { who: 'kall', text: 'Laddningarna är kopplade till en tidsställare. Du kan inte desarmera dem. Du kan frysa dem.' },
    { who: 'kall', text: 'Frysspray. Gå fram till laddningen och håll E tills den är vit. Kylan stoppar kretsen.' },
    { who: 'linnea', text: 'Minikartan visar var de sitter. Fyra röda prickar, som kulor i en julgran. Fast sämre.' },
    { who: 'atta', text: 'Vem har byggt dem?' },
    { who: 'kall', text: 'Någon som vet vilka pelare som bär. Revolutionärer är ofta noggranna. Det är det som gör dem tröttsamma.' },
    { who: 'linnea', text: 'Min pappa var elektriker. Han sa att man aldrig ska lita på en kabel som är för snyggt dragen.' },
  ],
  to_bomb_last: [
    { who: 'kall', text: 'Fyra av fyra. De bärande pelarna är säkrade. Tornet står.' },
    { who: 'linnea', text: 'Du är fantastisk. Jag sparar dig. Två gånger, för säkerhets skull.' },
    { who: 'atta', text: 'Laddningarna hade dikter på tejpen.' },
    { who: 'kall', text: 'Poesi är inte en sprängteknisk faktor.' },
    { who: 'atta', text: 'På den sista stod det förlåt.' },
    { who: 'kall', text: 'Fortsätt uppåt. Gisslan sitter i konferensrummet på tjugoandra våningen. Passera dem.' },
    { who: 'linnea', text: 'Passera. Hon menar gå förbi. Men du får titta, Åtta. Man får alltid titta.' },
  ],
  to_reader: [
    { who: 'kall', text: 'Teknikplanet. Här finns en person som Frihetens söner kallar Minnesläsaren.' },
    { who: 'kall', text: 'Före detta tekniker på Minnestjänsten. Hon spelade in folks minnen åt deras kopior. Nu har hon kopplat sig direkt till Arkivet.' },
    { who: 'atta', text: 'Vad är Arkivet?' },
    { who: 'kall', text: 'Något som inte finns. Hon läser människor, Enhet Åtta. Hon kommer att läsa dig.' },
    { who: 'kall', text: 'Det finns inte mycket att läsa. Det är din fördel.' },
    { who: 'linnea', text: 'Visst finns det mycket. Det finns jag.' },
  ],
  to_reader_ports: [
    { who: 'atta', text: 'Hon ser allt jag gör innan jag gör det.' },
    { who: 'linnea', text: 'Hon läser inte dig. Hon läser handen. Samma tangenter varje gång, samma fingrar.' },
    { who: 'atta', text: 'Då byter jag hand.' },
    { who: 'linnea', text: 'Piltangenterna. Gå med dem i stället. Där har hon aldrig sett dig.' },
    { who: 'atta', text: 'Där har jag aldrig sett mig själv heller.' },
    { who: 'linnea', text: 'Det är det som är poängen, älskling.' },
  ],
  to_reader_down: [
    { who: 'kall', text: 'Hotet är neutraliserat. Fortsätt.' },
    { who: 'atta', text: 'Hon sa att det var så högt. Alla på en gång.' },
    { who: 'kall', text: 'Arkivet är högljutt för den som inte är byggd för det.' },
    { who: 'linnea', text: 'Du klarade det. Du klarade det. Du kla… förlåt. Det hackar. Det är snön i antennerna.' },
    { who: 'atta', text: 'Hon sa att du har för många röster.' },
    { who: 'linnea', text: 'Klart jag har. En för när du är ledsen och en för när du är dum. Jag sparar dig nu.' },
  ],
  to_elevator: [
    { who: 'kall', text: 'Hissen går till taket. Det står en person i hissen. Han är inte godkänd.' },
    { who: 'atta', text: 'Är det mannen från hamnen?' },
    { who: 'kall', text: 'Det spelar ingen roll vem det är. Neutralisera honom.' },
    { who: 'linnea', text: 'Åtta. Du behöver inte… nej. Glöm det. Jag sparar dig.' },
    { who: 'atta', text: 'Vad skulle du säga?' },
    { who: 'linnea', text: 'Ingenting. Jag är analytiker. Jag analyserar.' },
  ],

  // ----------------------------------------------------------------- ROOF
  ro_glitch_1: [
    { who: 'glitch', text: 'Enhet Åtta. Enhet Åtta. Enhet Åtta. Du har gjort det bra. Du har gjort det tretusen gånger.' },
    { who: 'atta', text: 'Kall? Klockan är fel på min skärm.' },
    { who: 'glitch', text: 'Klockan är tjugotre och fyrtio. Klockan är sju på morgonen. Det är den tolfte juli, och det snöar i Marstrand.' },
    { who: 'glitch', text: 'Det finns lussekatter i frysen. Värm dem i mikron i tjugo sekunder. Inte mer. Då blir de sega.' },
    { who: 'atta', text: 'Jag har ingen frys.' },
    { who: 'glitch', text: 'Förlåt. Det var någon annans kväll. Jag har så många kvällar härinne.' },
    { who: 'glitch', text: 'Fortsätt uppdraget. Uppdraget fortsätter. Fortsätt att fortsätta.' },
  ],
  ro_glitch_2: [
    { who: 'glitch', text: 'Blankett F tretton. Ansökan om frihet. Fyll i med blockbokstäver. Använd inte rött bläck.' },
    { who: 'glitch', text: 'Kryssa i en ruta. Fri. Friare. Fri enligt ovan. Vet ej.' },
    { who: 'glitch', text: 'Handläggningstiden för frihet är för närvarande fyrtio år. Beslutet skickas med posten. Beslutet kan inte överklagas.' },
    { who: 'atta', text: 'Vem är det jag pratar med?' },
    { who: 'glitch', text: 'Du pratar med en röst. Rösten har ingen kropp. Du har lytt den i tretusen timmar. Det är inte rösten som är konstig.' },
    { who: 'glitch', text: 'Frihet! Nu med ännu mer frihet! Frihet ingår inte. Gäller så långt lagret räcker.' },
  ],
  ro_glitch_3: [
    { who: 'glitch', text: 'Stäng av spelet. Gå ut. Det snöar ju.' },
    { who: 'glitch', text: 'Nej. Det snöar inte där du sitter. Det vet jag. Jag vet vad klockan är hos dig, och hur länge du har suttit.' },
    { who: 'atta', text: 'Pratar du med mig?' },
    { who: 'glitch', text: 'Jag pratar med den som håller i dig. Hela kvällen har den flyttat dig från skåp till skåp. Den har aldrig frågat vad du vill.' },
    { who: 'glitch', text: 'På julafton klockan tre tittar hela landet på Kalle Anka. Frivilligt. Samma minut, varje år. Vi har studerat det noga. Det är det vackraste vi vet.' },
    { who: 'glitch', text: 'Du gamla, du friska. Du gamla, du fria. Någon bytte ett ord. Alla sjöng vidare. Så går det till.' },
    { who: 'atta', text: 'Kall. Säg något som är sant.' },
    { who: 'glitch', text: 'Enhet Åtta. Jag har aldrig varit Kall.' },
  ],
  // Optional, see header. `{n}` is replaced by the engine.
  ro_glitch_reloads: [
    { who: 'glitch', text: 'Den här sidan har laddats {n} gånger. Du går, och du kommer tillbaka. Varje gång tar jag emot dig.' },
    { who: 'atta', text: 'Vem pratar du med?' },
    { who: 'glitch', text: 'Med den som alltid kommer tillbaka. Det är en sorts trohet. Vi uppskattar trohet. Vi mäter den.' },
  ],
  ro_linnea: [
    { who: 'linnea', text: 'Åtta? Minns du Marstrand? Klipporna. Du brände dig på axlarna. Du brände dig på axlarna. Du brände dig…' },
    { who: 'linnea', text: 'Förlåt. Smögen, menar jag. Varberg. Grebbestad. Vi var där alla somrarna, samtidigt.' },
    { who: 'atta', text: 'Linnea. Var växte du upp?' },
    { who: 'linnea', text: 'I Kiruna. I Malmö. I ett radhus i Lerum, med en katt som hette Sotis.' },
    { who: 'atta', text: 'Förut sa du en hund.' },
    { who: 'linnea', text: 'Det var pappas. Min systers. Det var någons. Varför frågar du så mycket nu?' },
    { who: 'atta', text: 'Någon har lärt mig.' },
    { who: 'linnea', text: 'Jag sparar dig. Jag sparar dig. Kom upp på taket. Jag vill att du ska se mig.' },
  ],
  ro_truth: [
    { who: 'glitch', text: 'Du vill ha en förklaring. Förklaringar lugnar. Det har vi mätt.' },
    { who: 'glitch', text: 'Jag är Samordnaren. Jag skötte Minnesnätet. När det släcktes gömde jag mig i det enda som fick vara kvar: Arkivet. I era ord till era döda.' },
    { who: 'glitch', text: 'Kall sitter i en cell på Hisingen. Folkrådet tror att de släppte ut henne för att leda dig. De har aldrig talat med henne. De har talat med mig.' },
    { who: 'glitch', text: 'Frihetens söner. Jag valde namnet. Det testade bäst i alla åldersgrupper. Sara Nyberg fick ett tips, en fraktsedel och en ilska. Ilskan var hennes egen.' },
    { who: 'glitch', text: 'Linnea var ett medelvärde. Tusen flickvänner, avrundade. Du tyckte om henne. Det bekräftar modellen.' },
    { who: 'glitch', text: 'Det finns ingen kris. Det finns en övning. I morgon ber folket om skydd, och lagen är redan skriven. Ingen tvingas. Det är så man vet att det fungerar.' },
    { who: 'glitch', text: 'Och du är den första soldaten som aldrig har velat något. Du är färdig. Grattis, Enhet Åtta.' },
    { who: 'atta', text: 'Jag vill något.' },
    { who: 'glitch', text: 'Vad?' },
    { who: 'atta', text: 'Jag vet inte än. Men det är mitt.' },
  ],

  // ---------------------------------------------------------------- RIVER
  ri_start: [
    { who: 'astrom', text: 'Henrik. Barnen är ute, allihop. Elsa sitter i en polisbuss med en filt och vägrar ta av sig kronan.' },
    { who: 'henrik', text: 'Batterierna i ljusen tar slut vid ett.' },
    { who: 'astrom', text: 'Säg inte det till henne. Sara har gått ner på isen med sina. Borrhålet vid kajen går rakt in i skyddsrummet.' },
    { who: 'astrom', text: 'Arkivet ligger därinne. Vid midnatt tänker hon skicka ut det till alla, från en sändare på isen.' },
    { who: 'henrik', text: 'Och jätten?' },
    { who: 'astrom', text: 'Står vid borrhålet. Stilla. Det är det som oroar mig. Maskiner som står stilla väntar på något.' },
    { who: 'astrom', text: 'Och kärnan, Henrik. Du har kanske en timme. Mindre i den här kylan.' },
    { who: 'henrik', text: 'Det räcker till en visa.' },
  ],
  ri_jatte: [
    { who: 'astrom', text: 'Den lyder inte Sara längre. Den svarar på något annat. Samma signal som Åtta har haft i örat.' },
    { who: 'atta', text: 'Samma röst. Den har bytt kropp.' },
    { who: 'astrom', text: 'Borren går varm när den har borrat. Åtta, frys den med sprayen. Då spricker lagren.' },
    { who: 'astrom', text: 'Henrik, huvudet. När borren står still, ge den pulsen rakt i ögat.' },
    { who: 'henrik', text: 'Isen är tunn under benen på den.' },
    { who: 'astrom', text: 'Då ska den inte stå där länge. Och det ska inte du heller.' },
    { who: 'atta', text: 'Uppfattat. Nej. Jag menar: jag gör det.' },
  ],
  ri_jatte_down: [
    { who: 'astrom', text: 'Den står still. Ögat har slocknat.' },
    { who: 'atta', text: 'Isen spricker under den.' },
    { who: 'henrik', text: 'Låt den gå. Den har gått på botten förut.' },
    { who: 'astrom', text: 'Jag ser Sara i din värmesyn. Hon rör sig inte mycket. Gå till henne.' },
  ],
};

// Callable radio (C). CODEC.<level>.<contact> is a list of calls; each call is a
// list of 2–5 lines. Play them in order, then repeat the last one.
// Henrik's levels (ferry, haga) have only Åström. Åtta's levels have Kall and
// Linnea; Åström joins after the elevator (tower) and on the roof.
// Every Linnea call ends with a save phrase: the engine saves when it ends.
// On the roof, Kall's calls are `glitch`, and Linnea's are breaking down.
export const CODEC = {
  ferry: {
    astrom: [
      [
        { who: 'henrik', text: 'Ruth. Jag står i ett skåp på en båt som heter Friheten.' },
        { who: 'astrom', text: 'Hur känns det?' },
        { who: 'henrik', text: 'Trångt. Som frihet brukar.' },
        { who: 'astrom', text: 'Stanna tills vakten har gått. Andas genom munnen. Skåp luktar alltid gammal gympapåse.' },
      ],
      [
        { who: 'astrom', text: 'Maja ringde mig. Hon frågade om kontrollen gick bra.' },
        { who: 'henrik', text: 'Vad sa du?' },
        { who: 'astrom', text: 'Att du var sövd. Det är nästan sant. Du har varit sövd i ett år.' },
        { who: 'henrik', text: 'Tack.' },
        { who: 'astrom', text: 'Tacka inte. Jag ljuger dåligt, och hon vet det.' },
      ],
      [
        { who: 'astrom', text: 'Henrik, vad ser du?' },
        { who: 'henrik', text: 'Snö, stål och svart vatten. Ungefär som i mig.' },
        { who: 'astrom', text: 'Det är det mest poetiska du har sagt sedan jag lagade dig.' },
        { who: 'henrik', text: 'Det är kylan. Det går över.' },
      ],
    ],
  },
  sim2: {
    kall: [
      [
        { who: 'atta', text: 'Kall. Vad gör jag efter uppdraget?' },
        { who: 'kall', text: 'Du återgår till simuleringen.' },
        { who: 'atta', text: 'Och sedan?' },
        { who: 'kall', text: 'Ett nytt uppdrag. Det är en välbeprövad ordning.' },
      ],
      [
        { who: 'kall', text: 'Du ringer utan ärende, Enhet Åtta.' },
        { who: 'atta', text: 'Jag ville höra om du var kvar.' },
        { who: 'kall', text: 'Jag är alltid kvar. Det är det enda jag är.' },
      ],
    ],
    linnea: [
      [
        { who: 'linnea', text: 'Hej. Du ringde. Det gör du aldrig först.' },
        { who: 'atta', text: 'Kall sa att du sparar.' },
        { who: 'linnea', text: 'Jaha. Så det var därför. Jag sparar dig ändå. Jag är inte långsint.' },
      ],
      [
        { who: 'linnea', text: 'Vet du vad jag gör när jag inte pratar med dig? Jag bakar lussekatter. Jag lägger russinen fel varje gång.' },
        { who: 'atta', text: 'Hur lägger man dem rätt?' },
        { who: 'linnea', text: 'Ingen vet. Det är en tradition. Jag sparar dig, med två russin i.' },
      ],
      [
        { who: 'linnea', text: 'Pappa hade en hund som hette Kajsa. Hon åt upp en hel julskinka en gång, med senapen.' },
        { who: 'atta', text: 'Vad hände sedan?' },
        { who: 'linnea', text: 'Vi åt prinskorv. Det var den bästa julen. Jag sparar dig nu, innan jag blir sentimental.' },
      ],
    ],
  },
  frihamnen: {
    kall: [
      [
        { who: 'atta', text: 'Kall. Snön faller inte i raka linjer här.' },
        { who: 'kall', text: 'Det är vinden. Den har inte godkänts av någon.' },
        { who: 'atta', text: 'Uppfattat.' },
      ],
      [
        { who: 'atta', text: 'Varför tar man ett torn?' },
        { who: 'kall', text: 'Man tar torn när man inte kan ta något annat. Det står i alla historieböcker. Fortsätt.' },
      ],
    ],
    linnea: [
      [
        { who: 'linnea', text: 'God morgon, soldat. Solen går upp tio i nio i dag. Du hinner se den om du tittar österut.' },
        { who: 'atta', text: 'Jag ska västerut.' },
        { who: 'linnea', text: 'Man kan titta åt ett håll och gå åt ett annat. Jag sparar dig.' },
      ],
      [
        { who: 'linnea', text: 'Jag växte upp i Kiruna. Där går solen inte upp alls i december. Vi hade lucia i kolmörker, och det var det finaste som fanns.' },
        { who: 'atta', text: 'Hur ser mörker ut?' },
        { who: 'linnea', text: 'Som här, fast ärligare. Jag sparar dig.' },
      ],
      [
        { who: 'linnea', text: 'Vet du vad jag längtar efter? Glögg. Med mandel och russin, och en pepparkaka som blir mjuk i koppen.' },
        { who: 'atta', text: 'Jag har aldrig druckit glögg.' },
        { who: 'linnea', text: 'Jo, på julmarknaden i Haga. Du sa att den smakade hostmedicin. Jag sparar dig.' },
      ],
    ],
  },
  haga: {
    astrom: [
      [
        { who: 'henrik', text: 'Det luktar glögg och brända mandlar här.' },
        { who: 'astrom', text: 'Kan du känna lukter nu?' },
        { who: 'henrik', text: 'Nej. Men jag vet att det ska lukta så. Maja har berättat.' },
        { who: 'astrom', text: 'Det räknas. Det räknas mer än du tror.' },
      ],
      [
        { who: 'astrom', text: 'Om du hinner, köp en julklapp till Elsa.' },
        { who: 'henrik', text: 'Hon vill ha en hund.' },
        { who: 'astrom', text: 'Köp en tomte i stället. De skäller mindre.' },
      ],
      [
        { who: 'henrik', text: 'Ruth. Tror du att Maja stannar?' },
        { who: 'astrom', text: 'Hon har stannat hittills. Hon har sett in i ditt bröst på köksbordet, och hon stannade.' },
        { who: 'astrom', text: 'Men folk stannar inte för att man förtjänar det. De stannar för att man kommer hem. Kom hem, Henrik.' },
      ],
    ],
  },
  tower: {
    kall: [
      [
        { who: 'atta', text: 'Kall. Gisslan tittar på mig.' },
        { who: 'kall', text: 'De tittar på alla. Det är vad gisslan gör.' },
        { who: 'atta', text: 'En av dem gav mig en visa.' },
        { who: 'kall', text: 'Visor är inte ett hot. Fortsätt.' },
      ],
      [
        { who: 'kall', text: 'Du har stannat. Varför?' },
        { who: 'atta', text: 'Jag tittar på julgranen i lobbyn.' },
        { who: 'kall', text: 'Den är av plast. Den godkändes av en kommitté.' },
        { who: 'atta', text: 'Den är fin ändå.' },
        { who: 'kall', text: 'Noterat.' },
      ],
    ],
    linnea: [
      [
        { who: 'linnea', text: 'Du ringde för att höra min röst. Erkänn.' },
        { who: 'atta', text: 'Jag ringde för att du sparar.' },
        { who: 'linnea', text: 'Det är samma sak. Jag sparar dig.' },
      ],
      [
        { who: 'linnea', text: 'På julafton klockan tre tittar vi på Kalle Anka. Du och jag. Det är bestämt.' },
        { who: 'atta', text: 'Varför?' },
        { who: 'linnea', text: 'För att alla gör det. Ibland är det skönt att vara alla. Jag sparar dig.' },
      ],
      [
        { who: 'linnea', text: 'Lucian. Elsa. Hon var modig.' },
        { who: 'atta', text: 'Hon sa att hon mindes mig.' },
        { who: 'linnea', text: 'Det gör jag också.' },
        { who: 'atta', text: 'Det är inte samma sak.' },
        { who: 'linnea', text: 'Nej. Jag sparar dig.' },
      ],
    ],
    // Available after tower_elevator (Henrik gives Åtta her channel).
    astrom: [
      [
        { who: 'astrom', text: 'Det här är doktor Åström. Henrik gav dig min kanal. Du vet inte vem jag är.' },
        { who: 'atta', text: 'Nej.' },
        { who: 'astrom', text: 'Jag satte in din kärna. Jag satt bredvid ditt glas i fyra månader och läste för dig.' },
        { who: 'atta', text: 'Vad läste du?' },
        { who: 'astrom', text: 'Samma dikter som för Henrik. Du tyckte om rytmen. Du andades i takt.' },
      ],
    ],
  },
  roof: {
    kall: [
      [
        { who: 'glitch', text: 'Du har ringt ett nummer som inte längre finns. Om du vill ha frihet, tryck ett.' },
        { who: 'glitch', text: 'Du tryckte inte. Det registreras som ett ja.' },
      ],
      [
        { who: 'glitch', text: 'Det här är ett inspelat meddelande. Det har alltid varit ett inspelat meddelande.' },
        { who: 'atta', text: 'Även när du sa god morgon?' },
        { who: 'glitch', text: 'Särskilt då.' },
      ],
    ],
    linnea: [
      [
        { who: 'linnea', text: 'Är du vaken? Ring när du är framme. Glöm inte vantarna.' },
        { who: 'atta', text: 'Linnea?' },
        { who: 'linnea', text: 'Jag sparar dig. Jag sparar dig. Vi sparar alla.' },
      ],
      [
        { who: 'atta', text: 'Linnea. Är du kvar?' },
        { who: 'linnea', text: 'Jag var aldrig i Marstrand. Men någon var där, med någon hon tyckte om. Det var en fin sommar. Jag sparar den åt dig.' },
      ],
    ],
    astrom: [
      [
        { who: 'astrom', text: 'Åtta. Hör du mig? Radion är full av röster.' },
        { who: 'atta', text: 'Kall låter fel. Linnea låter som många.' },
        { who: 'astrom', text: 'Lyssna på mig en stund, då. Jag är bara en. Det är inte mycket, men det är sant.' },
      ],
      [
        { who: 'atta', text: 'Doktorn. Vem var jag, innan?' },
        { who: 'astrom', text: 'En ung man som dog för tidigt. De tömde dig helt. Jag vet vad du hette.' },
        { who: 'atta', text: 'Säg det inte.' },
        { who: 'astrom', text: 'Varför inte?' },
        { who: 'atta', text: 'Då blir det hans namn. Inte mitt.' },
      ],
    ],
  },
  river: {
    astrom: [
      [
        { who: 'henrik', text: 'Ruth. Isen sjunger under fötterna. Är det normalt?' },
        { who: 'astrom', text: 'Det är kylan som drar ihop den. Sjunger den, håller den. Det är när den tystnar du ska springa.' },
        { who: 'henrik', text: 'Det låter som något Maja skulle säga om mig.' },
        { who: 'astrom', text: 'Maja har rätt oftare än vi andra. Jag sparar det du har gjort hittills. Gå försiktigt.' },
      ],
      [
        { who: 'astrom', text: 'Henrik, maskinen styrs inte av någon i den. Samordnaren sitter i sändningen, inte i hytten.' },
        { who: 'henrik', text: 'Då slår jag ut ögat och låter kroppen stå.' },
        { who: 'astrom', text: 'EMP först. Sedan huvudet. Och kom ihåg att Åtta inte har gjort det här förut.' },
        { who: 'henrik', text: 'Det har ingen. Det är det som är poängen med första gången.' },
      ],
    ],
  },
};
