import { Lockers } from './lockers.js';
import { Box } from './box.js';
import { Holdup } from './holdup.js';
import { Scan } from './scan.js';
import { RadioCheck } from './radioCheck.js';
import { Bombs } from './bombs.js';
import { Lamps } from './lamps.js';
import { Glitch } from './glitch.js';
import { Breath } from './breath.js';

// Gameplay systems added in the sequel. Each may implement:
//   load(game, world)   after the level's actors spawned (may be async)
//   clear(game)         when the level unloads
//   update(game, dt)    every play frame
//   interactions(game)  → [{ label, action, priority }] candidates for E
//   onPhase(phase)      alarm phase changes
// The game exposes the named instances as game.sys.<name>.

export function createSystems() {
  return {
    lockers: new Lockers(),
    box: new Box(),
    holdup: new Holdup(),
    scan: new Scan(),
    radioCheck: new RadioCheck(),
    bombs: new Bombs(),
    lamps: new Lamps(),
    glitch: new Glitch(),
    breath: new Breath(),
  };
}
