// Preset avatar/profile colors (Minecraft-ish palette but friendly)
export const PALETTE = [
  '#e23b3b', // redstone
  '#f2a33c', // gold
  '#f5d442', // sun
  '#5db54a', // grass green
  '#2fa39b', // diamond teal
  '#3a86ff', // lapis
  '#8b5cf6', // amethyst
  '#e56ab3', // pink
  '#a97142', // dirt
  '#6b7280', // stone
];

import type { BoardSpec } from '../types';

// Fallback estático (usado antes do board carregar ou se faltar spec).
export const COLUMN_META: Record<string, { title: string; emoji: string; color: string; hint: string }> = {
  good: { title: 'O que foi bom', emoji: '💚', color: '#5db54a', hint: 'Diamantes que a gente minerou 💎' },
  improve: { title: 'O que pode melhorar', emoji: '🛠️', color: '#f2a33c', hint: 'Creepers que atrapalharam 🧨' },
  action: { title: 'Ações', emoji: '⚡', color: '#3a86ff', hint: 'Crafting da próxima sprint 🧱' },
};

// Deriva a metadata das colunas a partir do spec do board (tema gerado por IA).
export function columnMetaFromSpec(spec?: BoardSpec) {
  if (!spec) return COLUMN_META;
  const mk = (k: 'good' | 'improve' | 'action') => ({
    title: spec.columns[k].title,
    emoji: spec.columns[k].emoji,
    hint: spec.columns[k].hint,
    color: spec.palette[k],
  });
  return { good: mk('good'), improve: mk('improve'), action: mk('action') };
}

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '💎', '🧨', '👀'];

// GIF / sticker suggestions (public giphy embed-friendly urls are avoided; users paste their own)
export const THEME = {
  name: 'Minecraft',
  tagline: 'Mine os aprendizados, blocode a próxima sprint',
  bgTop: '#7ec0ee',
  bgBottom: '#c8e6a0',
};
