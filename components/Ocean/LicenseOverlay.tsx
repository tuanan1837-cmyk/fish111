import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Key, AlertCircle, Info, Trash2, QrCode, Settings } from 'lucide-react';
import { LicenseService } from '../../services/LicenseService';

interface LicenseOverlayProps {
  onValidated: () => void;
  onOpenAdmin?: () => void;
}

export function LicenseOverlay({ onValidated, onOpenAdmin }: LicenseOverlayProps) {
  const [machineId, setMachineId] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'error' | 'success' | 'expired' | 'cheated'>('idle');
  const [message, setMessage] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    const mid = LicenseService.getMachineId();
    setMachineId(mid);
    checkCurrentLicense();
  }, []);

  const checkCurrentLicense = async () => {
    const result = await LicenseService.checkLicenseStatus();
    if (result.status === 'expired') {
      setStatus('expired');
      setMessage(result.message || 'Kính quý khách, đã hết hạn sử dụng. Xin vui lòng gia hạn để tiếp tục sử dụng. Xin cảm ơn!');
      setShowInput(true);
    } else if (result.status === 'cheated') {
      setStatus('cheated');
      setMessage(result.message || 'Phát hiện gian lận thời gian!');
      setShowInput(false);
    } else {
      setStatus('idle');
      setMessage('Nhập key của bạn để đăng nhập vào game.');
      setShowInput(true);
    }
  };

  const handleActivate = async () => {
    if (!keyInput.trim()) return;
    setStatus('checking');
    const validation = LicenseService.validateKey(keyInput.trim(), machineId);
    if (validation.isValid && validation.type) {
      const preserved = await LicenseService.preserveExistingLicense(keyInput.trim(), machineId);
      if (preserved) {
        if (Date.now() <= preserved.expiryDate) {
          setStatus('success');
          setMessage('Đăng nhập thành công! Thời gian còn lại vẫn được giữ nguyên.');
          setTimeout(() => onValidated(), 1500);
          return;
        }
        setStatus('expired');
        setMessage('Kính quý khách, đã hết hạn sử dụng. Xin vui lòng gia hạn để tiếp tục sử dụng. Xin cảm ơn!');
        return;
      }
      await LicenseService.saveLicense(keyInput.trim(), validation.type);
      setStatus('success');
      setMessage('Kích hoạt thành công! Đang vào game...');
      setTimeout(() => onValidated(), 1500);
    } else {
      setStatus('error');
      setMessage('Key không hợp lệ cho máy này. Vui lòng kiểm tra lại.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/30 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/30 shadow-lg">
            <ShieldCheck size={40} className="text-indigo-400" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Xác thực Bản quyền</h1>
          <p className="text-slate-400 font-medium">Vui lòng kích hoạt để bắt đầu hành trình đại dương.</p>
        </div>

        <div className="space-y-6">
          {/* Machine ID Display */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Máy Của Bạn</span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">Duy nhất</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-700 rounded-lg text-slate-400"><Info size={16} /></div>
              <code className="text-white font-mono text-lg tracking-wider select-all">{machineId}</code>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 italic">* Gửi ID này cho Quản trị viên để nhận Key kích hoạt.</p>
          </div>

          {showInput && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><Key size={20} /></div>
                <input 
                  type="text" 
                  value={keyInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyInput(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white font-mono text-xl tracking-[0.2em] focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 uppercase"
                />
              </div>

              <button 
                onClick={handleActivate}
                disabled={status === 'checking' || !keyInput.trim()}
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50 disabled:scale-100"
              >
                {status === 'checking' ? 'Đang kiểm tra...' : 'Kích hoạt ngay'}
              </button>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-2xl flex items-center gap-3 border ${
                  status === 'error' || status === 'expired' || status === 'cheated'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}
              >
                <AlertCircle size={20} />
                <p className="text-sm font-bold">{message}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em] font-black">Magic Ocean Security System v2.0</p>
          {onOpenAdmin && (
            <button 
              onClick={onOpenAdmin}
              className="p-2 text-slate-700 hover:text-slate-400 transition-colors"
              title="Admin Panel"
            >
              <Settings size={14} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
