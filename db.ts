import Dexie, { type Table } from 'dexie';

export interface Animal {
  id?: number;
  name: string;
  type: string;
  color: string;
  image: string;
  sound: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isExploding: boolean;
  explosionStartTime: number | null;
  respawnStartTime?: number | null;
  oldX?: number;
  oldY?: number;
  uid: string;
  createdAt: number;
  respawnCount: number;
  roomId: string;
  distortion: number;
  animationType: string;
  flipX: boolean;
}

export interface Background {
  id?: number;
  type: 'image' | 'video';
  url: string;
}

export interface Treasure {
  id?: number;
  type: 'gold' | 'silver' | 'bronze';
  x: number;
  y: number;
  roomId: string;
}

export interface Sound {
  id?: number;
  name: string;
  type: 'bgm' | 'sfx';
  url: string;
}

export interface License {
  id?: number;
  key: string;
  machineId: string;
  type: '24h' | '7d' | '30d' | '1y' | 'perm';
  activationDate: number;
  expiryDate: number;
  lastRunTime: number;
}

export class MagicOceanDatabase extends Dexie {
  animals!: Table<Animal>;
  backgrounds!: Table<Background>;
  treasures!: Table<Treasure>;
  sounds!: Table<Sound>;
  license!: Table<License>;

  constructor() {
    super('MagicOceanDB');
    this.version(2).stores({
      animals: '++id, roomId, uid',
      backgrounds: '++id',
      treasures: '++id, roomId',
      sounds: '++id, type',
      license: '++id'
    });
  }
}

export const db = new MagicOceanDatabase();
