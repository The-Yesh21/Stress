import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BehaviorTracker } from '../lib/behaviorTracker';
import type { BehavioralFeatures } from '../lib/behaviorTracker';
import { faceTracker } from '../lib/faceTracker';
import { 
  Brain, MousePointer2, Camera, BarChart3, ChevronRight,
  User, CheckCircle2, AlertCircle, TrendingUp, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, RadarChart, 
  PolarGrid, PolarAngleAxis, Radar
} from 'recharts';

interface UnifiedAssessmentProps {
  onClose: () => void;
}

export const UnifiedAssessment: React.FC<UnifiedAssessmentProps> = ({ onClose }) => {
  const [phase, setPhase] = useState<'intro' | 'behavioral' | 'facial' | 'analyzing' | 'report'>('intro');
  const [timeLeft, setTimeLeft] = useState(30);
  
  // Data Storage
  const [behavioralData, setBehavioralData] = useState<BehavioralFeatures | null>(null);
  const [facialScore, setFacialScore] = useState<number>(0);
  const [advancedMetrics, setAdvancedMetrics] = useState({ darkCircles: 0, dullness: 0, aspectRatio: 1 });
  
  // Refs
  const behaviorTracker = useRef(new BehaviorTracker());
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const analysisRef = useRef<number | null>(null);

  // Behavioral Phase Start
  const startBehavioral = () => {
    setPhase('behavioral');
    setTimeLeft(30);
    behaviorTracker.current.start();
    
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          const data = behaviorTracker.current.stop();
          setBehavioralData(data);
          startFacialSetup();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Facial Phase Setup
  const startFacialSetup = async () => {
    setPhase('facial');
    setTimeLeft(30);
    await faceTracker.loadModels();
  };

  const onVideoMount = (node: HTMLVideoElement | null) => {
    if (node && phase === 'facial' && !videoElementRef.current) {
      videoElementRef.current = node;
      initFacialCamera(node);
    }
  };

  const initFacialCamera = async (node: HTMLVideoElement) => {
    try {
      await faceTracker.startCamera(node);
      
      // Start analysis loop
      analysisRef.current = window.setInterval(async () => {
        const detection = await faceTracker.analyzeFrame(node);
        if (detection) {
          setAdvancedMetrics(detection.advanced);
        }
      }, 500);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            finishAssessment();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      console.error(e);
      onClose();
    }
  };

  const finishAssessment = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (analysisRef.current) clearInterval(analysisRef.current);
    
    setFacialScore(faceTracker.getFinalScore());
    faceTracker.stopCamera();
    setPhase('analyzing');
    
    setTimeout(() => setPhase('report'), 2500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (analysisRef.current) clearInterval(analysisRef.current);
      faceTracker.stopCamera();
    };
  }, []);

  // Report Calculations
  const combinedScore = behavioralData ? (facialScore * 0.6 + 0.4) : 0; // Simplified for demo
  const getStressLevel = (score: number) => {
    if (score > 0.7) return { label: 'High', color: 'text-red-500', bg: 'bg-red-500/10' };
    if (score > 0.35) return { label: 'Moderate', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    return { label: 'Low', color: 'text-brand-green', bg: 'bg-brand-green/10' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-bg/98 backdrop-blur-xl p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-5xl my-auto">
        <AnimatePresence mode="wait">
          {/* Phase 0: Intro */}
          {phase === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 border border-white/10 rounded-[2.5rem] p-12 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-brand-green/5 to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-brand-green/20 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
                  <Brain className="text-brand-green" size={40} />
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-white">Full Cognitive Audit</h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
                  We are about to perform a multi-layered analysis of your mental state. 
                  First, we'll monitor your <span className="text-white font-bold">interaction dynamics</span>, 
                  followed by a <span className="text-white font-bold">physiological facial scan</span>.
                </p>

                <div className="flex flex-col md:flex-row gap-6 justify-center mb-12">
                  <div className="flex items-center gap-4 px-6 py-4 bg-white/5 rounded-2xl border border-white/5">
                    <MousePointer2 className="text-brand-green" />
                    <div className="text-left">
                      <div className="text-xs text-gray-500 font-bold uppercase">Stage 1</div>
                      <div className="text-sm font-bold text-white">Behavioral Analysis</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 px-6 py-4 bg-white/5 rounded-2xl border border-white/5">
                    <Camera className="text-brand-green" />
                    <div className="text-left">
                      <div className="text-xs text-gray-500 font-bold uppercase">Stage 2</div>
                      <div className="text-sm font-bold text-white">Physiological Scan</div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={startBehavioral}
                  className="group relative px-12 py-5 bg-brand-green text-dark-bg font-black rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(0,255,136,0.2)]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative flex items-center gap-3 text-lg">
                    Begin Dual Assessment <ChevronRight size={20} />
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Phase 1: Behavioral Test */}
          {phase === 'behavioral' && (
            <motion.div 
              key="behavioral"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 w-full"
            >
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-3xl font-bold flex items-center gap-3 text-white">
                    <MousePointer2 className="text-brand-green" /> Behavioral Interaction
                  </h2>
                  <p className="text-gray-500 mt-1">Analyzing typing and coordination patterns</p>
                </div>
                <div className="px-6 py-3 bg-brand-green/10 rounded-2xl border border-brand-green/20">
                  <span className="text-2xl font-mono font-black text-brand-green">{timeLeft}s</span>
                </div>
              </div>

              <div className="grid gap-8">
                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl text-gray-400 font-serif text-xl leading-relaxed italic select-none">
                  "The mind's internal state often manifests in the smallest of movements. 
                  Fluidity, speed, and rhythm of interaction provide a window into 
                  cognitive load and autonomic tension."
                </div>
                <textarea 
                  autoFocus
                  className="w-full h-48 bg-white/5 border border-white/10 rounded-3xl p-8 text-xl text-white focus:outline-none focus:border-brand-green/50 transition-all resize-none placeholder:text-gray-700"
                  placeholder="Type the text above to provide behavioral data..."
                />
              </div>
            </motion.div>
          )}

          {/* Phase 2: Facial Analysis */}
          {phase === 'facial' && (
            <motion.div 
              key="facial"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 w-full text-center"
            >
              <div className="flex justify-between items-center mb-8 text-left">
                <div>
                  <h2 className="text-3xl font-bold flex items-center gap-3 text-white">
                    <Camera className="text-brand-green" /> Physiological Scan
                  </h2>
                  <p className="text-gray-500 mt-1">Analyzing expressions, dullness, and ocular markers</p>
                </div>
                <div className="px-6 py-3 bg-brand-green/10 rounded-2xl border border-brand-green/20">
                  <span className="text-2xl font-mono font-black text-brand-green">{timeLeft}s</span>
                </div>
              </div>

              <div className="relative aspect-video max-w-3xl mx-auto bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                <video 
                  ref={onVideoMount}
                  autoPlay muted playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end text-left">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-brand-green">
                      <div className="w-2 h-2 bg-brand-green rounded-full animate-ping" />
                      <span className="text-[10px] font-black uppercase tracking-widest">AI Scanning Engaged</span>
                    </div>
                    <div className="text-xs text-gray-400 max-w-[200px]">
                      Extracting features: Aspect Ratio, Ocular Fatigue, Surface Dullness.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Phase 3: Analyzing */}
          {phase === 'analyzing' && (
            <motion.div 
              key="analyzing"
              className="text-center py-20 w-full"
            >
              <div className="relative w-32 h-32 mx-auto mb-12">
                <motion.div 
                  className="absolute inset-0 border-4 border-brand-green/20 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div 
                  className="absolute inset-0 border-t-4 border-brand-green rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 className="text-brand-green" size={40} />
                </div>
              </div>
              <h2 className="text-4xl font-black mb-4 text-white">Curating Your Report</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Synthesizing multi-modal data points into a comprehensive cognitive health overview...
              </p>
            </motion.div>
          )}

          {/* Phase 4: Beautiful Visual Report */}
          {phase === 'report' && (
            <motion.div 
              key="report"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-[3rem] p-8 md:p-16 relative overflow-hidden w-full"
            >
              <div className="absolute top-0 right-0 p-8">
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                  <X size={32} />
                </button>
              </div>

              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green/10 rounded-full text-brand-green text-xs font-black uppercase tracking-widest mb-4">
                    Clinical Audit Result
                  </div>
                  <h1 className="text-5xl font-black mb-4 text-white">Mental Performance <br/>Report</h1>
                  <p className="text-gray-500 flex items-center gap-2">
                    <User size={16} /> Patient Assessment ID: #STRESS-2026-0511
                  </p>
                </div>
                
                <div className="text-center p-8 bg-white/5 border border-white/10 rounded-[2rem] min-w-[240px]">
                  <div className="text-xs text-gray-500 uppercase font-black mb-2">Overall Stress Index</div>
                  <div className={`text-7xl font-black ${getStressLevel(combinedScore).color}`}>
                    {Math.round(combinedScore * 100)}%
                  </div>
                  <div className={`mt-4 px-4 py-1.5 rounded-full text-sm font-bold ${getStressLevel(combinedScore).bg} ${getStressLevel(combinedScore).color}`}>
                    {getStressLevel(combinedScore).label} Stress Detected
                  </div>
                </div>
              </div>

              {/* Main Visualizations */}
              <div className="grid lg:grid-cols-2 gap-8 mb-16">
                {/* Emotion Radar Chart */}
                <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem]">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-white">
                    <TrendingUp className="text-brand-green" size={20} /> Emotion Distribution
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[
                        { subject: 'Relaxed', A: Math.max(20, 100 - (facialScore * 100)) },
                        { subject: 'Anxious', A: facialScore * 80 },
                        { subject: 'Focused', A: behavioralData ? (behavioralData.typingSpeed / 8) : 50 },
                        { subject: 'Fatigued', A: advancedMetrics.dullness },
                        { subject: 'Agitated', A: facialScore * 60 },
                      ]}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 12 }} />
                        <Radar name="State" dataKey="A" stroke="#00FF88" fill="#00FF88" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Behavioral Metrics Bar Chart */}
                <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem]">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-white">
                    <MousePointer2 className="text-brand-green" size={20} /> Interaction Telemetry
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Speed', val: behavioralData?.mouseSpeed || 0 },
                        { name: 'Jitter', val: (behavioralData?.mouseJitter || 0) * 2 },
                        { name: 'Typing', val: (behavioralData?.typingSpeed || 0) * 2 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis dataKey="name" stroke="#666" />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                          itemStyle={{ color: '#00FF88' }}
                        />
                        <Bar dataKey="val" fill="#00FF88" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Advanced Markers */}
              <div className="grid md:grid-cols-3 gap-6 mb-16">
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-xs text-gray-500 uppercase font-bold">Ocular Fatigue</div>
                    <AlertCircle size={16} className={advancedMetrics.darkCircles > 50 ? 'text-yellow-500' : 'text-gray-700'} />
                  </div>
                  <div className="text-3xl font-black mb-2 text-white">{Math.round(advancedMetrics.darkCircles)}%</div>
                  <div className="text-[10px] text-gray-400">Under-eye luminosity deviation</div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-xs text-gray-500 uppercase font-bold">Dermal Dullness</div>
                    <CheckCircle2 size={16} className="text-brand-green" />
                  </div>
                  <div className="text-3xl font-black mb-2 text-white">{Math.round(advancedMetrics.dullness)}%</div>
                  <div className="text-[10px] text-gray-400">Surface reflectance analysis</div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-xs text-gray-500 uppercase font-bold">Tension Index</div>
                    <TrendingUp size={16} className="text-brand-green" />
                  </div>
                  <div className="text-3xl font-black mb-2 text-white">{advancedMetrics.aspectRatio.toFixed(2)}</div>
                  <div className="text-[10px] text-gray-400">Facial geometry aspect ratio</div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-brand-green/5 border border-brand-green/20 rounded-3xl p-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <CheckCircle2 className="text-brand-green" /> Curated Recommendations
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4 text-left">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center shrink-0 text-brand-green font-bold">1</div>
                      <p className="text-sm text-gray-300">Implement the 20-20-20 rule to reduce ocular strain markers detected in your scan.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center shrink-0 text-brand-green font-bold">2</div>
                      <p className="text-sm text-gray-300">Your interaction dynamics suggest high micro-motor tension. Practice 5 minutes of mindful box breathing.</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-left">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center shrink-0 text-brand-green font-bold">3</div>
                      <p className="text-sm text-gray-300">Dermal dullness markers suggest potential mild dehydration or lack of restful sleep.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center shrink-0 text-brand-green font-bold">4</div>
                      <p className="text-sm text-gray-300">Schedule a 15-minute digital detox within the next hour to reset your baseline.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 text-center">
                <button 
                  onClick={onClose}
                  className="px-12 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all"
                >
                  Download Detailed PDF Report
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
