import { motion } from 'framer-motion';
import { TypingAnimation } from './TypingAnimation';
import { Brain, ChevronRight, Sparkles } from 'lucide-react';

interface HeroProps {
  onStartAssessment: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartAssessment }) => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 px-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-green/10 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="text-center z-10"
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-brand-green mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
          </span>
          Intelligence-Driven Stress Detection
        </motion.div>
        
        <motion.h1 
          className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-[1.1]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Understand Your Mind. <br />
          <motion.span 
            className="text-gradient italic inline-flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
          >
            {"Measure Your Stress".split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: 1.2 + (i * 0.1),
                  duration: 0.1,
                  ease: "easeOut"
                }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ 
                duration: 0.8, 
                repeat: Infinity, 
                ease: "steps(2)",
                delay: 3.2 
              }}
              className="inline-block w-[3px] h-[0.7em] bg-brand-green ml-2"
            />
          </motion.span>
        </motion.h1>
        
        <motion.p 
          className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          A cognitive assessment platform designed for IT professionals. 
          Using advanced behavioral analysis and physiological metrics 
          to help you maintain peak mental performance.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-12"
        >
          <TypingAnimation />
          
          <div className="relative inline-block">
            {/* Comforting Overlay Animation */}
            <motion.div 
              className="absolute -inset-4 bg-brand-green/20 rounded-[2.5rem] blur-xl"
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            
            <button 
              onClick={onStartAssessment}
              className="group relative px-12 py-6 bg-brand-green text-dark-bg font-black rounded-3xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(0,255,136,0.3)] flex items-center gap-3"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Brain size={24} className="group-hover:rotate-12 transition-transform" />
              <span className="relative text-xl">Start Comprehensive Audit</span>
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            
            <div className="mt-6 flex items-center justify-center gap-6 text-gray-500 text-xs font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-brand-green" /> 60s Duration</span>
              <span className="w-1 h-1 bg-white/10 rounded-full" />
              <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-brand-green" /> Dual-Layer AI</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500"
      >
        <div className="w-[1px] h-12 bg-gradient-to-b from-brand-green/50 to-transparent" />
        <span className="text-[10px] uppercase tracking-widest">Explore</span>
      </motion.div>
    </section>
  );
};
