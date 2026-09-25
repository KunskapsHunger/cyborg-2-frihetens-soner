import { Game } from './game/game.js';

const game = new Game(document.getElementById('gl'), document.getElementById('hud'), document.getElementById('comic'));
game.start();

// ?chapter=<id> skips straight into a chapter (no comic) for testing.
const params = new URLSearchParams(location.search);
const chapter = params.get('chapter');
// ?nocs=1 skips in-engine cutscenes (automated tests).
game.skipCutscenes = params.get('nocs') === '1';
game.boot().then(() => {
  if (chapter) game.startChapter(chapter, null, { skipComic: true });
});

// Debug hooks (automated playtesting drives the game deterministically).
window.__game = game;
window.__step = (frames = 1, dt = 1 / 60, before = null) => {
  for (let i = 0; i < frames; i++) { before?.(i); game.update(dt); }
};
window.__tp = (x, z, yaw = 0) => {
  const p = game.player;
  p.spawn(x, Math.max(0, game.world.grid.floorAt(x, z)), z, yaw);
};
