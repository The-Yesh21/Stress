import { SolutionCard } from './SolutionCard';
import { Bot, Music, BookOpen, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

const solutions = [
  {
    title: "Virtual Assistant (VPA)",
    description: "Your personal guide to managing workload and maintaining mental balance throughout the day.",
    icon: Bot,
    delay: 0.1
  },
  {
    title: "Curated Soundscapes",
    description: "Personalized music recommendations based on your current emotional state and stress profile.",
    icon: Music,
    delay: 0.2
  },
  {
    title: "Knowledge Library",
    description: "Tailored book suggestions to help you disconnect and find focus in your favorite genres.",
    icon: BookOpen,
    delay: 0.3
  },
  {
    title: "Daily Affirmations",
    description: "Positive, empowering messages to start your morning with a clear and focused mind.",
    icon: Sun,
    delay: 0.4
  }
];

export const Recovery = () => {
  return (
    <section className="py-24 px-6 bg-white/[0.01] border-y border-white/[0.05]">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
        <div className="flex-1 text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Beyond Detection: <br /><span className="text-brand-green">Your Recovery Path</span></h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              We don't just identify stress—we provide the tools to mitigate it. 
              Our recommendation engine builds a personalized recovery ecosystem 
              tailored to your unique cognitive needs.
            </p>
            <div className="flex gap-4">
              <div className="px-4 py-2 rounded-lg bg-brand-green/10 border border-brand-green/20 text-brand-green text-sm font-medium">
                Supportive Guidance
              </div>
              <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm font-medium">
                Science-Backed
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {solutions.map((solution, idx) => (
            <SolutionCard key={idx} {...solution} />
          ))}
        </div>
      </div>
    </section>
  );
};
