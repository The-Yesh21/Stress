import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Report } from './components/Report';
import { Recovery } from './components/Recovery';
import { Footer } from './components/Footer';
import { UnifiedAssessment } from './components/UnifiedAssessment';

function App() {
  const [showAssessment, setShowAssessment] = useState(false);

  return (
    <div className="min-h-screen bg-dark-bg text-white selection:bg-brand-green/30">
      <Navbar />
      
      <main>
        <Hero onStartAssessment={() => setShowAssessment(true)} />
        
        {/* Subtle separator */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
        
        <Features />
        <Report />
        <Recovery />
      </main>
      
      <Footer />

      {showAssessment && (
        <UnifiedAssessment onClose={() => setShowAssessment(false)} />
      )}
      
      {/* Global Background Elements */}
      <div className="fixed inset-0 -z-50 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-green/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-green/5 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}

export default App;
