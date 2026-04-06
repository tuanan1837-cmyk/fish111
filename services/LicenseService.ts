import { db } from '../db';

const SECRET_KEY = "MAGIC_OCEAN_SECRET_2026";

export type LicenseType = '24h' | '7d' | '30d' | '1y' | 'perm';

export class LicenseService {
  // 1. Lấy Machine ID (Duy nhất cho trình duyệt/máy này)
  static getMachineId(): string {
    let id = localStorage.getItem('magic_ocean_machine_id');
    if (!id) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const fingerprint = [
        navigator.userAgent,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
        ctx?.font || 'default'
      ].join('|');
      
      // Simple hash function for fingerprint
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      id = 'MO-' + Math.abs(hash).toString(16).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      localStorage.getItem('magic_ocean_machine_id') || localStorage.setItem('magic_ocean_machine_id', id);
    }
    return id;
  }

  // 2. Tạo Key (Dùng cho Admin Tool)
  static generateKey(machineId: string, type: LicenseType): string {
    const data = `${machineId}|${type}|${SECRET_KEY}`;
    // Simple obfuscation/encryption
    const encoded = btoa(data).split('').reverse().join('');
    // Format: XXXX-XXXX-XXXX-XXXX
    const hash = this.simpleHash(encoded);
    return this.formatKey(hash);
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash).toString(16).padStart(8, '0');
    const salt = btoa(str).substring(0, 8).toUpperCase();
    return (absHash + salt).toUpperCase();
  }

  private static formatKey(hash: string): string {
    const parts = hash.match(/.{1,4}/g) || [];
    return parts.slice(0, 4).join('-');
  }

  // 3. Kiểm tra Key
  static validateKey(inputKey: string, machineId: string): { isValid: boolean, type?: LicenseType } {
    const types: LicenseType[] = ['24h', '7d', '30d', '1y', 'perm'];
    for (const type of types) {
      const expectedKey = this.generateKey(machineId, type);
      if (inputKey.toUpperCase() === expectedKey) {
        return { isValid: true, type };
      }
    }
    return { isValid: false };
  }

  // 4. Lưu License
  static async saveLicense(key: string, type: LicenseType) {
    const now = Date.now();
    const machineId = this.getMachineId();

    const existing = await this.getSavedLicense();
    if (existing && existing.key === key && existing.machineId === machineId && now <= existing.expiryDate) {
      const updatedLicense = { ...existing, lastRunTime: now };
      if (existing.id != null) {
        await db.license.update(existing.id, { lastRunTime: now });
      }
      localStorage.setItem('magic_ocean_license', JSON.stringify(updatedLicense));
      return;
    }

    let expiryDate = 0;
    if (type === '24h') expiryDate = now + 24 * 60 * 60 * 1000;
    else if (type === '7d') expiryDate = now + 7 * 24 * 60 * 60 * 1000;
    else if (type === '30d') expiryDate = now + 30 * 24 * 60 * 60 * 1000;
    else if (type === '1y') expiryDate = now + 365 * 24 * 60 * 60 * 1000;
    else expiryDate = now + 100 * 365 * 24 * 60 * 60 * 1000; // 100 years for permanent

    const licenseData = {
      key,
      machineId,
      type,
      activationDate: now,
      expiryDate,
      lastRunTime: now
    };

    await db.license.clear();
    await db.license.add(licenseData);
    localStorage.setItem('magic_ocean_license', JSON.stringify(licenseData));
  }

  static async getSavedLicense() {
    const saved = await db.license.toCollection().first();
    if (saved) return saved;
    const item = localStorage.getItem('magic_ocean_license');
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return null;
    }
  }

  static async preserveExistingLicense(key: string, machineId: string) {
    const saved = await this.getSavedLicense();
    if (saved && saved.key === key && saved.machineId === machineId) {
      return saved;
    }
    return null;
  }

  static async clearLicense() {
    await db.license.clear();
    localStorage.removeItem('magic_ocean_license');
  }

  static getRemainingTime(expiryDate: number) {
    return Math.max(0, expiryDate - Date.now());
  }

  static formatRemainingTime(expiryDate: number) {
    const remainingMs = this.getRemainingTime(expiryDate);
    if (remainingMs <= 0) return 'Đã hết hạn';
    const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    if (days > 365 * 5) return 'Vĩnh viễn';
    const parts = [];
    if (days) parts.push(`${days} ngày`);
    if (hours) parts.push(`${hours} giờ`);
    if (minutes) parts.push(`${minutes} phút`);
    return parts.join(' ');
  }

  // 5. Kiểm tra License hiện tại
  static async checkLicenseStatus(): Promise<{ 
    status: 'valid' | 'expired' | 'none' | 'cheated', 
    message?: string,
    license?: any 
  }> {
    const saved = await db.license.toCollection().first();
    if (!saved) return { status: 'none' };

    const now = Date.now();

    // Anti-time cheat
    if (now < saved.lastRunTime) {
      return { status: 'cheated', message: 'Phát hiện gian lận thời gian hệ thống! Vui lòng chỉnh lại giờ.' };
    }

    // Update last run time
    await db.license.update(saved.id!, { lastRunTime: now });

    // Check expiry
    if (now > saved.expiryDate) {
      return { status: 'expired', message: 'License của bạn đã hết hạn. Vui lòng nhập key mới.' };
    }

    // Check machine ID
    if (saved.machineId !== this.getMachineId()) {
      return { status: 'none', message: 'License không hợp lệ cho máy này.' };
    }

    return { status: 'valid', license: saved };
  }
}
