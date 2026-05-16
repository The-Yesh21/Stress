import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BehaviorTracker } from '../lib/behaviorTracker';
import type { BehavioralFeatures } from '../lib/behaviorTracker';
import { stressModel } from '../lib/stressModel';
import { Brain, MousePointer2, Keyboard, Timer, RefreshCw, X } from 'lucide-react';

interface AssessmentProps {
  onClose: () => void;
}

export const Assessment: React.FC<AssessmentProps> = ({ onClose }) => {
  const [step, setStep] = useState<'intro' | 'active' | 'analyzing' | 'result'>('intro');
  const [timeLeft, setTimeLeft] = useState(30);
  const [result, setResult] = useState<number | null>(null);
  const [features, setFeatures] = useState<BehavioralFeatures | null>(null);
  const tracker = useRef(new BehaviorTracker());
  const timerRef = useRef<number | null>(null);

  const startAssessment = () => {
    setStep('active');
    setTimeLeft(30);
    tracker.current.start();
    
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

  const finishAssessment = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep('analyzing');
    
    const extractedFeatures = tracker.current.stop();
    setFeatures(extractedFeatures);
    
    const score = await stressModel.predict(extractedFeatures);
    setResult(score);
    setStep('result');
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-bg/95 backdrop-blur-md p-6">
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-2 text-gray-400 hover:text-white transition-colors"
      >
        <X size={24} />
      </button>

      <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-brand-green/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Brain className="text-brand-green" size={32} />
              </div>
              <h2 className="text-3xl font-bold mb-4">Behavioral Stress Test</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                In this 30-second assessment, we'll analyze your interaction patterns to determine your current stress level.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <MousePointer2 className="text-brand-green mx-auto mb-2" size={20} />
                  <span className="text-xs text-gray-400">Mouse Dynamics</span>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <Keyboard className="text-brand-green mx-auto mb-2" size={20} />
                  <span className="text-xs text-gray-400">Typing Patterns</span>
                </div>
              </div>

              <button 
                onClick={startAssessment}
                className="w-full py-4 bg-brand-green text-dark-bg font-bold rounded-xl hover:scale-[1.02] transition-transform active:scale-95"
              >
                Begin 30s Assessment
              </button>
            </motion.div>
          )}

          {step === 'active' && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-brand-green">
                  <Timer size={20} />
                  <span className="font-mono text-2xl font-bold">{timeLeft}s</span>
                </div>
                <div className="text-gray-400 text-sm">Recording behavior...</div>
              </div>

              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden mb-8">
                <motion.div 
                  className="h-full bg-brand-green"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / 30) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-400 text-center italic">
                  "Please type the text below and interact with the screen naturally."
                </p>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-gray-300 font-mono text-sm leading-relaxed select-none">
                  The efficiency of the brain is often reflected in the fluidity of movement. 
                  Stressed individuals tend to exhibit higher micro-fluctuations in muscle control, 
                  leading to erratic behavioral patterns that can be detected through subtle telemetry.
                </div>
                <textarea 
                  autoFocus
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-brand-green/50 transition-colors resize-none"
                  placeholder="Start typing here..."
                />
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
              <h3 className="text-2xl font-bold mb-2">Analyzing Patterns</h3>
              <p className="text-gray-400">Processing behavioral telemetry through neural network...</p>
            </motion.div>
          )}

          {step === 'result' && result !== null && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold mb-2">Assessment Complete</h2>
              <div className="my-8">
                <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Stress Level Index</div>
                <div className="text-6xl font-black text-brand-green mb-4">
                  {Math.round(result * 100)}%
                </div>
                <div className={`inline-flex px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  result > 0.6 ? 'bg-red-500/20 text-red-500' : 
                  result > 0.3 ? 'bg-yellow-500/20 text-yellow-500' : 
                  'bg-brand-green/20 text-brand-green'
                }`}>
                  {result > 0.6 ? 'High Stress Detected' : 
                   result > 0.3 ? 'Moderate Stress' : 
                   'Calm / Low Stress'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-[10px] text-gray-500 uppercase">Mouse Jitter</div>
                  <div className="text-lg font-bold">{features?.mouseJitter.toFixed(1)} px/s²</div>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-[10px] text-gray-500 uppercase">Typing Speed</div>
                  <div className="text-lg font-bold">{features?.typingSpeed.toFixed(0)} KPM</div>
                </div>
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
                  className="flex-1 py-4 bg-brand-green text-dark-bg font-bold rounded-xl hover:scale-[1.02] transition-transform"
                >
                  View Recommendations
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
