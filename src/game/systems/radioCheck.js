import { spawnGuard } from '../guard.js';
import { makeShadow } from '../shadows.js';
import { audio } from '../../engine/audio.js';
import { BARKS } from '../../story/lines.js';
import { PHASE } from '../alarm.js';

// Guard radio check-ins. Every INTERVAL seconds command calls each patrol
// group. A group with a guard out of action cannot answer: after a pause the
// base raises CAUTION and sends a reinforcement squad (one with a shield) from
// the level's `reinforce` marker. During ALERT a squad is sent right away.

const INTERVAL = 150;
const ANSWER_DELAY = 6;
const MAX_SQUADS = 2;

const pick = (arr) => (arr?.length ? arr[Math.floor(Math.random() * arr.length)] : null);

export class RadioCheck {
  load(game) {
    this.t = INTERVAL * (0.5 + Math.random() * 0.3);
    this.pending = null;
    this.squads = 0;
    this.enabled = game.mode === 'mission' && game.guards.length > 0 && !game.level.noRadioCheck;
    this.onPhase = (phase) => { if (phase === PHASE.ALERT) this.reinforce(game); };
  }

  clear() { this.pending = null; }

  say(game, key) {
    const line = pick(BARKS.sons_radio?.[key]);
    if (line) game.hud.message(`RADIO: ${line}`, '#90b8a0', 3.2);
  }

  update(game, dt) {
    if (!this.enabled) return;
    if (this.pending) {
      this.pending.t -= dt;
      if (this.pending.t <= 0) {
        const { group } = this.pending;
        this.pending = null;
        const silent = game.guards.some((g) => g.group === group && g.down && !g.def.reinforcement);
        if (silent) {
          this.say(game, 'noanswer');
          audio.play('radio_check', { volume: 0.7, rate: 0.8 });
          game.alarm.raiseCaution(game.guards.find((g) => g.group === group)?.pos ?? game.player.pos);
          this.reinforce(game);
        } else {
          this.say(game, 'answer');
        }
      }
      return;
    }
    this.t -= dt;
    if (this.t > 0) return;
    this.t = INTERVAL;
    const groups = [...new Set(game.guards.map((g) => g.group))];
    const group = pick(groups);
    if (!group) return;
    audio.play('radio_check', { volume: 0.6 });
    this.say(game, 'call');
    this.pending = { group, t: ANSWER_DELAY };
    game.level.script?.radioCheckIn?.(game, group);
  }

  async reinforce(game) {
    const m = game.world?.spawns.markers.reinforce;
    if (!m || this.squads >= MAX_SQUADS) return;
    this.squads += 1;
    const defs = [
      { x: m.x, z: m.z, rot: m.yaw ?? 0, group: 'r', reinforcement: true, shield: true, index: 900 + this.squads * 2 },
      { x: m.x + 1.2, z: m.z + 0.6, rot: m.yaw ?? 0, group: 'r', reinforcement: true, index: 901 + this.squads * 2 },
    ];
    for (const def of defs) {
      const g = await spawnGuard(def, game.world, game.actors);
      g.shadow = makeShadow(game.actors, 0.9);
      g.state = 'search';
      g.searchT = 20;
      g.investigate = game.alarm.lastKnown?.clone() ?? game.player.pos.clone();
      game.guards.push(g);
    }
    game.hud.message('FÖRSTÄRKNING PÅ VÄG', '#f0a060', 3);
  }
}
