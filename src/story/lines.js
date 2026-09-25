// CYBÖRG II: FRIHETENS SÖNER — in-level subtitles, barks, thoughts, ID tags,
// Minnesläsaren's fourth-wall lines, objectives, game over texts, tips, ranks.
// Schema: docs/STORY_SCHEMA.md. Validate with: node tools/story/validate.mjs
//
// LINES: `henrik` and `atta` are inner voices (italic, no lip movement) unless
// they speak to someone in the scene. Other speakers are heard in the scene.
// `guard` in ha_scout_* is a scanned private thought (lyssna in), not speech.
// 1–12 lines per key, ≤ 90 chars each.
// Key bindings used in tutorial text: E use/choke/carry/shake down/freeze
// (hold), F knock, B box, R (hold) lyssna in, V radio, right mouse aim.

export const LINES = {
  // ---------------------------------------------------------------- FERRY
  fe_deck: [
    { who: 'henrik', text: 'Däcket är grönt under isen. Någon har målat om det varje vår i trettio år.' },
    { who: 'henrik', text: 'Snön ligger i drivor mot relingen. Mina spår syns som en bekännelse.' },
    { who: 'henrik', text: 'Livbåtarna är orange. Den enda färgen här ute.' },
  ],
  fe_cars: [
    { who: 'henrik', text: 'Bildäcket. Långtradare, en husbil, en gammal Volvo med en julgran på taket.' },
    { who: 'henrik', text: 'Någon ska hem till jul. Granen har fått ett eget spännband.' },
    { who: 'guard', text: 'Släpet längst in rör ingen. Sara sa det. Inte ens titta under presenningen.' },
    { who: 'guard', text: 'Vad är det för något, då?' },
    { who: 'guard', text: 'Historia, sa hon. Den väger fyrtio ton.' },
  ],
  fe_photo: [
    { who: 'henrik', text: 'En bild framifrån. Borren är lika lång som en spårvagn.' },
    { who: 'henrik', text: 'En bild av plåten. Någon har målat en röd knytnäve över NGAB 4.' },
    { who: 'henrik', text: 'En bild till. Man tar alltid en bild till.' },
  ],

  // ------------------------------------------------------------ FRIHAMNEN
  fh_bridge: [
    { who: 'atta', text: 'Det går bilar över bron. Folk på väg till jobbet, med lyset på.' },
    { who: 'atta', text: 'De vet inte om tornet. De har sett lucia på teve i morse.' },
    { who: 'atta', text: 'Jag vet något som de inte vet. Kall säger att det är bättre så.' },
  ],
  fh_tracks_seen: [
    { who: 'atta', text: 'Spår i snön. Stora. Den ena foten trycker djupare än den andra.' },
    { who: 'atta', text: 'Någon som är tyngre i ena sidan. Han går samma väg som jag, fast före.' },
  ],

  // ----------------------------------------------------------------- HAGA
  // Overheard while Henrik hunts the scouts.
  ha_walk_1: [
    { who: 'maja', text: 'Fyra lussekatter, tack.' },
    { who: 'civilian', text: 'Fyra? Är ni många hemma?' },
    { who: 'maja', text: 'Tre. Min dotter äter två. Min man äter en fast han inte behöver.' },
    { who: 'civilian', text: 'Varför gör han det, då?' },
    { who: 'maja', text: 'För att jag ska se honom äta. Det är bra för mig.' },
    { who: 'henrik', text: 'Jag har aldrig tänkt på det så. Det har hon.' },
  ],
  ha_walk_2: [
    { who: 'civilian', text: 'Såg du lucian på teve i morse? Så fina de var.' },
    { who: 'civilian', text: 'Samma lilla tjej tappade ljuset som i går. På exakt samma ställe.' },
    { who: 'civilian', text: 'Då är det väl en tradition nu.' },
    { who: 'civilian', text: 'Nej, jag menar exakt samma. Samma hand, samma ljus, samma fnissande.' },
    { who: 'henrik', text: 'Folk märker det. De tycker bara att det är gulligt.' },
  ],
  ha_walk_3: [
    { who: 'maja', text: 'Nej, de svarar inte. Fröken sa att de skulle vara klara vid tolv.' },
    { who: 'maja', text: 'Ursäkta. Kan ni laga en speldosa? Det fattas en tand i kammen.' },
    { who: 'civilian', text: 'Det kan jag. Men då låter den annorlunda. Då spelar den som den ska.' },
    { who: 'maja', text: 'Nej. Låt den vara som den är.' },
    { who: 'henrik', text: 'Hon bär den i väskan. Hon går omkring med den i väskan.' },
  ],
  // Private thoughts of the three scouts when scanned.
  ha_scout_1: [
    { who: 'guard', text: 'Röd kappa, grå mössa. Fyra lussekatter. Vem är den fjärde till?' },
    { who: 'guard', text: 'Det står inget om en man i papperen. Bara mamman och ungen.' },
  ],
  ha_scout_2: [
    { who: 'guard', text: 'Sara sa: går det åt skogen i kväll, ta henne över till Hisingen.' },
    { who: 'guard', text: 'Hon ska inte stå ensam i snön och vänta på ett barn som inte kommer.' },
  ],
  ha_scout_3: [
    { who: 'guard', text: 'Min lillasyster går i luciatåget. Ingen har sagt det till Sara.' },
    { who: 'guard', text: 'Jag vågar inte fråga om hon redan vet.' },
  ],
  ha_done: [
    { who: 'henrik', text: 'Tre. Unga, alla tre. En hade ett kort på sin lillasyster i fickan. I luciasärk.' },
    { who: 'henrik', text: 'Snön täcker dem redan. Om en timme vaknar de och fryser. Det är det bästa jag kan göra.' },
  ],

  // ---------------------------------------------------------------- TOWER
  // Heard while Åtta passes the hostages after tower_hostages.
  to_hostage_1: [
    { who: 'hostage', text: 'Är du polis?' },
    { who: 'atta', text: 'Nej.' },
    { who: 'hostage', text: 'Är du en robot?' },
    { who: 'atta', text: 'Delvis.' },
    { who: 'hostage', text: 'Vilken del?' },
    { who: 'atta', text: 'Jag vet inte än.' },
  ],
  to_hostage_2: [
    { who: 'hostage', text: 'Unge man. Säg till Folkrådet att jag röstade emot tornet. Det står i protokollet.' },
    { who: 'hostage', text: 'Säg också att jag borde ha röstat emot Arkivet. Det står inte i något protokoll.' },
  ],
  // One per frozen charge, in the order they are frozen.
  to_bomb_1: [
    { who: 'atta', text: 'Laddningen är frusen. På tejpen står det BRYT UPP, med tusch.' },
    { who: 'linnea', text: 'Poeter med sprängmedel. Pappa hade tyckt om dem. Nej. Han hade hatat dem.' },
  ],
  to_bomb_2: [
    { who: 'atta', text: 'Frusen. Någon har ritat en stjärna på tejpen. En sån man ritar när man är sju år.' },
  ],
  to_bomb_3: [
    { who: 'atta', text: 'Frusen. Det står ett namn på tejpen, och ett telefonnummer under.' },
    { who: 'linnea', text: 'Ring inte. Det är någon som ville bli hittad efteråt.' },
  ],
  to_bomb_4: [
    { who: 'atta', text: 'Frusen. På tejpen står det förlåt. Bara det.' },
  ],

  // ----------------------------------------------------------------- ROOF
  ro_snow: [
    { who: 'atta', text: 'Snön ligger orörd här uppe. Ingen har gått här före mig.' },
    { who: 'atta', text: 'Staden ligger nedanför med alla ljus tända. Den liknar simuleringen, fast varm.' },
  ],

  // ---------------------------------------------------------------- RIVER
  ri_ice: [
    { who: 'henrik', text: 'Isen sjunger under kängorna. Den håller. Den har inte bestämt sig för hur länge.' },
    { who: 'henrik', text: 'Pappa tog mig ut på isen en vinter. Jag föll igenom. Han drog upp mig i luvan.' },
    { who: 'henrik', text: 'Jag minns det inte. Han berättade det för Maja en jul. Nu är det mitt.' },
  ],

  // --------------------------------------------------------------- EPILOG
  // ep_1: Henrik and Maja walk up to Haga kyrka at dawn, before epilog_church.
  ep_1: [
    { who: 'henrik', text: 'Gryning i Haga. Snön har lagt sig över julmarknadens stånd. Ingen har sovit.' },
    { who: 'maja', text: 'Gå långsammare. Du har bara en höft.' },
    { who: 'henrik', text: 'Åström säger att den håller till påsk.' },
    { who: 'maja', text: 'Då går vi långsamt till påsk.' },
    { who: 'henrik', text: 'Kyrkklockan slår sju. Folk kommer med morgonrocken under kappan.' },
  ],
  // ep_2: after the credits, outside the church in the snow. Last lines of the game.
  ep_2: [
    { who: 'atta', text: 'Vad gör man nu?' },
    { who: 'henrik', text: 'Man går hem. Det är det svåra.' },
    { who: 'atta', text: 'Jag har inget hem.' },
    { who: 'henrik', text: 'Du har en trappa. Det är en början.' },
    { who: 'maja', text: 'Kom nu, båda två. Det drar.' },
    { who: 'elsa', text: 'Movitz får sitta bredvid mig.' },
    { who: 'henrik', text: 'Jag heter Henrik Sandell. Jag har dött två gånger. I dag går vi hem.' },
  ],
};

