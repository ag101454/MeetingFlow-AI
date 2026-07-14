import { useState, useEffect } from 'react';
import { Zap, Mic, MessageSquare, CheckCircle, Sparkles } from 'lucide-react';

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showText, setShowText] = useState(false);
  const [particles, setParticles] = useState([]);

  // Theme colors
  const colors = {
    dark: '#07111D',
    gold: '#DB9941',
    rust: '#AE2C11',
    light: '#E5E5DF',
  };

  useEffect(() => {
    // Generate random particles
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
      opacity: Math.random() * 0.5 + 0.2,
    }));
    setParticles(newParticles);

    // Animation sequence
    const sequence = async () => {
      // Phase 0: Initial pulse
      setPhase(0);
      await delay(600);
      
      // Phase 1: Progress bar starts
      setPhase(1);
      setShowText(true);
      
      // Animate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          // Smooth progress with easing
          const increment = Math.random() * 15 + 5;
          return Math.min(prev + increment, 100);
        });
      }, 200);

      // Wait for progress to complete
      await delay(2500);
      clearInterval(progressInterval);
      setProgress(100);
      
      // Phase 2: Complete
      setPhase(2);
      await delay(800);
      
      // Call onComplete
      if (onComplete) {
        onComplete();
      }
    };

    sequence();

    return () => {};
  }, []);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const features = [
    { icon: Mic, text: 'AI Transcription', color: '#DB9941' },
    { icon: MessageSquare, text: 'Team Chat', color: '#AE2C11' },
    { icon: CheckCircle, text: 'Task Management', color: '#10B981' },
    { icon: Sparkles, text: 'Smart Insights', color: '#DB9941' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #07111D 0%, #0a1a2e 50%, #07111D 100%)' }}>
      
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle, #DB9941 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Floating Particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.id % 3 === 0 ? '#DB9941' : particle.id % 3 === 1 ? '#AE2C11' : '#E5E5DF',
            opacity: particle.opacity,
            animation: `float ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
          }}
        />
      ))}

      {/* Glow Effects */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse"
        style={{ backgroundColor: '#DB9941' }}></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
        style={{ backgroundColor: '#AE2C11', animationDelay: '1s' }}></div>

      {/* Main Content */}
      <div className="relative z-10 text-center">
        {/* Logo Animation */}
        <div className={`transition-all duration-1000 transform ${
          phase === 0 ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
        }`}>
          <div className="relative inline-block">
            {/* Outer rotating ring */}
            <div className="absolute -inset-8 rounded-full animate-spin"
              style={{ 
                background: 'conic-gradient(from 0deg, #DB9941, #AE2C11, #DB9941)',
                opacity: 0.3,
                filter: 'blur(8px)',
                animationDuration: '3s'
              }}></div>
            
            {/* Middle pulsing ring */}
            <div className="absolute -inset-4 rounded-full animate-pulse"
              style={{ 
                border: '2px solid #DB9941',
                opacity: 0.5,
                boxShadow: '0 0 30px rgba(219, 153, 65, 0.3)'
              }}></div>
            
            {/* Logo */}
            <div className="relative w-24 h-24 rounded-2xl flex items-center justify-center animate-pulse"
              style={{ 
                background: 'linear-gradient(135deg, #DB9941, #AE2C11)',
                boxShadow: '0 20px 60px rgba(219, 153, 65, 0.4)'
              }}>
              <Zap size={48} className="text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className={`mt-8 transition-all duration-700 delay-300 ${
          showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <h1 className="text-5xl font-bold font-display" style={{ color: '#E5E5DF' }}>
            Meeting<span style={{ color: '#DB9941' }}>Flow</span>
          </h1>
          <p className="text-lg mt-3 font-grotesk" style={{ color: '#5D5D5D' }}>
            AI-Powered Meeting Assistant
          </p>
        </div>

        {/* Progress Bar */}
        <div className={`mt-10 transition-all duration-500 delay-500 ${
          showText ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="w-64 h-1.5 rounded-full mx-auto overflow-hidden"
            style={{ backgroundColor: 'rgba(229, 229, 223, 0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #DB9941, #AE2C11, #DB9941)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s linear infinite',
                boxShadow: '0 0 20px rgba(219, 153, 65, 0.5)'
              }}
            />
          </div>
          <p className="text-xs mt-3 font-mono" style={{ color: '#5D5D5D' }}>
            {progress < 30 && 'Initializing workspace...'}
            {progress >= 30 && progress < 60 && 'Loading AI models...'}
            {progress >= 60 && progress < 90 && 'Preparing your dashboard...'}
            {progress >= 90 && progress < 100 && 'Almost ready...'}
            {progress === 100 && '✅ Ready!'}
          </p>
        </div>

        {/* Feature Icons */}
        <div className={`mt-12 flex items-center justify-center space-x-8 transition-all duration-700 delay-700 ${
          showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col items-center space-y-2 animate-float"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: `${feature.color}20`, border: `1px solid ${feature.color}30` }}>
                <feature.icon size={20} style={{ color: feature.color }} />
              </div>
              <span className="text-xs font-grotesk" style={{ color: '#5D5D5D' }}>
                {feature.text}
              </span>
            </div>
          ))}
        </div>

        {/* Phase 2: Completion effect */}
        {phase === 2 && (
          <div className="mt-8 animate-fade-in">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: '#10B98120', border: '1px solid #10B98130' }}>
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-sm font-grotesk text-green-500">All systems ready</span>
            </div>
          </div>
        )}
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(90deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
          75% { transform: translateY(-30px) rotate(270deg); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}