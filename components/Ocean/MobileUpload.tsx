import React, { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles, ArrowLeft, Volume2 } from 'lucide-react';
import { db } from '../../db';
import { ANIMATION_PRESETS } from './Types';
import { PRESET_SOUNDS } from './Constants';

export function MobileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [animation, setAnimation] = useState("swim");
  const [sound, setSound] = useState("Pop");
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);

  const roomId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'default';
  }, []);

  // Setup WebSocket for sync
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socket.onopen = () => {
      console.log('Mobile upload WebSocket connected');
    };
    socket.onmessage = (event) => {
      console.log('Mobile upload received:', event.data);
    };
    socket.onerror = (err) => {
      console.error("Mobile upload WebSocket error:", err);
    };
    socket.onclose = () => {
      console.log('Mobile upload WebSocket closed');
    };
    setWs(socket);
    return () => socket.close();
  }, []);

  const playSound = (soundName: string) => {
    try {
      const audio = new Audio(PRESET_SOUNDS[soundName]);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {
      console.log('Cannot play sound:', soundName);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!name.trim()) {
      setStatus('error');
      setError('Vui lòng nhập tên nhân vật');
      return;
    }

    setStatus('uploading');
    setError("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imageDataUrl = event.target?.result as string;
        
        // Thêm vào database
        await db.animals.add({
          name: name.trim(),
          type: 'custom', // Simple type for mobile upload
          color: '#00B4D8',
          image: imageDataUrl,
          sound: sound,
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          isExploding: false,
          explosionStartTime: null,
          uid: 'mobile-upload',
          createdAt: Date.now(),
          respawnCount: 0,
          roomId: roomId,
          distortion: 1,
          animationType: animation,
          flipX: false
        });

        // Send WebSocket message to sync with other clients
        if (ws && ws.readyState === WebSocket.OPEN) {
          const messageData = {
            type: 'NEW_CHARACTER',
            data: {
              name: name.trim(),
              type: 'custom',
              color: '#00B4D8',
              image: imageDataUrl,
              sound: sound,
              animationType: animation,
              roomId: roomId
            }
          };
          console.log('Sending WebSocket message:', messageData);
          ws.send(JSON.stringify(messageData));
        } else {
          console.warn('WebSocket not connected, readyState:', ws?.readyState);
        }

        setStatus('success');
        setFile(null);
        setName("");
        setAnimation('swim');
        setSound('Pop');
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Lỗi khi tải ảnh');
      }
    };
    reader.onerror = () => {
      setStatus('error');
      setError('Lỗi đọc file');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#00B4D8] text-white p-4 flex flex-col items-center justify-start relative overflow-x-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&q=80&w=1000" 
          alt="Cartoonish Ocean" 
          className="w-full h-full object-cover opacity-40"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#00B4D8]/60 to-[#0077B6]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="w-full max-w-md bg-white/20 backdrop-blur-2xl rounded-[50px] border-8 border-white/40 shadow-[0_30px_60px_rgba(0,0,0,0.2)] overflow-hidden relative z-10 mt-6"
      >
        {/* Header */}
        <div className="h-48 w-full relative overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1510337550647-e84f83e34178?auto=format&fit=crop&q=80&w=800" 
            alt="Cartoonish Cover" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-8">
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none drop-shadow-lg">TÔ MÀU VUI NHỘN</h1>
              <p className="text-yellow-300 text-sm font-black uppercase tracking-widest mt-2 drop-shadow-md">Thế giới sáng tạo của bé</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {status === 'success' ? (
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center space-y-8 py-6">
              <div className="w-32 h-32 bg-yellow-400 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-8 border-white animate-bounce">
                <Sparkles size={64} />
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl font-black text-white uppercase tracking-tight">XONG RỒI!</h2>
                <p className="text-white text-xl font-bold">Nhân vật của bé đang bơi lội vui vẻ rồi đó!</p>
              </div>
              <button 
                onClick={() => {
                  setStatus('idle');
                  window.location.href = '/';
                }} 
                className="w-full py-6 bg-pink-500 text-white rounded-[30px] font-black text-2xl shadow-[0_10px_0_rgba(190,24,93,1)] hover:translate-y-1 hover:shadow-[0_5px_0_rgba(190,24,93,1)] active:translate-y-2 active:shadow-none transition-all uppercase border-4 border-white"
              >
                VỀ LẠI GAME
              </button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-white uppercase tracking-widest ml-2">Tên của bé là gì? *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} 
                  placeholder="Ví dụ: Bé Na Xinh Đẹp" 
                  className="w-full bg-white/20 border-4 border-white/30 rounded-[25px] px-6 py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-yellow-400 focus:bg-white/30 transition-all font-black text-lg" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-white uppercase tracking-widest ml-2">Bé muốn nhân vật làm gì? *</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ANIMATION_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => setAnimation(key)}
                      className={`py-3 px-2 rounded-[15px] text-xs font-black uppercase transition-all border-3 ${
                        animation === key 
                        ? 'bg-yellow-400 border-white text-blue-900 shadow-lg scale-105' 
                        : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-white uppercase tracking-widest ml-2">Âm thanh khi chạm vào *</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(PRESET_SOUNDS).map((soundName) => (
                    <button
                      key={soundName}
                      onClick={() => {
                        setSound(soundName);
                        playSound(soundName);
                      }}
                      className={`py-3 px-2 rounded-[15px] text-xs font-black uppercase transition-all border-3 flex items-center justify-center gap-1 ${
                        sound === soundName
                        ? 'bg-yellow-400 border-white text-blue-900 shadow-lg scale-105'
                        : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <Volume2 size={12} />
                      {soundName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-white uppercase tracking-widest ml-2">Chụp ảnh nhân vật bé vẽ *</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className={`w-full h-40 border-4 border-dashed rounded-[30px] flex flex-col items-center justify-center transition-all ${
                    file 
                    ? 'border-green-400 bg-green-400/20' 
                    : 'border-white/40 group-hover:border-white/80 bg-white/10'
                  }`}>
                    {file ? (
                      <div className="text-center px-6">
                        <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center mx-auto mb-2 border-3 border-white shadow-lg">
                          <Plus className="text-white rotate-45" size={24} />
                        </div>
                        <p className="text-white font-black text-sm truncate max-w-[180px]">{file.name}</p>
                        <p className="text-xs text-white/70 mt-1 font-bold">Bấm để chụp lại</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border-3 border-white/40">
                          <Plus className="text-white" size={40} />
                        </div>
                        <p className="text-white font-black text-xs uppercase tracking-widest text-center px-4">BẤM ĐỂ CHỤP</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {status === 'error' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white text-sm font-black text-center bg-red-500 py-3 rounded-2xl border-3 border-white shadow-lg">
                  ⚠️ {error}
                </motion.div>
              )}

              <button 
                onClick={handleUpload} 
                disabled={!file || !name.trim() || status === 'uploading'} 
                className={`w-full py-5 rounded-[30px] font-black text-2xl shadow-[0_10px_0_rgba(2,132,199,1)] transition-all uppercase tracking-tight border-4 border-white ${
                  !file || !name.trim() || status === 'uploading' 
                  ? 'bg-slate-400 text-white/50 cursor-not-allowed shadow-none translate-y-2' 
                  : 'bg-blue-500 text-white hover:translate-y-1 hover:shadow-[0_5px_0_rgba(2,132,199,1)] active:translate-y-2 active:shadow-none'
                }`}
              >
                {status === 'uploading' ? '⏳ ĐANG GỬI...' : '🌊 THẢ VÀO BIỂN!'}
              </button>

              <button 
                onClick={() => window.location.href = '/'}
                className="w-full py-3 text-white/70 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> Quay lại
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Footer */}
      <p className="mt-8 text-white font-black text-xs uppercase tracking-[0.3em] relative z-10 drop-shadow-md">
        MAGIC OCEAN &bull; 2026
      </p>
    </div>
  );
}
