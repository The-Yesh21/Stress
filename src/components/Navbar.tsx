import { motion } from 'framer-motion';

export const Navbar = () => {
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center p-6"
    >
      <div className="glass px-8 py-3 rounded-full flex items-center gap-8">
        <span className="text-white font-semibold tracking-tight">MindFlow</span>
        <div className="flex gap-6 text-sm text-gray-400">
          <a href="#" className="hover:text-brand-green transition-colors">Assessment</a>
          <a href="#" className="hover:text-brand-green transition-colors">Methods</a>
          <a href="#" className="hover:text-brand-green transition-colors">Recovery</a>
        </div>
        <button className="bg-brand-green text-dark-bg px-5 py-1.5 rounded-full text-sm font-bold hover:bg-[#00e67a] transition-colors">
          Join
        </button>
      </div>
    </motion.nav>
  );
};