// Guard barks. `sons` = Frihetens söner, `police` = Folkrådet's police,
// `shield` = the Sons' reinforcement squads carrying captured Folkrådet
// shields. `sons_radio` = the three-minute check-ins.
export const BARKS = {
  sons: {
    idle: [
      'Tre timmar kvar till midnatt. Sen är vi fria. Eller häktade.',
      'Morsan tror att jag är på julbord med jobbet.',
      'Gött med lucia i alla fall. Ungarna sjöng fint innan allt började.',
      'Om nån frågar vad jag gjorde i revolutionen så stod jag här. Vid en pelare.',
      'Jag frös mer på Hisingen i fjol. Då var det också för friheten.',
    ],
    suspicious: [
      'Va? Hörru, vem där?',
      'Det rörde sig där borta.',
      'Var det du, Robban?',
      'Jag kollar. Det är säkert inget. Det är alltid inget.',
    ],
    alert: [
      'Där! En av statens!',
      'Kontakt! Han är härinne!',
      'Stå still, för fan!',
      'Larma! Larma alla!',
    ],
    search: [
      'Sprid ut er. Kolla skåpen.',
      'Han kan inte ha kommit långt i den här snön.',
      'Kom fram nu. Vi vill bara prata. Mest.',
      'Kolla bakom granen.',
    ],
    giveup: [
      'Ingenting. Jag skriver att det var vinden.',
      'Borta. Om han nu fanns.',
      'Tillbaka till posterna. Sara vill inte att vi springer runt.',
    ],
    body: [
      'Fan! Någon har slagit ner Micke!',
      'Han andas. Han andas i alla fall.',
      'Vi är inte ensamma härinne!',
    ],
    hit: [
      'Aj! Fan!',
      'Jag är träffad!',
      'Vad i helvete…',
    ],
    tracks: [
      'Spår. Färska. Nån har gått här nyss.',
      'Kängor. Inte våra. Följ dem.',
      'Titta. Spåren går mot kajen.',
    ],
    box: [
      'Har den där kartongen stått där hela tiden?',
      'Kartongen rörde sig. Jag svär. Den rörde sig.',
      'Rör den sig en gång till så skjuter jag den.',
      'Vem ställer en flyttkartong mitt i en revolution?',
    ],
    knock: [
      'Knackade det?',
      'Hallå? Är det nån i väggen?',
      'Det knackade. Jag hörde det. Jag kollar.',
    ],
    holdup: [
      'Okej, okej! Skjut inte!',
      'Jag har en mamma i Kortedala! Hon väntar på mig!',
      'Ta allt. Ta vantarna också. Skjut bara inte.',
      'Jag gick med för soppans skull. Ärligt. För soppan!',
    ],
  },
  police: {
    idle: [
      'Enligt instruktionen ska vi synas men inte störa.',
      'Julmarknaden har tillstånd till klockan nitton. Sen är det en annan fråga.',
      'Mitt pass slutar om fyrtio minuter. Min oro slutar aldrig.',
      'Har någon sett blanketten för hittegods? Någon har hittat en tomte.',
    ],
    suspicious: [
      'Ursäkta? Hallå där. Jag vill bara ställa en fråga.',
      'Det där ser ut som ett avvikande beteende.',
      'Jag noterar en rörelse. Jag noterar den noga.',
    ],
    alert: [
      'Stanna! Polis!',
      'Stå still! Ni är skyldig att legitimera er!',
      'Begär förstärkning! Enligt rutin!',
    ],
    search: [
      'Vi söker igenom området. Enligt rutin.',
      'Om ni gömmer er uppmanas ni att sluta med det.',
      'Kolla bakom stånden. Och under.',
    ],
    giveup: [
      'Inget att rapportera. Jag rapporterar det.',
      'Borta. Jag skriver det som ett ärende utan åtgärd.',
      'Återgår till synlig närvaro.',
    ],
    body: [
      'Kollega nere! Kollega nere!',
      'Han andas. Jag behöver ett ärendenummer.',
      'Någon har misshandlat en tjänsteman. Det här blir en anmälan.',
    ],
    hit: [
      'Aj! Det här är våld mot tjänsteman!',
      'Jag är träffad! Anteckna klockslaget!',
      'Fan! Förlåt. Aj!',
    ],
    tracks: [
      'Fotspår. Jag fotograferar dem för akten.',
      'Spår i snön. Storlek fyrtiofem, ungefär. Skriv ungefär.',
      'Någon har gått här utan tillstånd.',
    ],
    box: [
      'Den där kartongen saknar avsändare.',
      'En kartong som rör sig. Det finns ingen rutin för det.',
      'Kartongen ska bort. Den står i en utrymningsväg.',
    ],
    knock: [
      'Knackade någon? Vi har inga möten inbokade.',
      'Hallå? Det här är polisen. Ni får gärna knacka igen.',
      'Ett ljud. Jag undersöker ljudet.',
    ],
    holdup: [
      'Jag är statsanställd! Det här står inte i min tjänstebeskrivning!',
      'Ta mitt ID. Ta min penna. Jag har fler pennor.',
      'Jag har tre barn och en bostadsrätt i Mölndal!',
      'Okej. Okej. Jag gör inget motstånd. Det noteras.',
    ],
  },
  shield: {
    idle: [
      'Det står FOLKRÅDET på skölden. Känns fel att bära den.',
      'Tung som fan, den här.',
      'Håll formationen. Sköld mot sköld.',
    ],
    suspicious: [
      'Stopp. Sköldarna fram.',
      'Rörelse framåt. Täck.',
      'Håll linjen. Vi går tillsammans.',
    ],
    alert: [
      'Sköldlag, fram!',
      'Där är han! Tryck på!',
      'Stäng korridoren!',
    ],
    search: [
      'Rum för rum. Skölden först, sen huvudet.',
      'Ingen går ensam. Ingen.',
      'Han kan inte gå genom väggar. Leta.',
    ],
    giveup: [
      'Borta. Tillbaka i formation.',
      'Sänk skölden. Det är över. För den här gången.',
      'Vi har gått runt hela våningen två gånger nu.',
    ],
    body: [
      'Vi har en man nere! Täck honom!',
      'Dra in honom bakom sköldarna!',
      'Han lever. Täck!',
    ],
    hit: [
      'Det tog i skölden!',
      'Aj! Över kanten!',
      'Håll! Håll!',
    ],
    tracks: [
      'Spår. Följ dem, sköldarna först.',
      'Han har gått här. Formera er.',
      'Spåren är färska. Långsamt fram.',
    ],
    box: [
      'Kartongen. Knuffa till den med skölden.',
      'Vem har ställt en kartong här?',
      'Den rörde sig. Omringa kartongen.',
    ],
    knock: [
      'Knackning. Därifrån.',
      'Stopp. Någon knackade.',
      'Det kom från väggen. Sköldarna mot väggen.',
    ],
    holdup: [
      'Jag släpper skölden! Jag släpper den!',
      'Skölden är inte ens min! Den är Folkrådets!',
      'Okej. Det här var inte planen.',
    ],
  },
  sons_radio: {
    call: [
      'Tornet här. Rapportera, post tre.',
      'Kontroll. Alla poster, rapportera.',
      'Tornet till kajen. Hur ser det ut?',
      'Tidskontroll. Svara i tur och ordning.',
    ],
    answer: [
      'Post tre. Inget att rapportera. Det snöar.',
      'Kajen här. Lugnt. Kallt, men lugnt.',
      'Allt lugnt. Jag har slut på kaffe, om nån undrar.',
      'Här. Inget. Fortfarande inget.',
    ],
    noanswer: [
      'Post tre? Svara, post tre.',
      'Micke? Micke, svara. Det är inte roligt.',
      'Ingen svarar på trean. Skicka två man.',
      'Tystnad från kajen. Alla, var vaksamma.',
    ],
  },
};

