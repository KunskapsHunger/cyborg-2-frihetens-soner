import home from './home.js';
import ferry from './ferry.js';
import sim2 from './sim2.js';
import frihamnen from './frihamnen.js';
import haga from './haga.js';
import tower from './tower.js';
import roof from './roof.js';
import river from './river.js';
import church from './church.js';

export const LEVELS = { home, ferry, sim2, frihamnen, haga, tower, roof, river, church };

// Chapter order: the comic (if any) plays before the level loads; each
// level's script opens with its own in-engine cutscene.
export const CHAPTERS = [
  { id: 'home', level: 'home', title: 'PROLOG. ADVENT', comic: 'prolog' },
  { id: 'ferry', level: 'ferry', title: 'I. FÄRJAN' },
  { id: 'sim2', level: 'sim2', title: 'II. SIMULERINGEN', comic: 'interlude' },
  { id: 'frihamnen', level: 'frihamnen', title: 'III. FRIHAMNEN' },
  { id: 'haga', level: 'haga', title: 'IV. HAGA' },
  { id: 'tower', level: 'tower', title: 'V. KARLATORNET' },
  { id: 'roof', level: 'roof', title: 'VI. GLITCHEN' },
  { id: 'river', level: 'river', title: 'VII. ÄLVEN' },
  { id: 'church', level: 'church', title: 'EPILOG. LUCIA' },
];
