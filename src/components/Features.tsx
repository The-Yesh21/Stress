import { FeatureCard } from './FeatureCard';
import { Camera, Mic, Puzzle, Activity } from 'lucide-react';

const features = [
  {
    title: "Facial Behavior Analysis",
    description: "Our AI analyzes micro-expressions and eye movements in real-time to identify signs of mental fatigue and cognitive strain.",
    details: "30-Second Video Capture",
    icon: Camera,
    delay: 0.1
  },
  {
    title: "Voice Intensity Analysis",
    description: "By reading tongue twisters, we analyze vocal frequency and intensity variations that correlate with stress levels.",
    details: "Vocal Stress Mapping",
    icon: Mic,
    delay: 0.2
  },
  {
    title: "Cognitive Focus Test",
    description: "A specialized 'connect-the-dots' challenge designed to measure your processing speed and attention span under pressure.",
    details: "Pattern Recognition Task",
    icon: Puzzle,
    delay: 0.3
  },
  {
    title: "Physiological Metrics",
    description: "Integrate your oximeter readings to correlate physical signals like BPM and oxygen levels with your cognitive state.",
    details: "Biometric Data Sync",
    icon: Activity,
    delay: 0.4
  }
];

export const Features = () => {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Precision Detection</h2>
        <p className="text-gray-400 max-w-xl mx-auto">
          Four distinct layers of analysis working together to provide a comprehensive map of your current stress levels.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, idx) => (
          <FeatureCard key={idx} {...feature} />
        ))}
      </div>
    </section>
  );
};
