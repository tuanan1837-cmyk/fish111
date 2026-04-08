/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, type ChangeEvent, Component } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Animal, type Background } from './db';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Howl } from 'howler';
import { 
  Plus, 
  X, 
  Sparkles, 
  Info,
  AlertCircle,
  Settings,
  Eye,
  EyeOff,
  QrCode,
  Minimize2,
  Maximize2,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { removeBackground } from "@imgly/background-removal";
import { QRCodeSVG } from 'qrcode.react';
import { 
  LocalAnimal, 
  BgFish, 
  Food, 
  OceanEvent, 
  Particle,
  ANIMATION_PRESETS 
} from './components/Ocean/Types';
import { 
  BACKGROUNDS, 
  PRESET_SOUNDS, 
  EXPLOSION_DURATION, 
  RESPAWN_DELAY, 
  BUBBLE_DURATION, 
  HATCH_DURATION, 
  BG_ROTATION_INTERVAL, 
  EVENT_INTERVAL, 
  EVENT_DURATION, 
  MAX_FOOD 
} from './components/Ocean/Constants';
import { AdminPanel } from './components/Ocean/AdminPanel';
import { CreateCreatureModal } from './components/Ocean/CreateCreatureModal';
import { GameStartOverlay, JoinModal, GuideModal } from './components/Ocean/Overlays';
import { LicenseOverlay } from './components/Ocean/LicenseOverlay';
import { LicenseService, type LicenseType } from './services/LicenseService';
import { MobileUpload } from './components/Ocean/MobileUpload';

// --- Main App Component ---

function MagicOceanApp() {
  const [localAnimals, setLocalAnimals] = useState<Record<string, LocalAnimal>>({});
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [food, setFood] = useState<Food[]>([]);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLicenseValid, setIsLicenseValid] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<{ key: string; machineId: string; type: LicenseType; activationDate: number; expiryDate: number; lastRunTime: number } | null>(null);
  const [forceLicenseLogin, setForceLicenseLogin] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'info' | 'success' } | null>(null);
  const [roomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'default';
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // --- Toast Helper ---
  const showToast = useCallback((message: string, type: 'error' | 'info' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleLicenseValidated = async () => {
    setIsLicenseValid(true);
    setForceLicenseLogin(false);
    const saved = await LicenseService.getSavedLicense();
    setLicenseInfo(saved || null);
  };

  const handleSwitchAccount = async () => {
    // Giữ lại license đã lưu để nếu người dùng đăng nhập lại cùng key thì thời gian còn lại không bị reset.
    setIsLicenseValid(false);
    setForceLicenseLogin(true);
    setLicenseInfo(null);
    setShowMenu(false);
    showToast('Bạn có thể đăng nhập tài khoản khác.', 'info');
  };

  // --- WebSocket Connection ---
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Main app received WebSocket message:', message);
        if (message.type === 'NEW_CHARACTER') {
          const char = message.data;
          console.log('Processing NEW_CHARACTER:', char);
          if (char.roomId !== roomId) {
            console.log('Room ID mismatch:', char.roomId, 'vs', roomId);
            return;
          }
          
          // Save to DB so it persists and syncs to local state
          await db.animals.add({
            name: char.name,
            type: char.type,
            color: char.color,
            image: char.image,
            sound: char.sound || 'Pop', // Use char.sound if available
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            isExploding: false,
            explosionStartTime: null,
            uid: 'remote-user',
            createdAt: Date.now(),
            respawnCount: 0,
            roomId: char.roomId,
            distortion: 1,
            animationType: char.animationType || char.type, // Use animationType if available
            flipX: false
          });

          showToast(`Nhân vật "${char.name}" vừa gia nhập đại dương!`, "success");
          console.log('Successfully added character to database:', char.name);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };
    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
    setWs(socket);
    return () => socket.close();
  }, [showToast]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  const lastFrameTime = useRef<number>(0);
  const lastClickTimeRef = useRef<number>(0);
  const requestRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Dexie Live Queries
  const animalsFromDb = useLiveQuery(() => db.animals.where('roomId').equals(roomId).toArray(), [roomId]);
  const customBackgrounds = useLiveQuery(() => db.backgrounds.toArray()) || [];
  const treasures = useLiveQuery(() => db.treasures.where('roomId').equals(roomId).toArray(), [roomId]) || [];
  const sounds = useLiveQuery(() => db.sounds.toArray()) || [];

  const bgmRef = useRef<InstanceType<typeof Howl> | null>(null);

  useEffect(() => {
    const activeBgm = sounds.find(s => s.type === 'bgm');
    if (activeBgm) {
      if (bgmRef.current) bgmRef.current.stop();
      bgmRef.current = new Howl({
        src: [activeBgm.url],
        loop: true,
        volume: 0.3,
        autoplay: gameStarted
      });
    }
    return () => { if (bgmRef.current) bgmRef.current.stop(); };
  }, [sounds, gameStarted]);

  const allBackgrounds = useMemo(() => [...BACKGROUNDS, ...customBackgrounds], [customBackgrounds]);

  // Sync DB animals to local state with extra properties
  useEffect(() => {
    if (!animalsFromDb) return;

    setLocalAnimals(prev => {
      const next: Record<string, LocalAnimal> = { ...prev };
      const dbIds = new Set(animalsFromDb.map(a => a.id?.toString()));

      // Remove old ones
      Object.keys(next).forEach(id => {
        if (!dbIds.has(id)) delete next[id];
      });

      // Add/Update
      animalsFromDb.forEach(data => {
        const id = data.id!.toString();
        const existing = prev[id];
        next[id] = {
          ...data,
          id: id as any,
          bobOffset: existing?.bobOffset || Math.random() * Math.PI * 2,
          wiggleOffset: existing?.wiggleOffset || Math.random() * Math.PI * 2,
          lastUpdate: Date.now(),
          hatchProgress: existing?.hatchProgress ?? 0,
          bubbles: existing?.bubbles || [],
          currentScaleX: existing?.currentScaleX || (data.vx > 0 ? 1 : -1),
          distortion: existing?.distortion || 0,
          animationPhase: existing?.animationPhase || Math.random() * Math.PI * 2,
        };
      });
      return next;
    });
  }, [animalsFromDb]);

  // --- Fullscreen Listener ---
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // --- Theater Mode ESC Key Listener ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTheaterMode) {
        setIsTheaterMode(false);
        if (document.fullscreenElement) document.exitFullscreen();
      }
    };
    if (isTheaterMode) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isTheaterMode]);

  // --- Background Rotation ---
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex(prev => (prev + 1) % allBackgrounds.length);
    }, BG_ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, [allBackgrounds.length]);

  // --- Canvas Rendering ---
  const animate = useCallback((time: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d', { alpha: true });
    if (!ctx) return;

    const deltaTime = time - lastFrameTime.current;
    lastFrameTime.current = time;

    const canvas = canvasRef.current;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Particles
    ctx.save();
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= (deltaTime / 1000);
      p.opacity = Math.max(0, p.life);
      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      let fillColor = p.color;
      if (p.color.startsWith('#')) {
        const r = parseInt(p.color.slice(1, 3), 16);
        const g = parseInt(p.color.slice(3, 5), 16);
        const b = parseInt(p.color.slice(5, 7), 16);
        fillColor = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
      }
      
      if (p.size < 5) {
        ctx.shadowBlur = 15 * p.life;
        ctx.shadowColor = 'white';
      } else {
        ctx.shadowBlur = 5 * p.life;
        ctx.shadowColor = p.color;
      }
      
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // Food
    setFood(prev => {
      const next = prev.map(f => ({ ...f, y: f.y + 0.5, opacity: f.opacity - 0.002 }));
      return next.filter(f => f.opacity > 0 && f.y < height);
    });

    food.forEach(f => {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
      grad.addColorStop(0, `rgba(255, 200, 50, ${f.opacity})`);
      grad.addColorStop(1, `rgba(255, 100, 0, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Treasures
    treasures.forEach(t => {
      ctx.save();
      ctx.translate(t.x, t.y + Math.sin(time * 0.002) * 10);
      ctx.fillStyle = t.type === 'gold' ? '#fbbf24' : t.type === 'silver' ? '#94a3b8' : '#818cf8';
      ctx.fillRect(-30, -30, 60, 60);
      ctx.restore();
    });

    // Animals
    (Object.values(localAnimals) as LocalAnimal[]).forEach(animal => {
      const animalKey = animal.id?.toString();
      if (!animalKey) return;
      if (!imageCache.current[animalKey]) {
        const img = new Image();
        img.src = animal.image;
        img.onload = () => { imageCache.current[animalKey] = img; };
        return;
      }

      const img = imageCache.current[animalKey];
      const now = Date.now();

      const isWaitingToRespawn = animal.isExploding && animal.respawnStartTime && (now - animal.respawnStartTime >= EXPLOSION_DURATION);

      if (animal.isExploding && animal.respawnStartTime) {
        const elapsed = now - animal.respawnStartTime;
        if (elapsed > RESPAWN_DELAY) {
          animal.isExploding = false;
          animal.vx = (Math.random() - 0.5) * 4;
          animal.vy = (Math.random() - 0.5) * 4;
          animal.distortion = 0;
          animal.hatchProgress = 1; 

          db.animals.update(Number(animal.id), {
            isExploding: false,
            explosionStartTime: null,
            respawnStartTime: null,
            vx: animal.vx,
            vy: animal.vy,
            distortion: 0,
            createdAt: Date.now()
          });
          
          for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            particlesRef.current.push({
              x: animal.x, y: animal.y, 
              vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
              size: 2 + Math.random() * 3, color: '#ffffff', life: 0.5, opacity: 0.8
            });
          }
          new Audio(PRESET_SOUNDS['Pop']).play().catch(() => {});
        }
      }

      if (!animal.isExploding) {
        let targetFood = food.find(f => f.id === animal.targetFoodId);
        if (!targetFood && food.length > 0) {
          targetFood = food[Math.floor(Math.random() * food.length)];
          animal.targetFoodId = targetFood.id;
        }

        if (targetFood) {
          const dx = targetFood.x - animal.x;
          const dy = targetFood.y - animal.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 10) {
            animal.targetFoodId = null;
            animal.distortion = 0;
          } else {
            animal.vx += (dx / dist) * 0.1;
            animal.vy += (dy / dist) * 0.1;
          }
        }

        const speed = Math.sqrt(animal.vx * animal.vx + animal.vy * animal.vy);
        const maxSpeed = 3;
        if (speed > maxSpeed) {
          animal.vx = (animal.vx / speed) * maxSpeed;
          animal.vy = (animal.vy / speed) * maxSpeed;
        }

        animal.x += animal.vx * (deltaTime / 16);
        animal.y += animal.vy * (deltaTime / 16);
        animal.bobOffset += 0.05 + Math.abs(animal.vy) * 0.02;
        animal.wiggleOffset += 0.12 + Math.abs(animal.vx) * 0.04;
        animal.animationPhase += 0.05 + Math.abs(animal.vx + animal.vy) * 0.01;
        animal.distortion = Math.min(1, animal.distortion + deltaTime / (5 * 60 * 1000));

        const targetScaleX = animal.vx > 0 ? 1 : -1;
        animal.currentScaleX += (targetScaleX - animal.currentScaleX) * 0.1;

        const margin = 100;
        if (animal.x < margin) { animal.x = margin; animal.vx *= -1; }
        else if (animal.x > width - margin) { animal.x = width - margin; animal.vx *= -1; }
        if (animal.y < margin) { animal.y = margin; animal.vy *= -1; }
        else if (animal.y > height - margin) { animal.y = height - margin; animal.vy *= -1; }

        if (Math.random() < 0.05) {
          animal.bubbles.push({
            x: animal.x - (animal.vx * 20),
            y: animal.y + (Math.random() - 0.5) * 20,
            size: 2 + Math.random() * 4,
            opacity: 0.6,
            speed: 0.5 + Math.random() * 1
          });
        }
        animal.bubbles.forEach((b, i) => {
          b.y -= b.speed;
          b.opacity -= 0.01;
          if (b.opacity <= 0) animal.bubbles.splice(i, 1);
        });
      }

      if (animal.hatchProgress < 1) {
        animal.hatchProgress += deltaTime / HATCH_DURATION;
        if (animal.hatchProgress > 1) animal.hatchProgress = 1;
      }

      ctx.save();
      animal.bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity})`;
        ctx.fill();
      });
      ctx.restore();

      ctx.save();
      const bob = Math.sin(animal.bobOffset) * 15;
      const wiggle = Math.sin(animal.wiggleOffset) * 0.1;
      const gallopRot = Math.sin(animal.bobOffset * 2) * 0.05;
      const gallopX = Math.cos(animal.bobOffset * 2) * 5;
      const scale = animal.hatchProgress;
      
      const isCurrentlyExploding = animal.isExploding && animal.explosionStartTime && (now - animal.explosionStartTime < EXPLOSION_DURATION);

      if (isWaitingToRespawn) {
        const elapsed = now - animal.respawnStartTime!;
        const isBubblePhase = elapsed >= RESPAWN_DELAY - BUBBLE_DURATION;
        
        if (isBubblePhase) {
          const bubbleElapsed = elapsed - (RESPAWN_DELAY - BUBBLE_DURATION);
          const bubbleProgress = Math.min(bubbleElapsed / BUBBLE_DURATION, 1);
          
          ctx.save();
          ctx.translate(animal.x + gallopX, animal.y + bob);
          
          ctx.save();
          ctx.scale(bubbleProgress * animal.currentScaleX, bubbleProgress);
          ctx.globalAlpha = 0.4 + 0.6 * bubbleProgress;
          if (img) ctx.drawImage(img, -128, -128, 256, 256);
          ctx.restore();
          
          ctx.beginPath();
          ctx.arc(0, 0, 140 * bubbleProgress, 0, Math.PI * 2);
          const bubbleGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 140 * bubbleProgress);
          bubbleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
          bubbleGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.2)');
          bubbleGrad.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
          ctx.fillStyle = bubbleGrad;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
          
          ctx.beginPath();
          ctx.ellipse(-40, -40, 30, 15, -Math.PI/4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fill();
          
          if (Math.random() < 0.1) {
            particlesRef.current.push({
              x: animal.x + (Math.random() - 0.5) * 160,
              y: animal.y + (Math.random() - 0.5) * 160,
              vx: 0, vy: -0.5, size: 2 + Math.random() * 3, color: '#ffffff', life: 1.0, opacity: 0.5
            });
          }
          
          ctx.restore();
        }
        return;
      }

      const renderX = isCurrentlyExploding && animal.oldX !== undefined ? animal.oldX : animal.x;
      const renderY = isCurrentlyExploding && animal.oldY !== undefined ? animal.oldY : animal.y;

      ctx.save();
      ctx.translate(renderX + gallopX, renderY + bob + 80);
      const shadowSquash = 1 + Math.sin(animal.bobOffset * 2) * 0.1;
      ctx.scale(scale * animal.currentScaleX * (1/shadowSquash), scale * 0.3 * shadowSquash);
      ctx.globalAlpha = 0.1 * scale;
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      ctx.translate(renderX + gallopX, renderY + bob);
      
      ctx.save();
      if (isCurrentlyExploding) {
        const elapsed = now - animal.explosionStartTime!;
        const progress = Math.min(elapsed / EXPLOSION_DURATION, 1);
        const explosionScale = 1 + progress * 0.8;
        ctx.scale(explosionScale * animal.currentScaleX, explosionScale);
        ctx.globalAlpha = 1 - progress;
        ctx.shadowBlur = 20 * (1 - progress);
        ctx.shadowColor = 'white';
      } else {
        ctx.scale(scale * animal.currentScaleX, scale);
        ctx.globalAlpha = scale;
        if (scale < 1) {
          ctx.shadowBlur = 15 * (1 - scale);
          ctx.shadowColor = animal.color || 'white';
        }
      }
      
      ctx.rotate(wiggle + gallopRot);
      const animType = animal.animationType || 'swim';
      let bendX = 0, bendY = 0, rotation = 0, scaleY = 1, scaleX = 1;

      switch(animType) {
        case 'swim':
          bendX = Math.sin(time * 0.005 + animal.bobOffset) * 0.2;
          rotation = Math.atan2(animal.vy, Math.abs(animal.vx) + 0.1) * 0.4;
          break;
        case 'wiggle':
          bendX = Math.sin(time * 0.008) * 0.3;
          scaleY = 1 + Math.sin(time * 0.01) * 0.1;
          break;
        case 'walk':
          const walkCycle = Math.sin(time * 0.01);
          bendY = Math.abs(walkCycle) * 0.1;
          rotation = walkCycle * 0.05;
          break;
        case 'jump':
          const jumpCycle = Math.sin(time * 0.005);
          if (jumpCycle > 0) bendY = -jumpCycle * 0.2;
          scaleY = 1 - Math.abs(bendY);
          break;
        case 'float':
          bendX = Math.cos(time * 0.002) * 0.1;
          bendY = Math.sin(time * 0.002) * 0.1;
          rotation = Math.sin(time * 0.001) * 0.1;
          break;
        case 'spin':
          rotation = time * 0.005;
          break;
        case 'crawl':
          bendX = Math.sin(time * 0.01) * 0.1;
          bendY = Math.abs(Math.sin(time * 0.01)) * 0.05;
          break;
        case 'fly':
          scaleY = 1 + Math.sin(time * 0.02) * 0.3;
          bendY = Math.sin(time * 0.01) * 0.1;
          break;
        case 'bounce':
          scaleY = 1 + Math.abs(Math.sin(time * 0.01)) * 0.4;
          scaleX = 1 / scaleY;
          break;
        case 'shake':
          bendX = (Math.random() - 0.5) * 0.1;
          bendY = (Math.random() - 0.5) * 0.1;
          break;
        case 'wave':
          rotation = Math.sin(time * 0.01) * 0.3;
          break;
        case 'pulse':
          const p = 1 + Math.sin(time * 0.01) * 0.2;
          scaleX = p; scaleY = p;
          break;
      }

      ctx.rotate(rotation);
      ctx.transform(1, bendY, bendX * (animal.currentScaleX > 0 ? -1 : 1), 1, 0, 0);
      ctx.scale(scaleX, scaleY);

      if (animal.color && animal.color !== '#4F46E5') {
        ctx.filter = `hue-rotate(${parseInt(animal.color.slice(1), 16) % 360}deg) saturate(1.5)`;
      }

      if (animal.image.startsWith('data:video/')) {
        if (!animal.videoElement) {
          const v = document.createElement('video');
          v.src = animal.image; v.loop = true; v.muted = true;
          v.play().catch(() => {});
          animal.videoElement = v;
        }
        ctx.drawImage(animal.videoElement, -64, -64, 128, 128);
      } else {
        ctx.drawImage(img, -64, -64, 128, 128);
      }
      ctx.restore();

      if (animal.name) {
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'black';
        ctx.fillText(animal.name, 0, -80);
        ctx.shadowBlur = 0;
      }

      if (animal.hatchProgress < 1) {
        ctx.beginPath();
        ctx.arc(0, 0, 80, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * (1 - animal.hatchProgress)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    });

    requestRef.current = requestAnimationFrame(animate);
  }, [localAnimals, food, treasures]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [animate]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files) as any[]) {
      if (file.size > 100 * 1024 * 1024) { showToast("Tệp quá lớn. Vui lòng chọn tệp dưới 100MB.", "error"); continue; }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const url = event.target?.result as string;
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        try {
          const id = await db.backgrounds.add({ type, url });
          showToast(`Đã thêm ${type === 'video' ? 'video' : 'hình'} nền mới!`, 'success');
          const allBgs = [...BACKGROUNDS, ...customBackgrounds, { type, url, id }];
          setCurrentBgIndex(allBgs.length - 1);
        } catch (err) {
          console.error("Upload background failed:", err);
          showToast("Không thể tải lên hình nền.", "error");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClick = async (e: React.MouseEvent | React.TouchEvent) => {
    if (showCreateModal) return;
    const now = Date.now();
    if (now - lastClickTimeRef.current < 200) return;
    lastClickTimeRef.current = now;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const hitTreasure = treasures.find(t => Math.sqrt((x - t.x) ** 2 + (y - t.y) ** 2) < 50);
    if (hitTreasure) {
      await db.treasures.delete(hitTreasure.id!);
      showToast(`Đã thu thập kho báu ${hitTreasure.type}!`, "success");
      return;
    }
    const hitAnimal = (Object.values(localAnimals) as LocalAnimal[])
      .reverse()
      .find(a => {
        const isCurrentlyExploding = a.isExploding && (Date.now() - (a.explosionStartTime || 0) < EXPLOSION_DURATION);
        if (isCurrentlyExploding) return false;
        const bob = Math.sin(a.bobOffset) * 10;
        const dx = x - a.x;
        const dy = y - (a.y + bob);
        return Math.sqrt(dx * dx + dy * dy) < 70;
      });
    if (hitAnimal?.id != null) {
      triggerExplosion(hitAnimal.id.toString());
    } else {
      dropFood(x, y);
    }
  };

  const triggerExplosion = async (id: string) => {
    const animal = localAnimals[id];
    if (!animal) return;
    const soundUrl = PRESET_SOUNDS[animal.sound] || animal.sound;
    if (soundUrl) { const audio = new Audio(soundUrl); audio.volume = 0.5; audio.play().catch(() => {}); }
    new Audio(PRESET_SOUNDS['Pop']).play().catch(() => {});
    const width = window.innerWidth;
    const height = window.innerHeight;
    const currentRespawnCount = animal.respawnCount || 0;
    if (currentRespawnCount < 4) {
      const newX = Math.max(100, Math.min(width - 100, animal.x + (Math.random() - 0.5) * 300));
      const newY = Math.max(100, Math.min(height - 100, animal.y + (Math.random() - 0.5) * 300));
      await db.animals.update(Number(id), {
        isExploding: true, explosionStartTime: Date.now(), respawnStartTime: Date.now(),
        oldX: animal.x, oldY: animal.y, x: newX, y: newY, vx: 0, vy: 0, respawnCount: currentRespawnCount + 1
      });
    } else {
      await db.animals.update(Number(id), { isExploding: true, explosionStartTime: Date.now(), respawnStartTime: null, oldX: animal.x, oldY: animal.y });
      setTimeout(async () => { await db.animals.delete(Number(id)); }, EXPLOSION_DURATION + 100);
    }
    particlesRef.current.push({ x: animal.x, y: animal.y, vx: 0, vy: 0, size: 120, color: '#ffffff', life: 0.3, opacity: 0.9 });
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 8;
      const isSparkle = Math.random() < 0.3;
      particlesRef.current.push({
        x: animal.x, y: animal.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: isSparkle ? 2 + Math.random() * 4 : 4 + Math.random() * 8, 
        color: isSparkle ? '#ffffff' : (animal.color || '#ffffff'), life: 0.5 + Math.random() * 0.5, opacity: 1.0
      });
    }
  };

  const createNewAnimal = async (name: string, type: string, color: string, image: string, sound: string, is3DMode: boolean = true, animationType: string = 'swim') => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    await db.animals.add({
      name, type, color, image, sound,
      x: 100 + Math.random() * (width - 200),
      y: 100 + Math.random() * (height - 200),
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      isExploding: false,
      explosionStartTime: null,
      uid: 'local-user',
      createdAt: Date.now(),
      respawnCount: 0,
      roomId,
      distortion: is3DMode ? 1 : 0,
      animationType,
      flipX: false
    });
  };

  const checkContentWithGemini = async (base64Image: string) => {
    // Gemini content moderation - skipped if API key not configured
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not configured - skipping moderation');
      return { safe: true, isCreature: true, suggestedName: "New Friend", suggestedType: "Other", suggestedAnimation: "swim", reason: "" };
    }
    
    try {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent([
        `Analyze this image of a painted statue or drawing. 
        1. Is it safe for children? (safe: boolean)
        2. Is it a character, animal, or creature? (isCreature: boolean)
        3. What is it? (e.g., "Blue Dragon", "Pink Cat") (suggestedName: string)
        4. What category does it fit? (Fish, Shark, Turtle, Jellyfish, Dragon, Other) (suggestedType: string)
        5. Which animation preset fits best? (swim, wiggle, walk, jump, float, spin) (suggestedAnimation: string)
        6. Why did you reject it if unsafe? (reason: string)
        Return ONLY JSON.`,
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image.split(',')[1]
          }
        }
      ]);
      
      const responseText = response.response.text();
      return JSON.parse(responseText || '{}');
    } catch (err) {
      console.error("Moderation failed:", err);
      return { safe: true, isCreature: true, suggestedName: "New Friend", suggestedType: "Other", suggestedAnimation: "swim", reason: "" };
    }
  };

  const dropFood = (x: number, y: number) => {
    const newFood: Food = { id: Math.random().toString(36).substr(2, 9), x, y, opacity: 1, size: 4 + Math.random() * 4 };
    setFood(prev => [...prev.slice(-MAX_FOOD + 1), newFood]);
  };

  const clearOcean = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ sinh vật và vật phẩm trong đại dương không?")) return;
    await db.animals.where('roomId').equals(roomId).delete();
    await db.treasures.where('roomId').equals(roomId).delete();
    setFood([]);
    showToast("Đã dọn dẹp sạch sẽ đại dương!", "success");
  };

  const processImage = async (file: File): Promise<string> => {
    try {
      const resizedFile: any = await new Promise<File>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 512;
            let width = img.width, height = img.height;
            if (width > height) { if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; } }
            else { if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => { if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' })); }, 'image/jpeg', 0.8);
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
      let blob: any;
      try { 
        blob = await removeBackground(resizedFile, { model: 'isnet_fp16', output: { format: 'image/png', quality: 0.8 } });
      }
      catch (bgError) { 
        const response = await fetch(URL.createObjectURL(resizedFile)); 
        blob = await response.blob(); 
      }
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return reject("Canvas context failed");
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            if (!tempCtx) return reject("Temp canvas failed");
            tempCanvas.width = img.width; tempCanvas.height = img.height; tempCtx.drawImage(img, 0, 0);
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            let minX = tempCanvas.width, minY = tempCanvas.height, maxX = 0, maxY = 0, found = false;
            for (let y = 0; y < tempCanvas.height; y++) {
              for (let x = 0; x < tempCanvas.width; x++) {
                if (data[(y * tempCanvas.width + x) * 4 + 3] > 20) {
                  if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; found = true;
                }
              }
            }
            canvas.width = 256; canvas.height = 256;
            if (found) {
              const contentWidth = maxX - minX, contentHeight = maxY - minY;
              const size = Math.max(contentWidth, contentHeight);
              const scale = 220 / size, drawWidth = contentWidth * scale, drawHeight = contentHeight * scale;
              ctx.drawImage(img, minX, minY, contentWidth, contentHeight, (256 - drawWidth) / 2, (256 - drawHeight) / 2, drawWidth, drawHeight);
            } else { ctx.drawImage(img, 0, 0, 256, 256); }
            resolve(canvas.toDataURL('image/png'));
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
            canvas.width = 256; canvas.height = 256; ctx?.drawImage(img, 0, 0, 256, 256);
            resolve(canvas.toDataURL('image/png'));
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Periodic License Check
  useEffect(() => {
    const check = async () => {
      if (!isLicenseValid) return;
      const result = await LicenseService.checkLicenseStatus();
      if (result.status !== 'valid') {
        setIsLicenseValid(false);
        setLicenseInfo(null);
      } else {
        setIsLicenseValid(true);
        setLicenseInfo(result.license || licenseInfo);
      }
    };
    check();
    const interval = setInterval(check, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isLicenseValid, licenseInfo]);

  if (window.location.pathname === '/upload') {
    return <MobileUpload />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">
      {!isLicenseValid && <LicenseOverlay key={forceLicenseLogin ? 'force-login' : 'normal-login'} forceLogin={forceLicenseLogin} onValidated={handleLicenseValidated} onOpenAdmin={() => setShowAdminPanel(true)} />}
      <AnimatePresence mode="wait">
        <motion.div key={currentBgIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2 }} className="absolute inset-0 z-0">
          {(() => {
            const currentBg = allBackgrounds[currentBgIndex] || allBackgrounds[0];
            if (!currentBg) return <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white/20 font-bold uppercase tracking-widest">No Background Uploaded</div>;
            return currentBg.type === 'video' ? (
              <video src={currentBg.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={currentBg.url} className="w-full h-full object-cover" alt="Ocean Background" referrerPolicy="no-referrer" />
            );
          })()}
        </motion.div>
      </AnimatePresence>
      <canvas ref={canvasRef} className="absolute inset-0 z-10 cursor-pointer" onClick={(e) => {
        if (isTheaterMode) {
          setIsTheaterMode(false);
          if (document.fullscreenElement) document.exitFullscreen();
        } else {
          handleClick(e);
        }
      }} onTouchStart={(e) => {
        if (isTheaterMode) {
          setIsTheaterMode(false);
          if (document.fullscreenElement) document.exitFullscreen();
        } else {
          handleClick(e);
        }
      }} />
      {!isTheaterMode && (
        <div className="absolute inset-0 z-20 pointer-events-none p-6 flex flex-col justify-end items-end">
          <div className="flex flex-col gap-3 pointer-events-auto items-end">
            <AnimatePresence>
              {showMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="flex flex-col gap-2 mb-2"
                >
                  {licenseInfo && (
                    <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 text-left text-xs text-slate-200">
                      <div className="mb-3 text-slate-400 uppercase tracking-[0.25em] font-black">License Khách</div>
                      <div className="mb-2 text-sm font-semibold text-white">{licenseInfo.type === 'perm' ? 'Vĩnh viễn' : LicenseService.formatRemainingTime(licenseInfo.expiryDate)}</div>
                      <button
                        onClick={handleSwitchAccount}
                        className="w-full py-3 bg-red-500/10 text-red-400 font-bold rounded-2xl border border-red-500/20 hover:bg-red-500/15 transition-all"
                      >
                        Đăng nhập tài khoản khác
                      </button>
                    </div>
                  )}
                  <button onClick={() => setShowCreateModal(true)} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-500 transition-all flex items-center gap-3">
                    <Plus size={20} /><span className="text-sm font-bold uppercase tracking-widest">Tải nhân vật</span>
                  </button>
                  <button onClick={() => setShowAdminPanel(true)} className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all flex items-center gap-3">
                    <Settings size={20} /><span className="text-sm font-bold uppercase tracking-widest">Cài đặt</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsTheaterMode(true);
                      setShowMenu(false);
                      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
                    }} 
                    className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all flex items-center gap-3"
                  >
                    <Maximize2 size={20} /><span className="text-sm font-bold uppercase tracking-widest">Rạp Chiếu Phim</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <button 
              onClick={() => setShowMenu(!showMenu)} 
              className={`p-5 rounded-full shadow-2xl transition-all ${showMenu ? 'bg-white text-slate-900 rotate-90' : 'bg-slate-900/80 text-white backdrop-blur-md border border-white/10'}`}
            >
              <Settings size={28} />
            </button>
          </div>
        </div>
      )}
      <AnimatePresence>
        {showAdminPanel && (
          <AdminPanel animals={Object.values(localAnimals)} onDelete={(id: any) => db.animals.delete(parseInt(id))} onClear={clearOcean} onClose={() => setShowAdminPanel(false)} onBackgroundUpload={handleBackgroundUpload} customBackgrounds={customBackgrounds} isAdminAuthenticated={isAdminAuthenticated} onAuthenticate={(pass: any) => { if (pass === '7121992') { setIsAdminAuthenticated(true); showToast("Đã xác thực Quản trị viên", "success"); } else { showToast("Mật khẩu không đúng", "error"); } }} roomId={roomId} />
        )}
      </AnimatePresence>
      <AnimatePresence>{!gameStarted && <GameStartOverlay onStart={() => setGameStarted(true)} />}</AnimatePresence>
      <AnimatePresence>{showCreateModal && <CreateCreatureModal onClose={() => setShowCreateModal(false)} onCreate={createNewAnimal} processImage={processImage} checkContent={checkContentWithGemini} />}</AnimatePresence>
      <AnimatePresence>{showJoinModal && <JoinModal onClose={() => setShowJoinModal(false)} />}</AnimatePresence>
      <AnimatePresence>{showGuideModal && <GuideModal onClose={() => setShowGuideModal(false)} />}</AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 50, x: '-50%' }} className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md ${toast.type === 'error' ? 'bg-red-500/90 text-white' : toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-indigo-600/90 text-white'}`}>
            {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}<span className="font-medium">{toast.message}</span><button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const isUploadPage = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const hasUpload = params.has('upload') || window.location.hash.includes('upload');
    console.log('URL:', window.location.href, 'isUploadPage:', hasUpload);
    return hasUpload;
  }, []);

  return isUploadPage ? <MobileUpload /> : <MagicOceanApp />;
}
