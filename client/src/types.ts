export interface User {
  id: string;
  name: string;
  color: string;
}

export interface Card {
  id: string;
  columnId: 'good' | 'improve' | 'action';
  text: string;
  authorId: string | null;
  authorName: string | null;
  color: string;
  x: number;
  y: number;
  reactions: Record<string, string[]>;
  hidden?: boolean;
  createdAt?: number;
}

export type FreeItemType = 'text' | 'image' | 'gif';

export interface FreeItem {
  id: string;
  type: FreeItemType;
  content: string; // text string, or image/gif URL
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  fontSize?: number;
  authorId: string;
  authorName: string;
}

export interface Timer {
  running: boolean;
  endsAt: number; // epoch ms when it ends (while running)
  remainingMs: number; // frozen remaining when paused
  durationMs: number; // last selected duration
}

export interface ColumnMeta {
  title: string;
  emoji: string;
  hint: string;
}

export type DynamicFormat = 'two-truths' | 'prompt-response' | 'scale-rating';

export interface BoardSpec {
  themeName: string;
  tagline: string;
  emoji: string;
  palette: { bgTop: string; bgBottom: string; good: string; improve: string; action: string };
  images: string[];
  columns: { good: ColumnMeta; improve: ColumnMeta; action: ColumnMeta };
  dynamic: {
    format: DynamicFormat;
    title: string;
    emoji: string;
    goal?: string;
    instructions: string;
    steps?: string[];
    durationMin: number;
    prompt?: string;
    scale?: { label: string; options: string[] };
  };
}

export interface GameEntry {
  format?: DynamicFormat;
  payload?: {
    statements?: string[];
    lieIndex?: number;
    answer?: string;
    choice?: string;
  };
  authorName: string;
  authorColor: string;
  locked?: boolean;
  revealed: boolean;
}

export interface BoardState {
  id: string;
  index: number;
  title: string;
  theme: string;
  spec: BoardSpec;
  phase: 'writing' | 'revealed';
  showAuthors: boolean;
  columns: { id: string; title: string; type: string }[];
  cards: Record<string, Card>;
  freeItems: Record<string, FreeItem>;
  doneUsers: string[];
  timer: Timer;
  game: { active: boolean; entries: Record<string, GameEntry> };
}

export interface Presence {
  hostId: string | null;
  users: User[];
}

export interface BoardSummary {
  id: string;
  index: number;
  title: string;
  theme: string;
  themeEmoji?: string;
  tagline?: string;
  dynamicTitle?: string;
  createdAt: number;
  phase: string;
  counts: { good: number; improve: number; action: number };
  total: number;
}

export interface CursorInfo {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  t: number;
}
