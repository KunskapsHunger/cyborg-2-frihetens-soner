// CYBÖRG II: FRIHETENS SÖNER — comic pages (Max Payne-style, homage to CYBÖRG I).
// Schema: docs/STORY_SCHEMA.md. All player-facing text is Swedish and must only
// use glyphs present in src/engine/bitmapFont.js.
// Validate with: node tools/story/validate.mjs
//
// Order in the game: `prolog` before CUTSCENES.prolog_home; `interlude` between
// ferry_sink and sim2_intro; `ending` after river_archive and before
// epilog_church (the last page of `ending` is Sara's page; `ending_lethal`
// replaces it when the player has killed).
// Narration is voiced by Henrik (narrator voice). Page 2 of `interlude` is told
// by Henrik about Åtta, as something Åtta told him later, in the church.

// Every unique image used by the panels. `desc` is a staging note for the
// scene builder (camera, subject, light, figures, action). Model names from
// docs/ASSETS.md in parentheses.
export const ART = {
  // --- Prolog: a year after the Tower ---
  city_advent: {
    scene: 'city_snow',
    desc: 'Hög totalbild över Göteborg en snönatt i advent: älven svart med isflak, natriumorange gatlyktor i snödiset, adventsstjärnor (advent_star) i tusen fönster. Det gamla SIM-tornet mörkt vid älven. Längre bort Karlatornet (karlatornet), nästan färdigt, med en röd lampa (beacon) i toppen.',
  },
  henrik_window: {
    scene: 'home',
    desc: 'Henrik (henrik2) vid köksfönstret i Kålltorp om natten, sedd utifrån genom rutan där snön faller. Hans spegelbild i glaset: den mänskliga halvan varm i lampljuset, stålhalvan kall. En adventsstjärna hänger bredvid hans huvud.',
  },
  maja_table: {
    scene: 'home',
    desc: 'Köksbordet i Kålltorp, varmt lampljus, vaxduk med julmönster. Maja (maja2) i stickad tröja med händerna runt en kaffekopp, berättar. Henrik sitter mittemot, lyssnar, för stor för stolen. Ett fotoalbum ligger stängt mellan dem.',
  },
  folkradet_poster: {
    scene: 'city_snow',
    desc: 'Halvtotal på en snöig husvägg vid en spårvagnshållplats: en ny affisch (poster_folkradet) FOLKRÅDET – TRYGGHET ÄR FRIHET, klistrad över kanten på en gammal, halvt bortriven SIM-affisch i turkost. Snö i skarvarna. En förbipasserande i mössa, oskarp.',
  },
  sara_stamp: {
    scene: 'home',
    desc: 'Extrem närbild: ett julkort på hallmattan bland snöslask från skorna. Frimärket föreställer Sara Nyberg (sara2) i profil med röd armbindel. Kortet är adresserat till någon annan i huset. Kallt ljus från trapphuset.',
  },
  karlatornet_rise: {
    scene: 'city_snow',
    desc: 'Grodperspektiv från Lindholmens kaj i skymning och snöfall: Karlatornet (karlatornet) reser sig, glas och stål, orimligt högt, beacon röd i toppen. Till vänster, lägre och mörkt, det gamla SIM-tornet. En byggkran vid foten.',
  },
  astrom_kitchen: {
    scene: 'home',
    desc: 'Köket om natten: Henrik halvt liggande på köksbordet med skjortan öppen, en lucka i bröstet, kärnan glöder svagt orange. Åström (astrom) lutad över honom med lödpenna och pannlampa. Maja står och håller en skrivbordslampa riktad mot hans bröst, ansiktet stilla. Elsas teckningar på kylskåpet i bakgrunden.',
  },
  elsa_words: {
    scene: 'home',
    desc: 'Elsas rum, nattlampa formad som en måne. Elsa (elsa2, pyjamas) sitter i sängen med speldosan (music_box) i knät och håller upp ett papper med handskriven text. Henrik sitter på golvet bredvid sängen, lyssnar med huvudet mot sängkanten. Snö mot fönstret.',
  },

  // --- Interlude: under the water, the switch to Åtta ---
  ferry_sinking: {
    scene: 'ferry',
    desc: 'Natt, snöstorm vid fjordmynningen, Älvsborgsbrons ljus avlägset: färjan M/S FRIHETEN lutar kraftigt med alla fönster tända, aktern redan under vatten. Livbåtar (lifeboat) hänger snett i sina dävertar. Svarta vågor, snö som piskar vågrätt.',
  },
  under_water: {
    scene: 'ferry',
    desc: 'Under vattnet, grönsvart som flaskglas: henrik sjunker på rygg med armarna ut, rocken som ett segel. Kärnan i bröstet ett svagt orange sken. Snö och bubblor rör sig uppåt. Högt ovanför ett grumligt, ljust fält av färjans lanternor.',
  },
  jatte_riverbed: {
    scene: 'river',
    desc: 'Älvens botten i mörker: Järnjätten (jarnjatten), elva meter hög, går på fyra ben genom slam och sjunkna bildäck, bort från kameran mot stadens ljus som anas genom vattnet ovanför. Huvudets öga (eye) en tunn gul strimma. Henrik liten och sjunkande i förgrunden, i silhuett.',
  },
  sim2_pod: {
    scene: 'sim2',
    desc: 'Närbild ovanifrån genom immigt glas: Åtta (atta) ligger i en glaskista, ungt blekt ansikte, cyanfärgade sömmar vid tinningarna. Ögonen har precis öppnats och ser rakt upp i kameran. Kablar i nacken. Kallt turkost ljus.',
  },
  sim2_grid: {
    scene: 'sim2',
    desc: 'Totalbild från hög vinkel: Göteborg som cyan trådmodell på svart, med ett trådmodells-Karlatornet i mitten. Snön faller i perfekt raka, parallella linjer. Åtta står liten och ensam på ett rutnätstorg. Inga fåglar, inga människor.',
  },

  // --- Ending ---
  windows_dawn: {
    scene: 'city_snow',
    desc: 'Totalbild över staden från Ramberget strax före gryning, snön har slutat. Köksfönster tänds ett efter ett i husraderna, som ljus i en adventsljusstake. Karlatornet mörkt vid älven. Blå timmen, isflak på älven.',
  },
  envelope_kitchen: {
    scene: 'home',
    desc: 'Ett okänt kök klockan fyra på natten: en äldre man i morgonrock vid köksbordet läser på en surfplatta, handen för munnen. Ett ensamt stearinljus, en adventsstjärna i fönstret. Sett från dörröppningen, diskret.',
  },
  jatte_ice: {
    scene: 'river',
    desc: 'Gryning på den frusna älven: Järnjätten (jarnjatten) ligger raserad, halvt genom isen, borren (drill) stilla, snö som lägger sig på plåten. Åtta sitter på isen bredvid den med armarna runt knäna och tittar mot staden. Rosa och blå morgonhimmel.',
  },
  news_screen: {
    scene: 'city_snow',
    desc: 'Ett skyltfönster i snön med en rad teveapparater som alla visar samma bild: Karlatornet och en textremsa med ordet ÖVNING. Människor i vinterkläder går förbi utan att titta. En av dem skrattar.',
  },
  kall_cell: {
    scene: 'city_snow',
    desc: 'En fängelsecell på Hisingen i gryningsljus genom ett gallerfönster med snö på blecket: Kall (kall), grått page-hår, fängelsetröja, rak i ryggen vid en fastskruvad bordsskiva, skriver med blyerts på ett linjerat papper. En liten radio bredvid henne.',
  },
  maja_envelope: {
    scene: 'home',
    desc: 'Närbild: en köksutdragslåda, halvöppen. Bland ljusstumpar, gummisnoddar och ett batteri ligger ett oöppnat brunt kuvert med tryckt text: SANDELL, HENRIK. Majas hand vilar på lådans kant utan att ta upp det.',
  },
  sara_cell: {
    scene: 'city_snow',
    desc: 'Ett häkte i kvällsljus: Sara (sara2) sitter på britsen med en sliten diktbok i knät och läser högt. Utanför gallret sitter en ung vakt på en stol, vänd mot henne, med mössan i händerna. Snö utanför det höga fönstret.',
  },
  sara_visit: {
    scene: 'city_snow',
    desc: 'Besöksrum, pansarglas emellan: Henrik på ena sidan med handen på glaset, Sara på den andra. Deras spegelbilder överlappar i glaset. Kallt lysrörsljus, snö som faller utanför en ruta bakom dem.',
  },
  sara_grave: {
    scene: 'city_snow',
    desc: 'Östra kyrkogården i snöfall, grått dagsljus: en nygrävd grav två stenar från GÖSTA SANDELL. Henrik och Åtta sänker en enkel kista i rep, en i varje ände. Ingen annan där. Svarta träd, snö på gravstenarna.',
  },
  grave_snow: {
    scene: 'city_snow',
    desc: 'Närbild av en ny, enkel gravsten med texten SARA NYBERG 2011-2047, snö som lägger sig i bokstäverna. Vid foten en röd armbindel, vikt, och en liten ljuslykta som brinner.',
  },
};

