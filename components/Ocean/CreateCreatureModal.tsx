import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, Sparkles, Camera, FileImage, AlertCircle, Play } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PRESET_SOUNDS } from './Constants';
import { ANIMATION_PRESETS } from './Types';

export function CreateCreatureModal({ onClose, onCreate, processImage, checkContent }: any) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [type, setType] = useState('Fish');
  const [color, setColor] = useState('#4F46E5');
  const [image, setImage] = useState<string | null>(null);
  const [sound, setSound] = useState('Pop');
  const [animationType, setAnimationType] = useState('swim');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [is3DMode, setIs3DMode] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCamera: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setScanProgress(0);
    setModerationError(null);
    const progressInterval = setInterval(() => setScanProgress(prev => Math.min(prev + 5, 90)), 100);
    try {
      let processed: string;
      if (file.type.startsWith('video/') || file.type === 'image/gif') {
        processed = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      } else {
        processed = await processImage(file);
      }
      
      setScanProgress(95);
      setIsModerating(true);
      const result = await checkContent(processed);
      if (!result.safe || !result.isCreature) {
        setModerationError(result.reason || "Image rejected by safety filters.");
        setIsModerating(false); setIsProcessing(false); clearInterval(progressInterval); return;
      }
      setImage(processed);
      if (result.suggestedName) setName(result.suggestedName);
      if (result.suggestedType) setType(result.suggestedType);
      if (result.suggestedAnimation) setAnimationType(result.suggestedAnimation);
      setScanProgress(100);
      setTimeout(() => { setStep(2); clearInterval(progressInterval); }, 500);
    } catch (err) {
      console.error(err); setModerationError("Failed to process image. Please try again."); clearInterval(progressInterval);
    } finally { setIsProcessing(false); setIsModerating(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center"><h2 className="text-xl font-bold text-white">Sinh vật mới</h2><button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button></div>
        <div className="p-8">
          {step === 1 ? (
            <div className="text-center">
              <div className={`relative border-2 border-dashed rounded-3xl p-12 transition-all group overflow-hidden ${isProcessing ? 'border-indigo-500 bg-indigo-500/5 cursor-wait' : 'border-slate-600'}`}>
                {isProcessing ? (
                  <div className="flex flex-col items-center py-12 relative z-10">
                    <div className="relative w-24 h-24 mb-6"><Loader2 className="w-full h-full text-indigo-500 animate-spin opacity-20" /><motion.div initial={{ top: '0%' }} animate={{ top: '100%' }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-1 bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.8)] z-20" /><Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" size={32} /></div>
                    <p className="text-white font-bold text-xl mb-2">{isModerating ? "Đang phân tích AI..." : "Đang quét sinh vật..."}</p>
                    <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden mb-2"><motion.div className="h-full bg-indigo-500" initial={{ width: 0 }} animate={{ width: `${scanProgress}%` }} /></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-center gap-4">
                      <button onClick={() => cameraInputRef.current?.click()} className="flex-1 flex flex-col items-center gap-3 p-6 bg-indigo-600/10 border border-indigo-600/20 rounded-2xl hover:bg-indigo-600/20 transition-all">
                        <Camera className="text-indigo-400" size={32} />
                        <span className="text-white font-bold text-sm">Chụp ảnh</span>
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex flex-col items-center gap-3 p-6 bg-cyan-600/10 border border-cyan-600/20 rounded-2xl hover:bg-cyan-600/20 transition-all">
                        <FileImage className="text-cyan-400" size={32} />
                        <span className="text-white font-bold text-sm">Tải tệp</span>
                      </button>
                    </div>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto">Hỗ trợ: Ảnh, GIF và Video chất lượng cao.</p>
                    {moderationError && <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3"><AlertCircle size={20} /><div><p className="font-bold">Quét thất bại</p><p className="text-xs opacity-80">{moderationError}</p></div></div>}
                  </div>
                )}
              </div>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileUpload(e, true)} />
              <input ref={fileInputRef} type="file" accept="image/*,video/*,image/gif" className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileUpload(e, false)} />
            </div>
          ) : (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="aspect-square bg-slate-700 rounded-3xl overflow-hidden flex items-center justify-center border border-slate-600 relative group">
                    {image?.startsWith('data:video/') ? (
                      <video src={image} className="w-full h-full object-contain" autoPlay loop muted />
                    ) : (
                      <img src={image!} className="w-full h-full object-contain" alt="Preview" style={{ filter: color !== '#4F46E5' ? `hue-rotate(${parseInt(color.slice(1), 16) % 360}deg) saturate(1.5)` : 'none' }} />
                    )}
                    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all">
                      <p className="text-white text-[10px] font-bold uppercase mb-1">Xem trước chuyển động</p>
                      <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                        {React.createElement(ANIMATION_PRESETS[animationType]?.icon || Sparkles, { size: 14 })}
                        {ANIMATION_PRESETS[animationType]?.label}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-slate-400 text-xs font-bold uppercase mb-3">Màu sắc tùy chỉnh</label>
                    <div className="flex flex-wrap gap-2">
                      {['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#FFFFFF'].map(c => (
                        <button key={c} onClick={() => setColor(c)} className={`w-10 h-10 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c }} />
                      ))}
                      <input type="color" value={color} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)} className="w-10 h-10 rounded-full bg-transparent border-none cursor-pointer" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Tên sinh vật</label>
                    <input type="text" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Đặt tên..." className="w-full bg-slate-700 border border-slate-600 rounded-2xl px-5 py-3 text-white focus:border-indigo-500 transition-all" />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-bold uppercase mb-3">Bộ chuyển động (Rigging Presets)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(ANIMATION_PRESETS).map(([key, config]) => (
                        <button key={key} onClick={() => setAnimationType(key)} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${animationType === key ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'}`}>
                          <config.icon size={18} className={animationType === key ? 'text-white' : 'text-slate-500'} />
                          <span className="font-bold text-[11px] leading-tight">{config.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400"><Sparkles size={20} /></div>
                      <div>
                        <p className="text-white text-sm font-bold">Chế độ 3D</p>
                        <p className="text-slate-400 text-[10px]">Uốn lượn theo chiều sâu</p>
                      </div>
                    </div>
                    <button onClick={() => setIs3DMode(!is3DMode)} className={`w-12 h-6 rounded-full transition-all relative ${is3DMode ? 'bg-indigo-600' : 'bg-slate-600'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${is3DMode ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-bold uppercase mb-3">Âm thanh tương tác</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(PRESET_SOUNDS).map(s => (
                        <button key={s} type="button" onClick={() => { setSound(s); new Audio(PRESET_SOUNDS[s]).play().catch(() => {}); }} className={`flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${sound === s ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>
                          <span className="font-bold text-xs">{s}</span>
                          <Play size={12} fill="currentColor" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-700">
                <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-700 text-white font-bold rounded-2xl hover:bg-slate-600 transition-all">Quay lại</button>
                <button onClick={() => { onCreate(name || 'Unnamed', type, color, image!, sound, is3DMode, animationType); onClose(); }} className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20">Thả vào đại dương</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
