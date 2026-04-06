import React, { useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { X, Settings, ShieldCheck, Upload, Trash2, Music, Volume2, QrCode, Key, Copy, CheckCircle2 } from 'lucide-react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { QRCodeSVG } from 'qrcode.react';
import { LicenseService, LicenseType } from '../../services/LicenseService';

type Sound = {
  id?: number;
  name: string;
  type: 'bgm' | 'sfx';
  url: string;
};

type BackgroundItem = {
  id?: number | string;
  type: 'image' | 'video';
  url: string;
};

type AdminPanelProps = {
  animals: any[];
  onDelete: (id: number | string) => void;
  onClear: () => void;
  onClose: () => void;
  onBackgroundUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  customBackgrounds: BackgroundItem[];
  isAdminAuthenticated: boolean;
  onAuthenticate: (password: string) => void;
  roomId: string;
};

export function AdminPanel({ animals, onDelete, onClear, onClose, onBackgroundUpload, customBackgrounds, isAdminAuthenticated, onAuthenticate, roomId }: AdminPanelProps) {
  const [pass, setPass] = useState('');
  const [targetMachineId, setTargetMachineId] = useState('');
  const [licenseType, setLicenseType] = useState<LicenseType>('30d');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  const sounds = useLiveQuery(() => db.sounds.toArray()) || [];
  const uploadUrl = `${window.location.origin}/upload?room=${roomId}`;

  const handleGenerateKey = () => {
    if (!targetMachineId.trim()) return;
    const key = LicenseService.generateKey(targetMachineId.trim(), licenseType);
    setGeneratedKey(key);
    setCopySuccess(false);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSoundUpload = async (e: ChangeEvent<HTMLInputElement>, type: 'bgm' | 'sfx') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const url = event.target?.result as string;
      if (type === 'bgm') {
        const existing = sounds.find(s => s.type === 'bgm');
        if (existing) await db.sounds.delete(existing.id!);
      }
      await db.sounds.add({ name: file.name, type, url });
    };
    reader.readAsDataURL(file);
  };

  if (!isAdminAuthenticated) {
    return (
      <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className="fixed top-0 right-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-[300] p-6 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><Settings size={20} />Cài đặt</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Guest QR Code Section - Always visible */}
        <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-3xl p-6 mb-8 text-center">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <QrCode size={24} className="text-white" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Dành cho Khách</h3>
          <p className="text-slate-400 text-xs mb-4">Quét mã để chụp ảnh hoặc tải nhân vật lên hồ cá!</p>
          <div className="bg-white p-3 rounded-2xl inline-block shadow-xl mb-4">
            <QRCodeSVG value={uploadUrl} size={140} level="H" />
          </div>
          <p className="text-indigo-300 text-[10px] font-mono break-all opacity-50">{uploadUrl}</p>
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="text-center mb-6">
            <ShieldCheck size={32} className="text-slate-500 mx-auto mb-2" />
            <h2 className="text-white font-bold text-sm uppercase tracking-widest">Quản trị viên</h2>
          </div>
          <input type="password" value={pass} onChange={(e: ChangeEvent<HTMLInputElement>) => setPass(e.target.value)} placeholder="Mật khẩu" className="w-full bg-slate-800 border border-slate-700 text-white py-3 px-4 rounded-xl mb-4 outline-none focus:border-indigo-500 text-sm" />
          <button onClick={() => onAuthenticate(pass)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all text-sm">Đăng nhập</button>
        </div>
        
        <button onClick={onClose} className="mt-auto pt-6 text-slate-500 text-xs hover:text-white text-center">Đóng</button>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className="fixed top-0 right-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-[300] p-6 flex flex-col overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8"><h2 className="text-white font-bold text-lg flex items-center gap-2"><Settings size={20} />Bảng Quản trị</h2><button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button></div>
      
      {/* Guest QR Code Section - Also visible for Admin */}
      <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4 mb-6 text-center">
        <div className="flex items-center gap-2 justify-center mb-2">
          <QrCode size={16} className="text-indigo-400" />
          <h3 className="text-white font-bold text-sm">Mã QR cho Khách</h3>
        </div>
        <div className="bg-white p-2 rounded-xl inline-block mb-2">
          <QRCodeSVG value={uploadUrl} size={100} level="H" />
        </div>
        <p className="text-slate-500 text-[8px] font-mono break-all">{uploadUrl}</p>
      </div>

      <div className="flex-1 space-y-8 pr-2">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4"><p className="text-indigo-300 text-xs font-bold uppercase mb-1">Khu vực hiện tại</p><p className="text-white font-black text-xl">{roomId}</p></div>
        <section>
          <h3 className="text-slate-400 text-xs font-bold uppercase mb-4 tracking-widest">Hình nền</h3>
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-700 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-all mb-4">
            <Upload className="text-slate-500 mb-2" size={24} />
            <p className="text-xs text-slate-500">Tải lên hình nền / video</p>
            <input type="file" className="hidden" multiple accept="image/*,video/*" onChange={onBackgroundUpload} />
          </label>
          
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {customBackgrounds.map((bg: any) => (
              <div key={bg.id} className="relative group rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/20">
                {bg.type === 'video' ? (
                  <video src={bg.url} className="w-full h-full object-cover opacity-50" />
                ) : (
                  <img src={bg.url} className="w-full h-full object-cover opacity-50" alt="" />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <button 
                    onClick={() => db.backgrounds.delete(bg.id)}
                    className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] text-white uppercase font-bold">
                  {bg.type}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3 className="text-slate-400 text-xs font-bold uppercase mb-4 tracking-widest">Âm thanh</h3>
          <div className="space-y-4">
            <div>
              <p className="text-white text-xs mb-2">Nhạc nền (BGM)</p>
              <label className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                <Music size={16} className="text-indigo-400" />
                <span className="text-xs text-slate-300 truncate">{sounds.find(s => s.type === 'bgm')?.name || "Tải nhạc nền..."}</span>
                <input type="file" className="hidden" accept="audio/*" onChange={(e: ChangeEvent<HTMLInputElement>) => handleSoundUpload(e, 'bgm')} />
              </label>
            </div>
            <div>
              <p className="text-white text-xs mb-2">Hiệu ứng (SFX)</p>
              <label className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                <Volume2 size={16} className="text-cyan-400" />
                <span className="text-xs text-slate-300">Thêm hiệu ứng...</span>
                <input type="file" className="hidden" accept="audio/*" onChange={(e: ChangeEvent<HTMLInputElement>) => handleSoundUpload(e, 'sfx')} />
              </label>
              <div className="mt-2 space-y-1">
                {sounds.filter(s => s.type === 'sfx').map(s => (
                  <div key={s.id} className="flex justify-between items-center text-[10px] text-slate-500 bg-white/5 p-1 px-2 rounded">
                    <span className="truncate w-40">{s.name}</span>
                    <button onClick={() => db.sounds.delete(s.id!)}><X size={10} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* License Management Section */}
        <section className="pt-8 border-t border-white/10">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <Key size={16} className="text-indigo-400" /> Quản lý License
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">ID Máy Khách</label>
              <input 
                type="text" 
                value={targetMachineId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTargetMachineId(e.target.value.toUpperCase())}
                placeholder="MO-XXXX-XXXX"
                className="w-full bg-slate-800 border border-slate-700 text-white py-2 px-3 rounded-lg text-xs font-mono outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Loại License</label>
              <div className="grid grid-cols-3 gap-2">
                {(['24h', '7d', '30d', '1y', 'perm'] as LicenseType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setLicenseType(t)}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all border ${
                      licenseType === t 
                      ? 'bg-indigo-600 border-indigo-500 text-white' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleGenerateKey}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all text-xs flex items-center justify-center gap-2"
            >
              <ShieldCheck size={14} /> Tạo Key Mới
            </button>

            {generatedKey && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Key Đã Tạo</span>
                  <button 
                    onClick={handleCopyKey}
                    className="text-indigo-400 hover:text-white transition-colors"
                  >
                    {copySuccess ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <code className="text-white font-mono text-sm block text-center tracking-widest">{generatedKey}</code>
              </motion.div>
            )}
          </div>
        </section>
      </div>
      <div className="pt-6 mt-auto border-t border-white/10"><button onClick={onClear} className="w-full py-3 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all text-sm flex items-center justify-center gap-2"><Trash2 size={16} />Dọn dẹp Đại dương</button></div>
    </motion.div>
  );
}