export const COMICS = {
  // ---------------------------------------------------------------- PROLOG
  prolog: [
    { panels: [
      { art: 'city_advent', size: 'wide', narration: 'Det har gått ett år sedan Tornet. Snön kom natten till första advent och föll på kranar och gravar lika. Den frågar ingen.' },
      { art: 'henrik_window', size: 'tall', narration: 'Jag minns en kran i regn. En doktor som sa att det gör ont. En visa med ett hål i. Det är allt jag har från förut.' },
      { art: 'maja_table', size: 'wide', narration: 'Resten berättar Maja. En sak i taget, vid köksbordet, som man matar någon som har varit sjuk länge.' },
      { art: 'portrait:maja', size: 'half', speech: [{ who: 'maja', text: 'Vi gifte oss i Masthuggskyrkan. Det ösregnade. Du svor i sakristian.' }] },
      { art: 'portrait:henrik', size: 'half', speech: [{ who: 'henrik', text: 'Vad svor jag över?' }, { who: 'maja', text: 'Slipsen. Du har aldrig kunnat knyta en slips.' }] },
    ] },
    { panels: [
      { art: 'folkradet_poster', size: 'wide', narration: 'Rörelsen blev Folkrådet. De nya affischerna säger att trygghet är frihet. De gamla sa att frihet var trygghet. Samma tryckeri.' },
      { art: 'sara_stamp', size: 'half', narration: 'Sara Nyberg sitter på vartenda julkort i stan. Mig har hon inte ringt på ett år.' },
      { art: 'karlatornet_rise', size: 'half', narration: 'Vid älven har de byggt ett nytt torn, högre än det gamla. Folkrådet flyttar in på lucia.' },
      { art: 'black', size: 'wide', narration: 'Det gamla tornet står mörkt bredvid, som en tand som ingen har orkat dra ut. Det viskas om ett arkiv. Folkrådet säger att det inte finns.' },
    ] },
    { panels: [
      { art: 'astrom_kitchen', size: 'wide', narration: 'På torsdagar kommer doktor Åström med en verktygslåda. Hon öppnar mitt bröst på köksbordet. Maja håller lampan och tittar inte bort.' },
      { art: 'portrait:astrom', size: 'third', speech: [{ who: 'astrom', text: 'Kärnan åldras, Henrik. Fortare än du.' }] },
      { art: 'portrait:henrik', size: 'third', speech: [{ who: 'henrik', text: 'Någon av oss måste.' }] },
      { art: 'black', size: 'third', narration: 'I oktober tappade jag en hel tisdag. Maja märkte det före mig. Hon skrev upp den åt mig.' },
      { art: 'elsa_words', size: 'wide', narration: 'Elsa har lärt mig orden till pappas visa. Jag kan alla verserna nu. Melodin hoppar ändå över samma ton. Hon säger att det är så den går.' },
    ] },
  ],

  // ------------------------------------------------------------- INTERLUDE
  // Between ferry_sink and sim2_intro.
  interlude: [
    { panels: [
      { art: 'ferry_sinking', size: 'wide', narration: 'Friheten gick ner med alla ljus tända, som en julgran som någon har vält i snön.' },
      { art: 'under_water', size: 'tall', narration: 'Andra gången är vattnet inte svart. Det är grönt, som gammalt flaskglas, och snön faller åt fel håll.' },
      { art: 'jatte_riverbed', size: 'wide', narration: 'Något stort gick förbi mig därnere. Det gick på botten, mot staden, som ett djur som vet vägen hem.' },
      { art: 'black', size: 'third', narration: 'Kärnan i bröstet slog som en klocka i ett tomt hus. Sen hördes den inte mer.' },
    ] },
    { panels: [
      { art: 'sim2_pod', size: 'wide', narration: 'I en annan kista, i ett annat mörker, slog en pojke upp ögonen. Han berättade det för mig långt senare, i en kyrka.' },
      { art: 'portrait:kall', size: 'third', speech: [{ who: 'kall', text: 'God morgon, Enhet Åtta.' }] },
      { art: 'portrait:atta', size: 'third', speech: [{ who: 'atta', text: 'God morgon.' }] },
      { art: 'sim2_grid', size: 'wide', narration: 'Han hade vaknat tretusen gånger. Varje gång samma stad, samma snö i raka linjer, och ingen som väntade på honom.' },
      { art: 'portrait:linnea', size: 'third', speech: [{ who: 'linnea', text: 'Hej du. Det är jag. Du har sovit med munnen öppen igen.' }] },
    ] },
  ],

  // ---------------------------------------------------------------- ENDING
  // After river_archive, before epilog_church.
  ending: [
    { panels: [
      { art: 'windows_dawn', size: 'wide', narration: 'Arkivet gick hem hela natten. Ett kuvert i taget, till den som en gång hade sagt orden.' },
      { art: 'envelope_kitchen', size: 'half', narration: 'Vid fyra tändes köksfönster över hela stan. Folk satt i morgonrock och läste vad de hade sagt till sina döda.' },
      { art: 'black', size: 'half', narration: 'De flesta hade sagt förlåt. Några hade sagt var nycklarna låg. Ingen fick läsa någon annans. Det var hela idén.' },
      { art: 'jatte_ice', size: 'wide', narration: 'Åtta satt kvar på isen bredvid jätten tills det ljusnade. Han väntade på en order. Den kom aldrig. Han såg ut att tycka om det.' },
    ] },
    { panels: [
      { art: 'news_screen', size: 'wide', narration: 'På morgonen sa nyheterna att allt hade varit en övning. För en gångs skull sa de sanningen. Ingen trodde på dem.' },
      { art: 'kall_cell', size: 'half', narration: 'Kall skrev till mig från sin cell på Hisingen. Fyra rader, med blyerts. Den första raden var mitt namn.' },
      { art: 'portrait:kall', size: 'half', speech: [{ who: 'kall', text: 'Henrik. Rösten var inte min. Men den lärde sig tala av mig. Det ska jag bära, inte du.' }] },
      { art: 'maja_envelope', size: 'wide', narration: 'Mitt eget kuvert gick till Maja. Hon har inte öppnat det. Hon säger att hon tar en sak i taget, som förut.' },
      { art: 'portrait:astrom', size: 'third', speech: [{ who: 'astrom', text: 'Sitt still. Jag gråter inte. Det är lödröken.' }] },
    ] },
    // Sara lives. Replaced by `ending_lethal` when the player has killed.
    { panels: [
      { art: 'sara_cell', size: 'wide', narration: 'Sara sitter i häktet och väntar på sin rättegång. Om kvällarna läser hon Boye högt för vakterna. De har slutat be henne vara tyst.' },
      { art: 'portrait:sara', size: 'half', speech: [{ who: 'sara', text: 'Jag fick tillbaka mitt kuvert. Det var mest sånt jag sa till min brors kopia.' }] },
      { art: 'portrait:henrik', size: 'half', speech: [{ who: 'henrik', text: 'Har du läst det?' }, { who: 'sara', text: 'En sida. Resten får vänta. Jag har gott om tid nu.' }] },
      { art: 'sara_visit', size: 'wide', narration: 'När jag gick sa hon första raden, som ett lösenord. Jag svarade med nästa. Vägen, inte målet. Det var hon som lärde mig det, två gånger.' },
    ] },
  ],

  // Replaces the last page of `ending` when the player has killed people.
  ending_lethal: [
    { panels: [
      { art: 'sara_grave', size: 'wide', narration: 'Vi begravde Sara på Östra kyrkogården, två stenar från pappa. Åtta bar ena änden av kistan. Han frågade inte varför.' },
      { art: 'portrait:henrik', size: 'half', speech: [{ who: 'henrik', text: 'Därföre, Movitz, kom hjälp mig och välv gravsten över vår syster.' }] },
      { art: 'portrait:atta', size: 'half', speech: [{ who: 'atta', text: 'Movitz är han som hjälper till att bära. Elsa sa det.' }] },
      { art: 'grave_snow', size: 'wide', narration: 'Visans sista vers slutar med att vi är törstiga alla. Sara hade gjort en paroll av det. Jag låter det vara en visa.' },
      { art: 'black', size: 'wide', narration: 'Maja håller min kalla hand ändå. Den har gjort saker i vinter som ingen visa lagar. Hon vet det. Hon släpper inte.' },
    ] },
  ],
};