// Private thoughts revealed by "lyssna in" in random guards (Kallocain's intimacy).
export const THOUGHTS = [
  'Jag har inte köpt en enda julklapp. Revolutionen tar all min tid.',
  'Öppnar vi Arkivet får mormor läsa allt jag sa till morfar. Det tänkte jag inte på.',
  'Lillebror tror att jag är en hjälte. Jag står i en korridor och fryser.',
  'Sara såg på mig i morse som om hon inte visste vem jag var. Det visste hon inte.',
  'Jag vill hem och äta skinka med senap och somna framför teven.',
  'Polisen vid hissarna gick i min klass på gymnasiet. Jag sa ingenting.',
  'Jag är skyldig kronofogden fyrtiotusen. Kanske räknas det inte i ett fritt land.',
  'Hon sa ja. Jag friade på färjan i går. Sen sänkte vi den.',
  'Vad gör man med en revolution när den har vunnit? Det har ingen sagt.',
  'Jag har en lucia hemma också. Hon är fyra. Hon ville inte att jag skulle gå.',
  'Jag är inte säker på att vi är de goda längre. I somras var jag säker.',
  'Pappa satt i SIM:s källare i två år. Därför är jag här. Bara därför.',
  'Jag skulle ha tagit långkalsongerna. Mamma sa det. Mamma har alltid rätt.',
  'Öppnas Arkivet får alla veta att jag grät för en hund i tre veckor.',
  'Jag tycker inte om maskinen på isen. Den tittar på en.',
  'Hur vet Sara allt det här? Vem är det som ger henne tipsen?',
  'Jag borde ringa Johanna. Jag vet inte vad jag skulle säga.',
  'Julmusiken i hissen går fortfarande. Ingen har stängt av den.',
  'Jag har inte sovit på trettiosex timmar. Jag ser saker i snön.',
  'Jag gick med för att de delade ut soppa. Och för att tjejen i luckan log.',
  'Farfar sjöng Du gamla du fria för mig. Nu sjunger vi den med vapen i händerna.',
  'Jag vill inte döda någon. Jag vill bara att någon ska lyssna.',
  'Tänk om vi har fel. Tänk om vi har fel och det är för sent.',
  'Barnen i konferensrummet sjöng för oss. Jag var tvungen att gå ut.',
  'Jag har en pepparkaka i fickan. Det är min lön för i dag.',
  'Mamma berättade allt för pappas kopia. Öppnas Arkivet får jag veta vad.',
  'Sara citerar dikter. Jag förstår hälften. Jag tycker om hur det låter.',
  'Jag fyller år i dag. Ingen vet. Det är bra så.',
  'Jag ångrar mig. Jag ångrar mig. Säg det inte till någon.',
  'Om jag dör i natt vill jag att någon ska veta att jag var snäll mot katter.',
  'Vem ska städa den här lobbyn efteråt? Det blir inte vi.',
  'Jag är så trött på att vara arg. Jag vet inte vad jag ska vara annars.',
  'Jag lovade Wilma att komma på luciafirandet på förskolan. Det var i morse.',
  'Folkrådet lovade också frihet. Alla lovar frihet. Ingen säger vad den kostar.',
  'Jag har kissat i en blomkruka på tolfte våningen. Förlåt, Karlatornet.',
  'Snön är så vacker från tjugonde våningen. Jag hade aldrig varit så högt upp.',
  'Om någon läser mina tankar just nu: hej. Jag är rädd.',
  'Det var en röst i radion i natt som inte var Saras. Den sa mitt namn.',
  'Jag har skrivit ett brev till min syster. Det ligger i skåpet, i jackfickan.',
  'Jag tror inte på något längre. Men jag vill inte gå hem ensam.',
];

