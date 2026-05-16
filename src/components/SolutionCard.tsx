import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface SolutionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  delay: number;
}

export const SolutionCard = ({ title, description, icon: Icon, delay }: SolutionCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay }}
      className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="mt-1 p-2 rounded-lg bg-brand-green/10 text-brand-green">
          <Icon size={20} />
        </div>
        <div>
          <h4 className="text-lg font-medium text-white mb-1">{title}</h4>
          <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
};
