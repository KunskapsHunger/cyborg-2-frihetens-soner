# CYBÖRG II: FRIHETENS SÖNER — script format and requirements

The script is written as JavaScript data files in `src/story/`, which the game engine reads.
All in-game text is in Swedish; code comments are in English. Read `docs/DESIGN.md` first.
This sequel continues *CYBÖRG*, whose script is in `../cyborg/src/story/`. Read it for
continuity: Henrik's voice, how Elsa and Maja talk, the melody he gets wrong, Kall
(a woman, arrested by the Movement), Enhet Åtta asleep in the stairwell, and the ending.

## Tone and voice

- **Henrik**: noir inner monologue, short sentences, snow and the city as characters in
  the scene. He is a year older and has no memories from before the Tower, only what
  Maja tells him. He is dry, tender and tired. There is dark humour, but no parody.
- **Enhet Åtta**: young, flat, polite and literal, like a soldier who has only lived in a
  simulation. He answers "Uppfattat." He changes slowly: he starts asking questions, and
  at the end he chooses a name.
- **Kall / Samordnaren** (on Åtta's radio): cool and bureaucratic, as in CYBÖRG I. Says
  "Enhet Åtta". From chapter 6 the voice glitches: sentences repeat, time is wrong,
  it talks to the player ("Stäng av spelet. Gå ut. Det snöar ju."), the language
  switches to the style of an official form, and then it tells the truth in the
  voice of a machine. It should be unsettling and absurd, in the manner of MGS2's colonel.
- **Linnea**: warm, playful, talks about "our" summer in Marstrand, which never
  happened. She saves the game ("Jag sparar dig."). When she is exposed as a model,
  she speaks in a loop of phrases taken from thousands of real people's love letters in the Archive.
- **Sara Nyberg**: the Sons' leader. She is charismatic and wounded, sincere, and quotes Boye.
  She is not a villain: the revolution has eaten her.
- **Dr Ruth Åström**: Henrik's radio. Warm, guilty and practical.
- **Maja**: strong, tired, loving, with limits. **Elsa**: 9 years old, sharp, brave, and a lucia.
- **Minnesläsaren**: calm, intimate and terrifying. She reads "you": both Åtta and the
  player.
- **Vargen**: speaks little, like a hunter, with respect for her prey.
- **Guards** (the Sons): young idealists and hardened veterans; Göteborg slang in
  moderation. **Police** (Folkrådet): bureaucratic.

## Themes: rules

- **Karin Boye** is public domain and may be quoted verbatim. Check the exact wording with
  a web search first. Use *I rörelse* as the Sons' motto, *Kallocain* allusions (the Archive,
  transparency as coercion), and possibly more Boye poems that are verified PD.
- **Albert Camus** is **not** free: no quotes and no close paraphrase. Treat the theme
  (revolt versus revolution, measure, the absurd, the sun, the snow) through the story.
- **Baudrillard** is **not** free: no quotes. Treat the theme: the staged crisis, the
  model girlfriend, the news as a map that precedes the terrain.
- ***Du gamla, du fria*** (Dybeck 1844) and **Bellman's *Märk hur vår skugga*** are
  public domain and may be quoted.
- Åtta chooses the name **Movitz** in the epilogue, after Bellman, and Elsa gives it to him.
- If the player has killed, the ending differs: Sara dies on the ice.

## Files and schema

### `src/story/cutscenes.js`: in-engine cutscenes (new in the sequel)

Directions use named **actors** and simple **shot types**. The level supplies the
positions, so you write directing, not coordinates.

```js
export const CUTSCENES = {
  ferry_intro: {
    scene: 'ferry_deck',             // must be one of the SCENES below
    actors: ['henrik'],              // actors on stage (ids below)
    beats: [
      { shot: 'establish', hold: 3, sfx: 'ship_horn', text: null },
      { shot: 'close:henrik', line: { who: 'henrik', text: '…' } },
      { shot: 'two:henrik,sara', act: ['sara:walk:mark_a'], line: { who: 'sara', text: '…' } },
    ],
  },
};
```

