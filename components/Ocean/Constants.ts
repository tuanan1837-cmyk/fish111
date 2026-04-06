import { type Background } from '../../db';

export const BACKGROUNDS: Background[] = [];

export const PRESET_SOUNDS: Record<string, string> = {
  'Pop': 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  'Splash': 'https://assets.mixkit.co/active_storage/sfx/1190/1190-preview.mp3',
  'Bubble': 'https://assets.mixkit.co/active_storage/sfx/1103/1103-preview.mp3',
  'Magic': 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  'Chime': 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  'Sparkle': 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
};

export const EXPLOSION_DURATION = 1000;
export const RESPAWN_DELAY = 5000;
export const BUBBLE_DURATION = 2000;
export const HATCH_DURATION = 2000;
export const BG_ROTATION_INTERVAL = 180000;
export const EVENT_INTERVAL = 300000;
export const EVENT_DURATION = 20000;
export const MAX_FOOD = 20;