// ID tags from held-up guards: { name, born, line }.
export const DOGTAGS = [
  { name: 'Mikael Strand', born: 2019, line: 'Kallas Micke. Svarar alltid sist på radion. Har aldrig missat ett pass.' },
  { name: 'Amira Haddad', born: 2022, line: 'Läste till barnmorska. Tog uppehåll för revolutionen. Tänker gå tillbaka.' },
  { name: 'Robin Karlsson', born: 2026, line: 'Yngst i sitt lag. Har en pepparkaka i bröstfickan.' },
  { name: 'Johanna Lind', born: 2012, line: 'Före detta busschaufför på linje 16. Kan varje hållplats utantill.' },
  { name: 'Erik Svensson', born: 1998, line: 'Svetsare på Eriksberg i trettio år. Sa upp sig samma dag som SIM föll.' },
  { name: 'Fatima Yusuf', born: 2020, line: 'Stickar medan hon väntar. Har stickat vantar åt halva sitt lag.' },
  { name: 'Oskar Nilsson', born: 2024, line: 'Friade på färjan natten före lucia. Hon sa ja.' },
  { name: 'Linda Berg', born: 2005, line: 'Polis i Folkrådets tjänst. Sökte jobbet för att ingen annan ville ha det.' },
  { name: 'Ahmad Karimi', born: 2017, line: 'Lärare i Angered. Läser Boye med sina elever. Visste inte att hon var en paroll.' },
  { name: 'Sofia Ek', born: 2023, line: 'Hennes lillasyster går i luciatåget. Hon har inte sagt det till någon.' },
  { name: 'Mattias Holm', born: 2001, line: 'Lastbilschaufför. Körde maskinen från Kiruna. Frågade aldrig vart den skulle.' },
  { name: 'Elin Johansson', born: 2021, line: 'Har en dotter på fyra. Lovade att komma på luciafirandet.' },
  { name: 'Kent Pettersson', born: 1992, line: 'Äldst i Frihetens söner. Säger att han var med redan i Rörelsen. Det var han.' },
  { name: 'Nora Abdi', born: 2027, line: 'Skriver dikter i marginalen på sina order. Rimmar ofta på frihet.' },
  { name: 'Tobias Lund', born: 2015, line: 'Arbetslös sedan Minnestjänsten stängde. Stängde av sin mammas kopia själv.' },
  { name: 'Maria Andersson', born: 1999, line: 'Polis i tjugotre år. Har aldrig dragit sitt vapen. Tänker inte börja nu.' },
  { name: 'Hampus Wikström', born: 2025, line: 'Kom för soppans skull. Stannade för att ingen skickade hem honom.' },
  { name: 'Leila Rostami', born: 2014, line: 'Ingenjör. Byggde laddningarna. Skrev förlåt på den sista.' },
  { name: 'Per-Olof Gustavsson', born: 1995, line: 'Vaktmästare i Karlatornet. Öppnade porten för Frihetens söner klockan sju.' },
  { name: 'Ida Magnusson', born: 2028, line: 'Nitton år. Har sin gamla luciakrona i ryggsäcken. Vet inte varför.' },
  { name: 'Anders Sjöberg', born: 2003, line: 'Sköter polisens blanketter. Har tre barn och en bostadsrätt i Mölndal.' },
  { name: 'Samira Ali', born: 2018, line: 'Sjuksköterska på Östra. Tar hand om de skadade på båda sidor.' },
  { name: 'Viktor Engström', born: 2010, line: 'Före detta soldat. Svor att aldrig bära vapen igen. Bär ett i natt.' },
  { name: 'Emma Hedlund', born: 2024, line: 'Konststudent. Målade affischerna. Tycker att knytnäven blev för stor.' },
  { name: 'Göran Lindqvist', born: 1990, line: 'Pensionerad tulltjänsteman. Såg att fraktsedeln var falsk. Sa ingenting.' },
  { name: 'Julia Bergström', born: 2026, line: 'Höjdrädd. Står vakt på tjugonde våningen. Tittar aldrig ut.' },
  { name: 'Kevin Åberg', born: 2021, line: 'Blåvitt i hjärtat. Sjunger nationalsången som en ramsa på läktaren.' },
  { name: 'Hanna Sundberg', born: 2016, line: 'Prickskytt. Kamraterna kallar henne Vargen. Hon tycker inte om namnet.' },
  { name: 'Yusuf Demir', born: 2019, line: 'Bagare. Bakade lussekatter åt hela laget i morse. Lade russinen rätt.' },
  { name: 'Björn Håkansson', born: 2000, line: 'Kustbevakare. Såg färjan sjunka. Anmälde det. Fick inget svar.' },
];