- `shot`: `establish` (a wide overview of the scene), `wide`, `close:<actor>`,
  `medium:<actor>`, `two:<a>,<b>`, `ots:<a>><b>` (over <a>'s shoulder towards <b>),
  `low:<actor>` (a low angle, heroic or threatening), `high:<actor>` (from above, small
  and lonely), `track:<actor>` (the camera follows the actor walking), `insert:<prop>`
  (a close-up of a prop: `bomb`, `crown`, `archive`, `music_box`, `dogtag`, `drill`,
  `screen`), `pov:<actor>`.
- `act`: a list of stage actions, `<actor>:<verb>[:<arg>]`, with the verbs `walk:<mark>`,
  `run:<mark>`, `turn:<actor>`, `pose:<pose>`, `hide`, `show` and `fall`. The poses are
  `idle`, `crouch`, `sit`, `kneel`, `aim`, `hands_up`, `sing`, `hug`, `lie` and `dead`.
  The marks are `mark_a`…`mark_e`, which the level places.
- `line`: `{ who, text }`, one line per beat, at most about 110 characters. It is shown as
  a subtitle and voiced.
- `hold`: seconds without a line. By default, beats with lines last as long as the voice.
- `sfx`, `music`: names from `docs/ASSETS.md` (optional).
- A cutscene has 4–25 beats. Keep it tight. MGS2 is known for long scenes, but we
  keep them under about two minutes.
- The actor ids are `henrik`, `atta`, `sara`, `kall`, `astrom`, `maja`, `elsa`, `vargen`,
  `reader`, `guard1`, `guard2`, `police1` and `hostage1`–`hostage3`.

The scenes (stages the levels will provide) are `home` (Kålltorp kitchen and snowy
street), `ferry_deck`, `ferry_hold`, `sim2`, `frihamnen`, `haga_market`,
`haga_stairs`, `tower_lobby`, `tower_hostages`, `tower_elevator`, `tower_tech`,
`tower_roof`, `river_ice` and `church`.

Required cutscenes:

| id | when |
|---|---|
| `prolog_home` | the start of the game. Advent at home, the news, Elsa as lucia, Åström's call. |
| `ferry_intro` | the start of chapter 1 |
| `ferry_hold` | Henrik finds Järnjätten in the hold and photographs it |
| `ferry_vargen` | before the Vargen boss on deck |
| `ferry_sink` | after the boss: Sara appears on the deck, the ferry is scuttled, Henrik goes into the water |
| `sim2_intro` | Åtta wakes in VR. Kall and Linnea introduce themselves |
| `frihamnen_intro` | Åtta at dawn under Älvsborgsbron |
| `frihamnen_stranger` | the man in the coat (Henrik) helps from a distance, without saying who he is |
| `haga_intro` | Henrik in Haga; Maja at the market |
| `haga_maja` | Maja confronts Henrik; she learns that Elsa is in the tower |
| `tower_lobby` | Åtta enters the lobby of Karlatornet |
| `tower_hostages` | the hostages; Elsa in her lucia crown; Elsa is not afraid |
| `tower_reader` | before the Minnesläsaren boss |
| `tower_reader_down` | after the boss |
| `tower_elevator` | Henrik and Åtta meet in the elevator. "Vem är du?" "Någon som stod i en trappa." |
| `roof_glitch` | Kall's collapse begins |
| `roof_linnea` | Linnea turns out to be a model |
| `roof_sara` | Sara meets Åtta on the roof in the snowstorm. The Archive opens at midnight. |
| `river_intro` | Järnjätten wakes on the ice |
| `river_sara` | after the boss: Sara realises she has been played (two variants: `river_sara_live` and `river_sara_dies`) |
| `river_archive` | Henrik decides over the Archive |
| `epilog_church` | the lucia morning in Haga kyrka. Åtta gets the name Movitz. Credits after. |

### `src/story/comics.js`

The format is the same as in CYBÖRG I, with `ART` and `COMICS`. The scenes for `ART` are `home`,
`ferry`, `sim2`, `frihamnen`, `haga`, `tower`, `roof`, `river`, `church`, `city_snow` and `black`.
Portraits use the form `portrait:<name>`: `henrik`, `atta`, `sara`, `kall`, `astrom`,
`linnea`, `maja`, `elsa` or `reader`.

Required comics:
- `prolog`: 3 pages. A year after the Tower: what he remembers and what Maja told him.
- `interlude`: 2 pages, between the ferry and the simulation. Henrik under the ice, or so
  it seems; the switch to Åtta.
- `ending`: 3 pages.
- `ending_lethal`: 1 page, replacing the last one.

Keep the number of `ART` entries to about 30.

### `src/story/radio.js`

The format is the same as in CYBÖRG I. `who` can be `henrik`, `atta`, `kall`, `astrom`, `sara`,
`linnea` or `glitch` (Kall glitching). Each call has 3–10 lines of at most about 160 characters.

Required calls, grouped by chapter:
- **ferry** (Henrik ↔ Åström): `fe_start`, `fe_hold`, `fe_vargen`, `fe_vargen_down`
- **sim2**: `s2_intro`, `s2_locker`, `s2_box`, `s2_knock`, `s2_holdup`, `s2_scan`, `s2_end`
- **frihamnen**: `fh_start`, `fh_tracks` (the footprints), `fh_radio` (the guards'
  check-ins), `fh_stranger` (after the man in the coat), `fh_tunnel`
- **haga** (Henrik ↔ Åström): `ha_start`, `ha_found` (after the first scout), `ha_all`
- **tower**:
  - `to_start`, `to_bombs` (the freeze spray)
  - `to_bomb_last`
  - `to_reader` (Kall's warning), `to_reader_ports` (the tip to switch to the arrow keys: Linnea or Åtta works it out)
  - `to_reader_down`, `to_elevator`
- **roof**: `ro_glitch_1`, `ro_glitch_2`, `ro_glitch_3` (the absurd, fourth-wall calls from `glitch`), `ro_linnea`, `ro_truth` (Samordnaren explains, coldly)
- **river**: `ri_start` (Åström to Henrik), `ri_jatte`, `ri_jatte_down`

**Callable radio** (the player presses C): `CODEC` holds 1–3 short calls per
level and contact, with 2–5 lines each, chosen by id: `CODEC.<level>.<contact>`. The
contacts are `kall`, `linnea` and `astrom`, and the levels are `ferry`, `sim2`,
`frihamnen`, `haga`, `tower` and `roof`. Linnea's calls are also save calls: she
ends with a phrase about saving, and the engine saves. Put in humour and warmth, and
a Swedish Christmas: saffron buns, glögg, Kalle Anka on Christmas Eve, the snow.

### `src/story/lines.js`

The format is the same as in CYBÖRG I, with `LINES`, `BARKS`, `OBJECTIVES`, `GAME_OVER` and `TIPS`,
plus the new keys below.

- **`LINES`**: in-level subtitles. `henrik` and `atta` can be inner voices.
  - **ferry**: `fe_deck`, `fe_cars`, `fe_photo`
  - **frihamnen**: `fh_bridge`, `fh_tracks_seen`
  - **haga**, for the family chapter. Henrik hears Maja and people while he hunts the scouts:
    - `ha_walk_1`, `ha_walk_2`, `ha_walk_3`
    - `ha_scout_1`, `ha_scout_2`, `ha_scout_3`: each scout's private thought when scanned
    - `ha_done`
  - **tower**: `to_hostage_1`, `to_hostage_2`, `to_bomb_1`…`to_bomb_4`
  - **roof**: `ro_snow`
  - **river**: `ri_ice`
  - **epilog**: `ep_1`, `ep_2`
- **`BARKS`**: `sons` (the Sons' guards), `police`, `sons_radio` (check-ins: `call`,
  `answer`, `noanswer`) and `shield`. Each has the keys `idle`, `suspicious`,
  `alert`, `search`, `giveup`, `body`, `hit`, `tracks` (found footprints), `box`
  (sees a box moving), `knock` (hears a knock) and `holdup` (hands up, with pleading
  lines). Write 3–6 barks per key.
- **`THOUGHTS`**: 40 private thoughts that *lyssna in* reveals in random guards. The
  guards are ordinary people: Christmas presents, fear, a child, a debt, doubt about
  Sara, love, whether the revolution needs them. It is Kallocain's intimacy. Each
  is at most about 90 characters.
- **`DOGTAGS`**: 30 ID tags: `{ name, born, line }`. The name is a realistic Swedish
  name, `born` is a year (1990–2029) and `line` is one line about the person (at most
  about 80 characters).
- **`READER`**: Minnesläsaren's fourth-wall lines, as templates:
  - `intro`: 3–5 lines
  - `saw_tunnelbana`: shown if a save from *Tunnelbana 2033* exists, e.g. "Du har varit i tunnlarna under Stockholm. Du bar en lykta."
  - `saw_cyborg`: shown if a save from *CYBÖRG* exists, e.g. "Du har varit Enhet Sju. Du släckte ljuset i tusen vardagsrum."
  - `saw_nothing`
  - `reloads` (`{n}` is replaced with the number of page loads)
  - `predict`: when she dodges
  - `ports`: when the player switches to the arrow keys
  - `down`: when she falls
  - `late_night`, `morning`: chosen from the real clock
- **`OBJECTIVES`**: `ferry`, `sim2`, `frihamnen`, `haga`, `tower`, `roof` and `river`,
  each an array of steps.
- **`GAME_OVER`**: `default`, `seen_by_family`, `lost`, `bomb` and `hostage`. Each is a
  list of Boye quotes (verified) or original lines.
- **`TIPS`**: about 16 short tips for the loading screen.
- **`RANKS`**: 12 rank names (Swedish animals), each `{ name, line }`, from the best
  (e.g. "Lo") to the worst (e.g. "Sork").

## Quality control

Stay within the text lengths. Use only characters that exist in the bitmap font: å ä ö Å Ä Ö é è
– ’ “ ” … and ordinary ASCII punctuation.
