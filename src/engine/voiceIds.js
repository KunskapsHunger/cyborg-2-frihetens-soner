// Stable ids for voiced lines, shared by the game and tools/voice.

export const radioVoiceId = (key, i) => `r_${key}_${i}`;
export const lineVoiceId = (key, i) => `l_${key}_${i}`;
export const comicVoiceId = (comic, page, panel, part) => `c_${comic}_${page}_${panel}_${part}`;
export const cutsceneVoiceId = (cutscene, beat) => `s_${cutscene}_${beat}`;
export const readerVoiceId = (key, i) => `m_${key}_${i}`;
export const codecVoiceId = (level, contact, call, i) => `k_${level}_${contact}_${call}_${i}`;
