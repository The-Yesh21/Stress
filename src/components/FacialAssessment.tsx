import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { faceTracker } from '../lib/faceTracker';
import type { FacialEmotions } from '../lib/faceTracker';
import * as faceapi from '@vladmandic/face-api';
import { Camera, Timer, RefreshCw, X, ShieldCheck, Activity, BrainCircuit } from 'lucide-react';

interface FacialAssessmentProps {
  onClose: () => void;
}

export const FacialAssessment: React.FC<FacialAssessmentProps> = ({ onClose }) => {
  const [step, setStep] = useState<'intro' | 'loading' | 'active' | 'analyzing' | 'result'>('intro');
  const [timeLeft, setTimeLeft] = useState(30);
  const [result, setResult] = useState<number | null>(null);
  const [instantEmotions, setInstantEmotions] = useState<FacialEmotions | null>(null);
  const [instantStress, setInstantStress] = useState<number>(0);
  
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const analysisRef = useRef<number | null>(null);

  const videoRef = (node: HTMLVideoElement | null) => {
    if (node && step === 'active' && !videoElementRef.current) {
      videoElementRef.current = node;
      initCamera(node);
    }
  };

  const initCamera = async (node: HTMLVideoElement) => {
    try {
      await faceTracker.startCamera(node);
      start30Seconds();
    } catch (error) {
      console.error("Camera start failed:", error);
      onClose();
    }
  };

  const startSetup = async () => {
    setStep('loading');
    try {
      await faceTracker.loadModels();
      setStep('active');
    } catch (error) {
      console.error("Failed to initialize facial assessment:", error);
      onClose();
    }
  };

  const start30Seconds = () => {
    setTimeLeft(30);
    
    // Analysis Loop (every 100ms for smooth visuals)
    analysisRef.current = window.setInterval(async () => {
      if (videoElementRef.current && canvasRef.current) {
        const detection = await faceTracker.analyzeFrame(videoElementRef.current);
        
        if (detection) {
          const emotions = detection.expressions as unknown as FacialEmotions;
          setInstantEmotions(emotions);
          setInstantStress(faceTracker.calculateInstantScore(emotions));

          // Draw Face Mesh / Overlay
          const canvas = canvasRef.current;
          const displaySize = { 
            width: videoElementRef.current.offsetWidth, 
            height: videoElementRef.current.offsetHeight 
          };
          
          if (canvas.width !== displaySize.width) {
            canvas.width = displaySize.width;
            canvas.height = displaySize.height;
          }

          const resizedDetections = faceapi.resizeResults(detection, displaySize);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Draw Box
            faceapi.draw.drawDetections(canvas, resizedDetections);
            // Draw Expressions (Simplified)
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections, 0.5);
          }
        }
      }
    }, 100);

    // Timer Loop
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finishAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const finishAssessment = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (analysisRef.current) clearInterval(analysisRef.current);
    
    setStep('analyzing');
    
    setTimeout(() => {
      const score = faceTracker.getFinalScore();
      setResult(score);
      faceTracker.stopCamera();
      setStep('result');
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (analysisRef.current) clearInterval(analysisRef.current);
      faceTracker.stopCamera();
    };
  }, []);

  const getDominantEmotion = () => {
    if (!instantEmotions) return 'Detecting...';
    const entries = Object.entries(instantEmotions);
    const dominant = entries.reduce((a, b) => a[1] > b[1] ? a : b);
    return dominant[0].charAt(0).toUpperCase() + dominant[0].slice(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-bg/95 backdrop-blur-md p-6">
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-2 text-gray-400 hover:text-white transition-colors"
      >
        <X size={24} />
      </button>

      <div className="w-full max-w-4xl bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-2xl mx-auto"
            >
              <div className="w-16 h-16 bg-brand-green/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Camera className="text-brand-green" size={32} />
              </div>
              <h2 className="text-3xl font-bold mb-4">Facial Stress Analysis</h2>
              <p className="text-gray-400 mb-8">
                Our AI will analyze micro-expressions and muscle tension in your face over 30 seconds to detect physiological signs of stress.
              </p>
              
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center">
                  <Activity size={20} className="text-brand-green mb-2" />
                  <span className="text-[10px] uppercase text-gray-500 font-bold">Real-time</span>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center">
                  <BrainCircuit size={20} className="text-brand-green mb-2" />
                  <span className="text-[10px] uppercase text-gray-500 font-bold">AI Mesh</span>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center">
                  <ShieldCheck size={20} className="text-brand-green mb-2" />
                  <span className="text-[10px] uppercase text-gray-500 font-bold">Secure</span>
                </div>
              </div>

              <button 
                onClick={startSetup}
                className="w-full py-4 bg-brand-green text-dark-bg font-bold rounded-xl hover:scale-[1.02] transition-transform active:scale-95 shadow-[0_0_20px_rgba(0,255,136,0.2)]"
              >
                Allow Camera & Start
              </button>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <RefreshCw className="text-brand-green mx-auto mb-6 animate-spin" size={48} />
              <h3 className="text-2xl font-bold mb-2">Initializing AI Engine</h3>
              <p className="text-gray-400">Loading computer vision models and mesh generators...</p>
            </motion.div>
          )}

          {step === 'active' && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-3 gap-8"
            >
              {/* Left Panel: Stats */}
              <div className="md:col-span-1 space-y-6">
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-bold">Current Metrics</div>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-400">Stress Potential</span>
                        <span className="text-brand-green font-mono">{Math.round(instantStress * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-brand-green"
                          animate={{ width: `${instantStress * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-400 mb-1">Detected Emotion</div>
                      <div className="text-xl font-bold text-white">{getDominantEmotion()}</div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-brand-green mb-2">
                        <Timer size={16} />
                        <span className="text-sm font-bold uppercase">Time Remaining</span>
                      </div>
                      <div className="text-3xl font-mono font-black">{timeLeft}s</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-brand-green/10 border border-brand-green/20 rounded-xl">
                  <p className="text-[10px] text-brand-green/80 uppercase font-black mb-1">Live Telemetry</p>
                  <p className="text-xs text-gray-400 leading-relaxed italic">
                    AI is analyzing facial muscle micro-movements to detect autonomic nervous system responses.
                  </p>
                </div>
              </div>

              {/* Main Panel: Video */}
              <div className="md:col-span-2 relative">
                <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    muted 
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <canvas 
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full scale-x-[-1]"
                  />
                  
                  {/* Overlay HUD */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">AI Processing</span>
                  </div>
                </div>
                
                <p className="mt-4 text-sm text-gray-500 text-center italic">
                  Look at the camera. The AI mesh will track your expressions automatically.
                </p>
              </div>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <RefreshCw className="text-brand-green mx-auto mb-6 animate-spin" size={48} />
              <h3 className="text-2xl font-bold mb-2">Generating Report</h3>
              <p className="text-gray-400">Aggregating 30 seconds of physiological expression data...</p>
            </motion.div>
          )}

          {step === 'result' && result !== null && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-2xl mx-auto"
            >
              <h2 className="text-3xl font-bold mb-2">Analysis Complete</h2>
              <div className="my-8">
                <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Final Stress Index</div>
                <div className="text-7xl font-black text-brand-green mb-4">
                  {Math.round(result * 100)}%
                </div>
                <div className={`inline-flex px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${
                  result > 0.6 ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 
                  result > 0.3 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 
                  'bg-brand-green/20 text-brand-green border border-brand-green/30'
                }`}>
                  {result > 0.6 ? 'High Physiological Tension' : 
                   result > 0.3 ? 'Moderate Engagement' : 
                   'Calm & Balanced State'}
                </div>
              </div>

              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 mb-8 text-left text-sm text-gray-400 leading-relaxed">
                <p>Based on our AI's analysis of your micro-expressions during the 30-second window, we've identified patterns consistent with {
                  result > 0.6 ? 'significant cognitive strain and muscular tension around the brow and jaw areas.' : 
                  result > 0.3 ? 'a state of focused activity with minor indicators of fatigue or stress.' : 
                  'a relaxed physiological baseline with no significant stress markers detected.'
                }</p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep('intro')}
                  className="flex-1 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
                >
                  Retest
                </button>
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 bg-brand-green text-dark-bg font-bold rounded-xl hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(0,255,136,0.2)]"
                >
                  Close Analysis
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
