import { type Animal, type Background } from '../../db';
import { Fish, Activity, Sparkles, Zap, Play, Music, Settings, ShieldCheck, AlertCircle } from 'lucide-react';

export interface LocalAnimal extends Animal {
  lastUpdate: number;
  bobOffset: number;
  wiggleOffset: number;
  hatchProgress: number; // 0 to 1
  bubbles: Bubble[];
  currentScaleX: number; // For smooth flipping
  targetFoodId?: string | null;
  distortion: number; // 0 to 1, increases over time
  gifFrames?: any[];
  currentFrameIndex?: number;
  lastFrameTime?: number;
  videoElement?: HTMLVideoElement;
  meshPoints?: { x: number, y: number, ox: number, oy: number }[];
  animationPhase: number;
}

export interface Bubble {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

export interface Food {
  id: string;
  x: number;
  y: number;
  opacity: number;
  size: number;
}

export interface OceanEvent {
  type: 'MAGIC_GLOW' | 'BUBBLE_STORM' | 'NONE';
  active: boolean;
  startTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // 1 to 0
  opacity: number;
}

export interface BgFish {
  x: number;
  y: number;
  vx: number;
  size: number;
  color: string;
  phase: number;
}

export const ANIMATION_PRESETS: Record<string, { label: string, icon: any }> = {
  'swim': { label: 'Bơi lội (Cá)', icon: Fish },
  'wiggle': { label: 'Uốn lượn (Sứa)', icon: Sparkles },
  'walk': { label: 'Bước đi (Người/Thú)', icon: Zap },
  'jump': { label: 'Nhảy nhót', icon: Play },
  'float': { label: 'Trôi nổi', icon: Music },
  'spin': { label: 'Xoay tròn', icon: Settings },
  'crawl': { label: 'Bò (Cua/Rùa)', icon: ShieldCheck },
  'fly': { label: 'Bay lượn', icon: Activity },
  'bounce': { label: 'Nảy tưng tưng', icon: Zap },
  'shake': { label: 'Rung lắc', icon: AlertCircle },
  'wave': { label: 'Vẫy chào', icon: Activity },
  'pulse': { label: 'Nhịp đập', icon: Sparkles },
};