// Minnesläsaren's fourth-wall lines. The engine picks one line per key unless
// noted. `{n}` in `reloads` is replaced with the number of page loads.
// saw_tunnelbana / saw_cyborg: shown when a save from that game exists in
// localStorage (read locally only; nothing is sent anywhere).
export const READER = {
  intro: [
    'Hej. Ja, du. Inte han i dräkten. Du, som håller i honom.',
    'Du sitter framför en skärm. Rummet bakom dig är mörkare än du tror.',
    'Jag spelade in folk i sex år. Man hör när någon lyssnar på riktigt. Du gör det nu.',
    'Låt mig läsa dig. Det gör inte ont. Det gör aldrig ont medan det händer.',
  ],
  saw_tunnelbana: [
    'Du har varit i tunnlarna under Stockholm. Du bar en lykta och räknade stationerna.',
    'Jag ser räls och mörker i dig. En annan stad, en annan vinter. Du kom upp till slut.',
  ],
  saw_cyborg: [
    'Du har varit Enhet Sju. Du släckte ljuset i tusen vardagsrum. Minns du hur tyst det blev?',
    'Du har burit hans rock förut. Du stod i regnet i Frölunda och tittade upp mot ett fönster.',
  ],
  saw_nothing: [
    'Du har inte varit någon annanstans. Du är ny. Det är ovanligt nu för tiden. Det är fint.',
    'Inga spår. Du har kommit hit utan att ta med dig något. Eller så har du städat.',
  ],
  reloads: [
    'Du har börjat om {n} gånger. Varje gång trodde du att den här gången var den riktiga.',
    '{n} gånger har du laddat om. Du ger inte upp. Eller så vet du inte hur man slutar.',
  ],
  predict: [
    'Du tänkte gå åt vänster.',
    'Nu trycker du W. Nu. Ser du?',
    'Ditt pekfinger vilar alltid på samma tangent. Det är så trött.',
    'Du håller andan innan du skjuter. Jag hör det.',
    'Samma väg igen. Folk går alltid samma väg när de är rädda.',
  ],
  ports: [
    'Vad gjorde du nu? Du bytte hand.',
    'Jag hör inte dina fingrar längre. Det är tyst där du trycker.',
    'Det där är fusk. Det är också det första fria du har gjort i kväll.',
  ],
  down: [
    'Det blev tyst. Tack.',
    'Säg till honom att han var den tystaste jag har läst. Det är menat som en komplimang.',
  ],
  late_night: [
    'Klockan är mycket hos dig. Du borde sova. Men du sitter här, med mig.',
    'Det är mitt i natten där du är. Alla andra i huset sover. Jag hör bara dig.',
  ],
  morning: [
    'God morgon. Du började tidigt. Har du ätit frukost, eller är det här frukosten?',
    'Det är morgon hos dig. Snart kommer ljuset in genom fönstret. Det kommer in här också.',
  ],
};

