import { motion } from 'framer-motion';

interface WelcomeAnimationProps {
  onComplete?: () => void;
}

export const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({ onComplete }) => {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-dark-bg"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.7, ease: 'easeInOut' } }}
      onAnimationComplete={onComplete}
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(0,255,136,0.24)_0%,_rgba(0,255,136,0.12)_28%,_rgba(10,10,10,0)_72%)] blur-2xl"
          initial={{ scale: 0.78, opacity: 0 }}
          animate={{ scale: 1.08, opacity: 1 }}
          transition={{ duration: 2.6, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.035),_transparent_58%)]" />
      </div>

      <motion.div
        className="relative w-full max-w-[820px] px-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="welcome-hello-shell"
          initial={{ clipPath: 'inset(0 100% 0 0 round 999px)', opacity: 0.15, filter: 'blur(8px)' }}
          animate={{ clipPath: 'inset(0 0% 0 0 round 999px)', opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.55, ease: [0.65, 0, 0.35, 1] }}
        >
          <motion.h1
            className="welcome-hello-word"
            initial={{ letterSpacing: '-0.08em', scale: 0.985 }}
            animate={{ letterSpacing: '-0.055em', scale: 1 }}
            transition={{ duration: 1.55, ease: [0.22, 1, 0.36, 1] }}
          >
            Hello
          </motion.h1>
        </motion.div>

        <motion.div
          className="absolute top-1/2 h-[72%] w-[26%] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.16)_0%,_rgba(255,255,255,0.06)_38%,_rgba(255,255,255,0)_72%)] blur-2xl"
          initial={{ left: '18%', opacity: 0 }}
          animate={{
            left: ['18%', '33%', '48%', '63%', '76%'],
            opacity: [0, 0.65, 0.45, 0.3, 0],
          }}
          transition={{
            duration: 1.55,
            ease: [0.65, 0, 0.35, 1],
            times: [0, 0.24, 0.5, 0.76, 1],
          }}
        />
      </motion.div>
    </motion.div>
  );
};
