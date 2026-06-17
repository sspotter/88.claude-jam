import React, { useEffect, useRef, useState } from 'react';
import { useScroll, useTransform, motion, useSpring } from "motion/react";

const TOTAL_FRAMES = 240;

const AnimationPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const [displayFrame, setDisplayFrame] = useState(1);

  // 1. Scroll Tracking & Smooth Physics
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const frameIndex = useTransform(
    smoothProgress,
    [0, 1],
    [0, TOTAL_FRAMES - 1]
  );

  // 2. Preload all images into memory
  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;
    let isCancelled = false;

    const preload = async () => {
      const BATCH_SIZE = 10;
      for (let i = 1; i <= TOTAL_FRAMES; i += BATCH_SIZE) {
        if (isCancelled) break;

        const batch = [];
        for (let j = i; j < i + BATCH_SIZE && j <= TOTAL_FRAMES; j++) {
          const frameStr = j.toString().padStart(3, '0');
          const src = `/assets/animations/frames/ezgif-frame-${frameStr}.jpg`;
          
          batch.push(new Promise<void>((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
              loadedCount++;
              setLoadPct(Math.floor((loadedCount / TOTAL_FRAMES) * 100));
              loadedImages[j - 1] = img; // Ensure correct index
              resolve();
            };
            img.onerror = () => {
              loadedCount++;
              resolve(); // Continue anyway
            };
          }));
        }
        await Promise.all(batch);
      }
      
      if (!isCancelled) {
        setImages(loadedImages);
        setIsReady(true);
      }
    };

    preload();
    return () => { isCancelled = true; };
  }, []);

  // 3. Canvas Rendering Engine
  useEffect(() => {
    if (!isReady || images.length === 0) return;

    const render = () => {
      const idx = Math.min(
        images.length - 1,
        Math.max(0, Math.floor(frameIndex.get()))
      );

      const img = images[idx];
      const canvas = canvasRef.current;
      if (!img || !canvas) return;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      // Update UI badge
      setDisplayFrame(idx + 1);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Object-Fit: Cover logic
      const scale = Math.max(
        canvas.width / img.width,
        canvas.height / img.height
      );
      const x = canvas.width / 2 - (img.width * scale) / 2;
      const y = canvas.height / 2 - (img.height * scale) / 2;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    };

    const unsubscribe = frameIndex.on("change", render);
    
    // Resize handler
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        render();
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial render + size

    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
    };
  }, [isReady, images, frameIndex]);

  return (
    <div className="bg-[#050505]">
      {/* Animation Container */}
      <div
        ref={containerRef}
        className="relative h-[400vh] w-full"
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          
          {/* Loading Screen Overlay */}
          {!isReady && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]">
              <div className="text-center text-white px-4">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" 
                />
                <h2 className="text-2xl mb-2 font-bold tracking-tight">Preparing Cinematic Experience</h2>
                <div className="w-64 h-1.5 bg-white/10 rounded-full mx-auto mb-3 overflow-hidden">
                  <motion.div 
                    className="h-full bg-amber-500" 
                    initial={{ width: 0 }}
                    animate={{ width: `${loadPct}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm text-gray-500 font-mono uppercase tracking-widest">{loadPct}% Cached</p>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="block h-screen w-full object-cover"
          />

          {/* Overlays */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             <motion.div 
               style={{ opacity: useTransform(smoothProgress, [0, 0.15, 0.3], [0, 1, 0]) }}
               className="text-center"
             >
               <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter italic">
                 Premium <span className="text-amber-500">Dates</span>
               </h1>
             </motion.div>

             <motion.div 
               style={{ opacity: useTransform(smoothProgress, [0.4, 0.55, 0.7], [0, 1, 0]) }}
               className="text-center"
             >
               <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic">
                 Naturally <span className="text-amber-500">Sweet</span>
               </h2>
             </motion.div>
          </div>

          {/* Progress Indicator */}
          <div className="absolute bottom-10 right-10 z-10">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-5 py-2">
              <span className="text-amber-500 text-xs font-mono font-bold tracking-widest">
                SCENE {displayFrame.toString().padStart(3, '0')} / {TOTAL_FRAMES}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Content */}
      <div className="relative z-20 bg-white py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
          >
            The Finest Medjool Selection
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 mb-10 leading-relaxed"
          >
            Sourced from the heart of the groves, our dates are hand-picked for their 
            exceptional size, texture, and caramel-like flavor. Experience luxury in every bite.
          </motion.p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-amber-600 text-white px-12 py-4 rounded-full text-xl font-bold transition-all shadow-2xl hover:bg-amber-700"
          >
            Explore Collection
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default AnimationPage;