export const OBJECTIVES = {
  ferry: [
    'Ta dig ombord och ner till bildäcket utan att bli sedd.',
    'Hitta lasten i lastrummet och fotografera den.',
    'Ta dig upp på det isiga däcket.',
    'Besegra prickskytten Vargen.',
    'Ta dig mot fören.',
  ],
  sim2: [
    'Göm dig i skåpet.',
    'Ta dig förbi vakten under kartongen.',
    'Knacka på väggen och locka bort vakten.',
    'Håll upp en vakt och ta hans ID-bricka.',
    'Lyssna in och hitta utgången.',
  ],
  frihamnen: [
    'Ta dig genom hamnen i gryningen.',
    'Lämna inga spår där vakterna går.',
    'Hitta tornets servicetunnel under kajen.',
  ],
  haga: [
    'Hitta Frihetens söners tre spanare med lyssna in.',
    'Oskadliggör spanarna utan att Maja ser dig.',
    'Gå till Maja vid trapporna upp mot Skansen Kronan.',
  ],
  tower: [
    'Ta dig från lobbyn upp till kontorsplanet.',
    'Frys de fyra sprängladdningarna på de bärande pelarna.',
    'Hitta gisslan i konferensrummet.',
    'Besegra Minnesläsaren på teknikplanet.',
    'Ta hissen mot taket.',
  ],
  roof: [
    'Ta dig över det snöiga taket.',
    'Hitta Linneas sändare.',
    'Hitta Sara Nyberg.',
  ],
  river: [
    'Ta dig ut på den frusna älven.',
    'Slå ut Järnjätten tillsammans med Åtta.',
    'Gå till Sara.',
    'Bestäm vad som ska hända med Arkivet.',
  ],
};

