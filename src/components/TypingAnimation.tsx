import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const phrases = [
  "Analyzing your focus...",
  "Measuring cognitive load...",
  "Understanding your state...",
  "Detecting micro-expressions...",
  "Evaluating vocal patterns..."
];

export const TypingAnimation = () => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);

  useEffect(() => {
    if (subIndex === phrases[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), 2000);
      return;
    }

    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? 75 : 150);

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse]);

  return (
    <div className="h-8 flex items-center justify-center">
      <motion.p 
        className="text-brand-green/80 font-mono text-lg md:text-xl italic"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {phrases[index].substring(0, subIndex)}
        <span className="animate-pulse">|</span>
      </motion.p>
    </div>
  );
};
