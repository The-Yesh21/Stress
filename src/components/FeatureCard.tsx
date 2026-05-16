import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  details: string;
  icon: LucideIcon;
  delay: number;
}

export const FeatureCard = ({ title, description, details, icon: Icon, delay }: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="glass p-8 rounded-3xl relative overflow-hidden group transition-all hover:shadow-[0_0_30px_rgba(0,255,136,0.15)] cursor-pointer"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon size={120} className="text-brand-green" />
      </div>
      
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center mb-6 group-hover:bg-brand-green/20 transition-colors">
          <Icon className="text-brand-green" size={24} />
        </div>
        
        <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-brand-green transition-colors">
          {title}
        </h3>
        
        <p className="text-gray-400 mb-4 text-sm leading-relaxed">
          {description}
        </p>
        
        <div className="pt-4 border-t border-white/5">
          <p className="text-xs font-medium text-brand-green/60 uppercase tracking-wider">
            {details}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
