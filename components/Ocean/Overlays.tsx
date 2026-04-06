import React from 'react';
import { motion } from 'framer-motion';
import { Play, QrCode, X, Sparkles, Fish, Activity } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function GameStartOverlay({ onStart }: { onStart: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto py-12 bg-[#00A8E8]"
    >
      {/* Cartoonish Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&q=80&w=2000" 
          alt="Cartoonish Ocean" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="text-center max-w-4xl px-6 relative z-20">
        {/* Removed Logo Box */}
        
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <h1 className="text-7xl md:text-8xl font-black text-white mb-4 tracking-tight uppercase drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]">
            <span className="text-yellow-400">ĐẠI DƯƠNG</span> <br />
            <span className="text-white">KỲ DIỆU</span>
          </h1>
        </motion.div>

        <div className="inline-block px-8 py-3 bg-white/20 backdrop-blur-xl border-4 border-white/40 rounded-[30px] mb-12 shadow-xl">
          <p className="text-white text-2xl font-black tracking-wide uppercase">Thế Giới Sáng Tạo Của Bé</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 text-left">
          {[
            { id: 1, title: "Kết nối WiFi", desc: "Kết nối điện thoại vào mạng WiFi nội bộ của khu vui chơi.", color: "bg-pink-500", icon: <QrCode size={24} /> },
            { id: 2, title: "Quét mã QR", desc: "Quét mã QR trên màn hình để bắt đầu hành trình sáng tạo.", color: "bg-yellow-400", icon: <Sparkles size={24} /> },
            { id: 3, title: "Tô màu & Gửi", desc: "Tô màu nhân vật thật đẹp, chụp ảnh và nhấn 'Gửi nhân vật'.", color: "bg-cyan-400", icon: <Activity size={24} /> },
            { id: 4, title: "Vui chơi", desc: "Nhân vật sẽ xuất hiện! Chạm vào màn hình để cho chúng ăn nhé.", color: "bg-emerald-500", icon: <Fish size={24} /> }
          ].map((step) => (
            <motion.div 
              key={step.id}
              whileHover={{ scale: 1.05, rotate: step.id % 2 === 0 ? 2 : -2 }}
              className="bg-white/10 backdrop-blur-md border-4 border-white/20 p-8 rounded-[40px] transition-all group shadow-2xl"
            >
              <div className="flex items-center gap-6 mb-4">
                <div className={`w-14 h-14 ${step.color} rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border-4 border-white/30`}>
                  {step.id}
                </div>
                <h3 className="text-white text-2xl font-black tracking-tight">{step.title}</h3>
              </div>
              <p className="text-white/90 text-lg leading-tight font-bold">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        <button 
          onClick={onStart} 
          className="group relative px-20 py-8 bg-yellow-400 text-blue-900 font-black rounded-[40px] text-4xl shadow-[0_20px_0_rgba(202,138,4,1)] hover:translate-y-2 hover:shadow-[0_10px_0_rgba(202,138,4,1)] active:translate-y-4 active:shadow-none transition-all duration-150 border-4 border-white"
        >
          <span className="flex items-center gap-6">
            <Play size={48} fill="currentColor" className="group-hover:scale-110 transition-transform" />
            BẮT ĐẦU CHƠI!
          </span>
        </button>
      </div>
    </motion.div>
  );
}

export function JoinModal({ onClose }: { onClose: () => void }) {
  const currentUrl = window.location.href;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[40px] p-10 max-w-md w-full text-center shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="w-20 h-20 bg-cyan-100 rounded-3xl flex items-center justify-center mx-auto mb-6"><QrCode size={40} className="text-cyan-600" /></div>
        <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">THAM GIA ĐẠI DƯƠNG</h2>
        <p className="text-slate-500 mb-8 font-medium">Quét mã này bằng điện thoại để vẽ và thả sinh vật của riêng bạn!</p>
        <div className="bg-slate-50 p-6 rounded-3xl mb-8 flex justify-center border-2 border-slate-100">
          <QRCodeSVG value={currentUrl} size={200} level="H" includeMargin={false} />
        </div>
        <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all uppercase tracking-widest">Đã hiểu</button>
      </motion.div>
    </motion.div>
  );
}

export function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-6" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-800 border border-slate-700 rounded-[40px] p-10 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-white tracking-tight">HƯỚNG DẪN TRẢI NGHIỆM</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={32} /></button>
        </div>
        
        <div className="space-y-8 text-left">
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">1</div>
              <h3 className="text-xl font-bold text-white">Tải lên sinh vật</h3>
            </div>
            <p className="text-slate-400 leading-relaxed pl-16">
              Nhấn nút <b>"Create Creature"</b> để bắt đầu. Bạn có thể chụp ảnh trực tiếp từ camera hoặc tải lên tệp ảnh (PNG, JPG), GIF hoặc Video ngắn từ máy.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">2</div>
              <h3 className="text-xl font-bold text-white">Rigging & Chuyển động tự động</h3>
            </div>
            <p className="text-slate-400 leading-relaxed pl-16">
              Hệ thống AI sẽ tự động nhận diện sinh vật của bạn và gắn bộ <b>Khớp xương (Rigging)</b> phù hợp. Bạn có thể tùy chỉnh kiểu chuyển động như: <i>Bơi lội, Bước đi, Nhảy nhót, Uốn lượn...</i> trong danh sách <b>Presets</b>.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">3</div>
              <h3 className="text-xl font-bold text-white">Tùy chỉnh màu sắc & 3D</h3>
            </div>
            <p className="text-slate-400 leading-relaxed pl-16">
              Bạn có thể thay đổi màu sắc của sinh vật bằng bộ lọc màu thông minh mà không làm mất đi hình dáng gốc. Bật <b>Chế độ 3D</b> để sinh vật có chiều sâu và uốn lượn sinh động hơn.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">4</div>
              <h3 className="text-xl font-bold text-white">Tương tác trong đại dương</h3>
            </div>
            <p className="text-slate-400 leading-relaxed pl-16">
              Chạm vào màn hình để thả thức ăn. Sinh vật sẽ bơi đến ăn và phát ra âm thanh tương tác. Bạn cũng có thể chạm trực tiếp vào sinh vật để trêu đùa chúng!
            </p>
          </section>
        </div>

        <button onClick={onClose} className="w-full mt-10 py-5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 uppercase tracking-widest">Khám phá ngay</button>
      </motion.div>
    </motion.div>
  );
}
