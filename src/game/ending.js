import { RANKS } from '../story/lines.js';

// End-of-game rank (MGS code names, here Swedish animals) and the credits.

/**
 * Score a playthrough: stealth and mercy count, and so do the ID tags.
 * @returns {{ score: number, rank: { name: string, line: string } | null }}
 */
export function computeRank(stats) {
  const mins = stats.time / 60;
  let score = 100;
  score -= stats.alerts * 6;
  score -= stats.kills * 9;
  score -= (stats.continues ?? 0) * 3;
  score -= Math.max(0, (stats.saves ?? 0) - 10) * 1;
  score -= Math.max(0, mins - 90) * 0.3;
  score += Math.min(15, (stats.dogtags?.length ?? 0) * 0.6);
  score = Math.max(0, Math.min(115, score));
  const list = RANKS ?? [];
  if (!list.length) return { score, rank: null };
  // Best rank first in the list; 110+ earns it, 0 earns the last.
  const i = Math.round((1 - Math.min(1, score / 110)) * (list.length - 1));
  return { score, rank: list[i] };
}

export function creditsLines(stats) {
  const mins = Math.floor(stats.time / 60);
  const { rank } = computeRank(stats);
  return [
    'CYBÖRG II', '  FRIHETENS SÖNER', '', 'En PS2-demake', '', 'Göteborg, december 2047', '',
    rank ? `KODNAMN: ${rank.name.toUpperCase()}` : '', rank ? `  ${rank.line}` : '', '',
    `Speltid: ${mins} min`, `Larm: ${stats.alerts}`, `Dödade: ${stats.kills}`, `Nedtagningar: ${stats.takedowns}`,
    `Sparningar: ${stats.saves ?? 0}`, `ID-brickor: ${stats.dogtags?.length ?? 0}`, '',
    'Ledmotiv', '  Du gamla, du fria', '  Text: Richard Dybeck (1844), folkmelodi', '',
    '  Carl Michael Bellman', '  Fredmans epistel 81, Märk hur vår skugga (1790)', '',
    'Dikter', '  Karin Boye', '  I rörelse (1927), Kallocain (1940)', '',
    'Tack till', '  Göteborg i snö', '  Alla som sjunger fel', '', '', '', 'Den bästa dagen är en dag av törst.', '', '', '',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '');
}
