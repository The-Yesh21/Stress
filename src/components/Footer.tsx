import { motion } from 'framer-motion';

export const Footer = () => {
  return (
    <footer className="py-24 px-6 text-center border-t border-white/5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="max-w-4xl mx-auto"
      >
        <h2 className="text-4xl md:text-6xl font-bold mb-8">Take a moment. <br /><span className="text-gray-500">Understand yourself better.</span></h2>
        <p className="text-gray-400 text-lg mb-12 max-w-2xl mx-auto">
          Start your journey towards a more balanced cognitive state. 
          Your data is encrypted and used only for your personal assessment.
        </p>
        <button className="px-12 py-5 bg-white text-dark-bg font-bold rounded-2xl hover:scale-105 transition-transform active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)]">
          Begin Assessment Now
        </button>
        
        <div className="mt-24 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-white font-bold text-xl mb-2">MindFlow</span>
            <p className="text-gray-500 text-sm">© 2024 Cognitive Systems Inc. All rights reserved.</p>
          </div>
          <div className="flex gap-12 text-gray-500 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </motion.div>
    </footer>
  );
};