// Boye quotes are verified against Litteraturbanken (Ja visst gör det ont, 1935).
export const GAME_OVER = {
  default: [
    'Svårt att vilja stanna och vilja falla. – Karin Boye',
    'Ja visst gör det ont när knoppar brister. – Karin Boye',
    'Snön täckte spåren. Ingen letade.',
    'Uppdraget avslutades. Ett nytt skrivs redan.',
    'Signalen bröts. På teve sjunger lucian igen, från början.',
  ],
  seen_by_family: [
    'Maja såg dig. Spanarna såg henne se dig. Resten gick fort.',
    'Hon ropade ditt namn över julmarknaden. Nu vet alla att du finns.',
    'Maja vände sig om. Hon hann aldrig fråga varför du var blöt.',
  ],
  lost: [
    'Isen höll inte. Älven är svart i december, och den har tagit dig förut.',
    'Kärnan slutade slå. Klockan i det tomma huset stannade.',
    'Höljet var ju knoppen hela vintern. – Karin Boye',
  ],
  bomb: [
    'Laddningen gick av. Tornet stod kvar, men inte alla som var i det.',
    'Det blev ljust en sekund. Sen blev det mycket tyst.',
    'Ont för det som växer och det som stänger. – Karin Boye',
  ],
  hostage: [
    'Gisslan kom till skada. Det var just det du var där för att hindra.',
    'Någon i konferensrummet slutade sjunga.',
    'Folkrådet kallar det en förlust. Det är vad en förlust betyder.',
  ],
};

