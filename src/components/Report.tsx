import { motion } from 'framer-motion';
import { FileText, CheckCircle2 } from 'lucide-react';

export const Report = () => {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto overflow-hidden">
      <div className="glass rounded-[3rem] p-12 relative flex flex-col md:flex-row items-center gap-16">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-green/5 blur-[100px] -z-10" />
        
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Mock Report Visual */}
            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/10 shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-500 cursor-pointer">
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center">
                    <FileText size={16} className="text-dark-bg" />
                  </div>
                  <span className="text-sm font-semibold text-white">MindFlow Report</span>
                </div>
                <span className="text-[10px] text-gray-500">ID: #RE-2024</span>
              </div>
              
              <div className="space-y-4">
                {[
                  { label: "Facial Symmetry", score: "94%" },
                  { label: "Vocal Tension", score: "Low" },
                  { label: "Cognitive Latency", score: "240ms" },
                  { label: "Physiological Sync", score: "Optimal" },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                    <span className="text-xs text-gray-400">{item.label}</span>
                    <span className="text-xs font-mono text-brand-green">{item.score}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-4 rounded-xl bg-brand-green/10 border border-brand-green/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={14} className="text-brand-green" />
                  <span className="text-xs font-bold text-white uppercase">Final Assessment</span>
                </div>
                <p className="text-brand-green text-sm font-medium">Normal State - Low Cognitive Load</p>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="flex-1 text-left">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Actionable Intelligence</h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Upon completion, receive a comprehensive PDF report that visualizes 
              your cognitive metrics. Understand exactly how your environment 
              and workload are impacting your mental well-being.
            </p>
            <ul className="space-y-4 mb-10">
              {[
                "Micro-expression breakdown",
                "Voice intensity variance mapping",
                "Focus & reaction time benchmarks",
                "Physiological trend analysis"
              ].map((text, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                  {text}
                </li>
              ))}
            </ul>
            <button className="text-white font-semibold border-b border-brand-green pb-1 hover:text-brand-green transition-colors">
              View Sample Report
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
