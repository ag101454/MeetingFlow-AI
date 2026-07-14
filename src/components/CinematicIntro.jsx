import { useState, useEffect } from 'react';
import { Zap, Mic, MessageSquare, CheckCircle, Sparkles, Volume2, VolumeX } from 'lucide-react';

export default function CinematicIntro({ onComplete }) {
  const [currentScene, setCurrentScene] = useState(0);
  const [letterReveal, setLetterReveal] = useState([]);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [muted, setMuted] = useState(true);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate particles
    const newParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 3,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.4 + 0.1,
    }));
    setParticles(newParticles);

    // Cursor blink
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530);

    // Cinematic sequence
    const runSequence = async () => {
      await delay(600);
      
      // SCENE 1: Logo reveal
      setCurrentScene(1);
      await delay(1000);
      
      // SCENE 2: Title typewriter
      setCurrentScene(2);
      const title = "MeetingFlow AI";
      for (let i = 0; i <= title.length; i++) {
        setLetterReveal(title.split('').slice(0, i));
        await delay(i === 0 ? 300 : 70);
      }
      await delay(500);
      
      // SCENE 3: Subtitle
      setCurrentScene(3);
      await delay(1200);
      
      // SCENE 4: Features
      setCurrentScene(4);
      await delay(2000);
      
      // SCENE 5: Final
      setCurrentScene(5);
      await delay(1000);
      
      if (onComplete) {
        onComplete();
      }
    };

    runSequence();

    return () => clearInterval(cursorInterval);
  }, []);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const features = [
    { icon: Mic, text: 'Real-time Transcription', delay: 0 },
    { icon: Sparkles, text: 'AI-Powered Insights', delay: 200 },
    { icon: MessageSquare, text: 'Team Collaboration', delay: 400 },
    { icon: CheckCircle, text: 'Smart Task Extraction', delay: 600 },
  ];

  return (
    <div className="fixed inset-0 z-[99999] overflow-hidden flex items-center justify-center" 
      style={{ backgroundColor: '#000000' }}>
      
      {/* Background Particles */}
      <div className="absolute inset-0">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              width: particle.size + 'px',
              height: particle.size + 'px',
              left: particle.x + '%',
              backgroundColor: particle.id % 3 === 0 ? '#DB9941' : particle.id % 3 === 1 ? '#AE2C11' : '#E5E5DF',
              opacity: particle.opacity,
              animation: `rise ${particle.duration}s linear ${particle.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Radial Vignette */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)',
      }}></div>

      {/* Scan Lines */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)',
      }}></div>

      {/* CENTERED CONTENT */}
      <div className="relative z-20 flex flex-col items-center justify-center w-full">
        
        {/* SCENE 1: Logo with Light Rays */}
        {currentScene === 1 && (
          <div className="relative flex items-center justify-center">
            {/* Light Rays */}
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  width: '2px',
                  height: '200px',
                  background: `linear-gradient(to top, #DB9941, transparent)`,
                  transform: `rotate(${i * 22.5}deg)`,
                  opacity: 0.4,
                  filter: 'blur(3px)',
                  animation: 'pulse-ray 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.08}s`,
                  transformOrigin: 'bottom center',
                }}
              />
            ))}
            
            {/* Logo */}
            <div className="relative z-10"
              style={{
                filter: 'drop-shadow(0 0 60px rgba(219, 153, 65, 0.8))',
              }}>
              <div className="w-28 h-28 rounded-3xl flex items-center justify-center animate-pulse"
                style={{
                  background: 'linear-gradient(135deg, #DB9941, #AE2C11)',
                  boxShadow: '0 0 100px rgba(219, 153, 65, 0.6), 0 0 150px rgba(174, 44, 17, 0.3), inset 0 0 30px rgba(255,255,255,0.1)',
                }}>
                <Zap size={56} className="text-white" />
              </div>
            </div>
          </div>
        )}

        {/* SCENE 2: Title Typewriter */}
        {currentScene === 2 && (
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
                style={{
                  background: 'linear-gradient(135deg, #DB9941, #AE2C11)',
                  boxShadow: '0 0 60px rgba(219, 153, 65, 0.5)',
                }}>
                <Zap size={40} className="text-white" />
              </div>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold font-display tracking-wider" 
              style={{ color: '#E5E5DF' }}>
              {letterReveal.map((letter, i) => (
                <span
                  key={i}
                  className="inline-block"
                  style={{
                    animation: 'letter-pop 0.3s ease-out forwards',
                    animationDelay: `${i * 0.05}s`,
                    color: letter === 'F' ? '#DB9941' : '#E5E5DF',
                  }}
                >
                  {letter}
                </span>
              ))}
              <span 
                className={`inline-block w-[3px] h-[50px] ml-1 align-middle transition-opacity duration-100`}
                style={{ 
                  backgroundColor: '#DB9941',
                  opacity: cursorVisible ? 1 : 0,
                }}>
              </span>
            </h1>
          </div>
        )}

        {/* SCENE 3: Full Title + Subtitle */}
        {currentScene === 3 && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
              style={{
                background: 'linear-gradient(135deg, #DB9941, #AE2C11)',
                boxShadow: '0 0 60px rgba(219, 153, 65, 0.5)',
              }}>
              <Zap size={40} className="text-white" />
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold font-display tracking-wider mb-6" 
              style={{ color: '#E5E5DF' }}>
              Meeting<span style={{ color: '#DB9941' }}>Flow</span> <span style={{ color: '#5D5D5D' }}>AI</span>
            </h1>
            
            <div className="overflow-hidden">
              <p className="text-xl md:text-2xl font-grotesk tracking-[0.3em] uppercase"
                style={{ 
                  color: '#5D5D5D',
                  animation: 'slide-up-fade 0.8s ease-out forwards',
                }}>
                Transform Conversations Into Action
              </p>
            </div>
            
            <div className="mt-10 w-24 h-[1px] mx-auto"
              style={{ 
                background: 'linear-gradient(90deg, transparent, #DB9941, transparent)',
                animation: 'pulse 2s ease-in-out infinite',
              }}>
            </div>
          </div>
        )}

        {/* SCENE 4: Features Grid */}
        {currentScene === 4 && (
          <div className="text-center w-full max-w-2xl px-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
              style={{
                background: 'linear-gradient(135deg, #DB9941, #AE2C11)',
                boxShadow: '0 0 40px rgba(219, 153, 65, 0.4)',
              }}>
              <Zap size={32} className="text-white" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold font-display mb-12" 
              style={{ color: '#E5E5DF' }}>
              Meeting<span style={{ color: '#DB9941' }}>Flow</span> AI
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 p-4 rounded-xl"
                  style={{
                    animation: `fade-in-up 0.6s ease-out forwards`,
                    animationDelay: `${feature.delay}ms`,
                    opacity: 0,
                    backgroundColor: 'rgba(219, 153, 65, 0.05)',
                    border: '1px solid rgba(219, 153, 65, 0.15)',
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(219, 153, 65, 0.2)' }}>
                    <feature.icon size={20} style={{ color: '#DB9941' }} />
                  </div>
                  <span className="text-sm md:text-base font-grotesk text-left" 
                    style={{ color: '#E5E5DF' }}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCENE 5: Final Flash */}
        {currentScene === 5 && (
          <div className="text-center">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{
                background: 'linear-gradient(135deg, #DB9941, #AE2C11)',
                boxShadow: '0 0 100px rgba(219, 153, 65, 0.8)',
                animation: 'pulse 0.5s ease-in-out infinite',
              }}>
              <Zap size={48} className="text-white" />
            </div>
            <h2 className="text-5xl font-bold text-white font-display animate-pulse">
              Ready
            </h2>
          </div>
        )}
      </div>

      {/* Bottom Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-[2px]" 
        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full transition-all duration-700"
          style={{
            width: `${(currentScene / 5) * 100}%`,
            background: 'linear-gradient(90deg, #DB9941, #AE2C11)',
            boxShadow: '0 0 15px rgba(219, 153, 65, 0.6)',
          }}>
        </div>
      </div>

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="absolute bottom-6 right-6 z-40 px-4 py-2 rounded-lg text-xs font-grotesk transition-all hover:scale-105 opacity-50 hover:opacity-100"
        style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          color: '#5D5D5D',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        Skip Intro ↵
      </button>

      {/* Sound Toggle */}
      <button
        onClick={() => setMuted(!muted)}
        className="absolute bottom-6 left-6 z-40 p-2 rounded-lg transition-all hover:scale-105 opacity-40 hover:opacity-80"
        style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          color: '#5D5D5D',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>

      {/* Custom Animations */}
      <style>{`
        @keyframes rise {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) scale(1); opacity: 0; }
        }
        
        @keyframes pulse-ray {
          0%, 100% { opacity: 0.2; transform: scaleY(0.8); }
          50% { opacity: 0.6; transform: scaleY(1.2); }
        }
        
        @keyframes letter-pop {
          0% { opacity: 0; transform: translateY(20px) scale(0.5); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @keyframes slide-up-fade {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}