export const TIPS = [
  'Snö lämnar spår, och vakterna följer dem. Nysnö och snöbyar täcker spåren efter en stund.',
  'Gå in i ett skåp med E. Knacka inifrån med F för att locka en vakt närmare.',
  'Ställ dig mot en vägg och tryck F för att knacka. Vakten kommer ensam för att se efter.',
  'B tar fram kartongen. En kartong som står still bryr sig ingen om. En som går är misstänkt.',
  'Sikta på en vakt bakifrån med höger musknapp, så räcker han upp händerna. Skaka honom med E.',
  'Håll R för att lyssna in. Du ser vakternas vägar och läser en tanke. Det kostar kärnenergi.',
  'Vakterna rapporterar var tredje minut. Slå inte ner någon precis innan han ska svara.',
  'Andedräkten syns i kylan. I värmesyn avslöjar den dig.',
  'Skjut sönder lampor. I mörker ser vakterna sämre.',
  'Snöbyar kortar vakternas sikt. Rör dig när det blåser som mest.',
  'Ring med V. Linnea sparar spelet när samtalet är slut.',
  'Håll E vid en sprängladdning för att frysa den med sprayen. Minikartan visar var de sitter.',
  'Hela spelet går att klara utan att döda. Slutet minns vad du valde.',
  'Vid larm kommer förstärkning med sköldar. Göm dig hellre än att slåss.',
  'Samla ID-brickor. Varje bricka är en människa med ett namn.',
  'Om någon verkar veta vad du ska göra innan du gör det: gör det på ett annat sätt.',
];

// Rank at the end, best first.
export const RANKS = [
  { name: 'Lo', line: 'Ingen såg dig. Ingen dog. Snön täckte spåren innan du var borta.' },
  { name: 'Uv', line: 'Du såg allt i mörkret och sa ingenting. Det räckte.' },
  { name: 'Räv', line: 'Listig och nästan osynlig. Några sköldar blev nervösa.' },
  { name: 'Varg', line: 'Du jagade i flock med snöstormen. Ett par larm hördes i natten.' },
  { name: 'Korp', line: 'Du märkte allt och glömde ingenting. Det skramlar av brickor i fickan.' },
  { name: 'Mård', line: 'Snabb och tyst mellan taken. Du lämnade några spår för mycket.' },
  { name: 'Järv', line: 'Envis och seg. Du gav dig aldrig, och det hördes.' },
  { name: 'Älg', line: 'Stor, stark och synlig från andra sidan älven. Men du kom fram.' },
  { name: 'Grävling', line: 'Du grävde dig igenom. Det var inte vackert, men det höll.' },
  { name: 'Hare', line: 'Du sprang mer än du smög. Snön minns varenda steg.' },
  { name: 'Kråka', line: 'Högljudd och alltid sedd. Du sparade ofta. Det var klokt.' },
  { name: 'Sork', line: 'Du överlevde. Det är inte ingenting. Men snön har aldrig sett så många spår.' },
];
