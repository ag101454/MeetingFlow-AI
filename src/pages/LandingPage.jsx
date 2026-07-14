import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, ArrowRight, Play, Star, Users, Video, 
  MessageSquare, Bot, CheckCircle, Globe, Shield,
  ChevronRight, Sparkles, TrendingUp, Clock,
  Mic, FileText, BarChart3, Command, Layers
} from 'lucide-react';

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  
  // Colors from the palette
  const colors = {
    primary: '#DB9941',
    dark: '#07111D',
    charcoal: '#39444D',
    gray: '#5D5D5D',
    light: '#E5E5DF',
    accent: '#AE2C11',
  };

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Mic,
      title: "AI Transcription",
      description: "Real-time speech-to-text with 98% accuracy. Never miss a word in any meeting.",
      color: colors.primary,
      gradient: `from-[${colors.primary}] to-orange-600`,
      stat: "98% Accuracy",
      image: "🎙️"
    },
    {
      icon: Bot,
      title: "Smart Task Extraction",
      description: "AI automatically identifies action items, deadlines, and assigns tasks to team members.",
      color: colors.accent,
      gradient: `from-[${colors.accent}] to-red-700`,
      stat: "3x Faster",
      image: "🤖"
    },
    {
      icon: Video,
      title: "Meeting Intelligence",
      description: "Get summaries, decisions, and highlights from every meeting automatically.",
      color: colors.charcoal,
      gradient: `from-[${colors.charcoal}] to-gray-700`,
      stat: "Save 5hrs/week",
      image: "🧠"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track productivity, team performance, and project progress in real-time.",
      color: colors.primary,
      gradient: `from-[${colors.primary}] to-yellow-600`,
      stat: "Real-time",
      image: "📊"
    },
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "CTO, TechVista",
      content: "MeetingFlow AI transformed how we handle meetings. What used to take hours of note-taking now happens automatically.",
      rating: 5,
      color: colors.primary
    },
    {
      name: "Marcus Rodriguez",
      role: "Project Manager, BuildRight",
      content: "The AI task extraction is incredible. Action items from meetings appear in our project board instantly.",
      rating: 5,
      color: colors.accent
    },
    {
      name: "Emily Watson",
      role: "Freelance Designer",
      content: "As a solo freelancer, this tool keeps me organized and professional with clients. The client portal is a game-changer.",
      rating: 5,
      color: colors.charcoal
    },
  ];

  const stats = [
    { value: "10K+", label: "Teams Using", icon: Users },
    { value: "1M+", label: "Meetings Processed", icon: Video },
    { value: "98%", label: "Accuracy Rate", icon: CheckCircle },
    { value: "50+", label: "Countries", icon: Globe },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.light, fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        
        .font-display { font-family: 'Playfair Display', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .font-grotesk { font-family: 'Space Grotesk', sans-serif; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(219, 153, 65, 0.3); }
          50% { box-shadow: 0 0 40px rgba(219, 153, 65, 0.6); }
        }
        
        @keyframes slide-in-left {
          from { transform: translateX(-100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slide-in-right {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes border-glow {
          0%, 100% { border-color: rgba(219, 153, 65, 0.3); }
          50% { border-color: rgba(219, 153, 65, 0.8); }
        }
        
        @keyframes typing {
          from { width: 0; }
          to { width: 100%; }
        }
        
        @keyframes blink {
          0%, 100% { border-color: transparent; }
          50% { border-color: #DB9941; }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-slide-left { animation: slide-in-left 0.8s ease-out; }
        .animate-slide-right { animation: slide-in-right 0.8s ease-out; }
        .animate-fade-up { animation: fade-in-up 0.8s ease-out; }
        .animate-gradient { animation: gradient-shift 3s ease infinite; background-size: 200% 200%; }
        .animate-border-glow { animation: border-glow 2s ease-in-out infinite; }
        .animate-typing { animation: typing 3.5s steps(40, end), blink 0.75s step-end infinite; overflow: hidden; white-space: nowrap; border-right: 3px solid #DB9941; }
        
        .perspective-1000 { perspective: 1000px; }
        .rotate-y-12 { transform: rotateY(12deg); }
        .hover\\:rotate-y-0:hover { transform: rotateY(0deg); }
        
        .glass-effect {
          background: rgba(229, 229, 223, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(229, 229, 223, 0.2);
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #DB9941, #AE2C11);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .hero-grid {
          background-image: 
            linear-gradient(rgba(7, 17, 29, 0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(7, 17, 29, 0.8) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>

      {/* ============================================ */}
      {/* NAVBAR */}
      {/* ============================================ */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500" 
        style={{ 
          backgroundColor: scrollY > 50 ? 'rgba(7, 17, 29, 0.95)' : 'transparent',
          backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 50 ? `1px solid rgba(229, 229, 223, 0.1)` : 'none'
        }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                <Zap size={20} className="text-white" />
              </div>
              <span className="text-2xl font-bold text-white font-display tracking-tight">
                Meeting<span style={{ color: colors.primary }}>Flow</span>
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {['Features', 'How It Works', 'Testimonials', 'About'].map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} 
                  className="text-sm font-medium transition-colors hover:text-white"
                  style={{ color: colors.light, fontFamily: 'Space Grotesk, sans-serif' }}>
                  {item}
                </a>
              ))}
            </div>

            <div className="flex items-center space-x-4">
              <Link to="/login" 
                className="hidden md:block px-6 py-2.5 rounded-lg font-medium transition-all border hover:scale-105"
                style={{ 
                  color: colors.light, 
                  borderColor: colors.light,
                  fontFamily: 'Space Grotesk, sans-serif'
                }}>
                Sign In
              </Link>
              <Link to="/login" 
                className="px-6 py-2.5 rounded-lg font-medium transition-all hover:scale-105"
                style={{ 
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                  color: 'white',
                  fontFamily: 'Space Grotesk, sans-serif'
                }}>
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ============================================ */}
      {/* HERO SECTION */}
      {/* ============================================ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden"
        style={{ backgroundColor: colors.dark }}>
        
        {/* Animated Background Grid */}
        <div className="absolute inset-0 hero-grid opacity-20"></div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute rounded-full animate-float"
              style={{
                width: Math.random() * 10 + 5 + 'px',
                height: Math.random() * 10 + 5 + 'px',
                background: i % 2 === 0 ? colors.primary : colors.accent,
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animationDelay: Math.random() * 5 + 's',
                opacity: 0.3,
              }} />
          ))}
        </div>

        {/* Glow Effects */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: colors.primary }}></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: colors.accent }}></div>

        <div className="relative max-w-7xl mx-auto px-6 py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Text */}
            <div className="space-y-8 animate-slide-left">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border animate-border-glow"
                style={{ 
                  borderColor: `${colors.primary}40`,
                  backgroundColor: `${colors.primary}10`
                }}>
                <Sparkles size={16} style={{ color: colors.primary }} />
                <span className="text-sm font-medium font-grotesk" style={{ color: colors.primary }}>
                  AI-Powered Meeting Assistant
                </span>
              </div>

              <h1 className="text-6xl lg:text-7xl font-bold leading-tight" style={{ fontFamily: 'Playfair Display, serif', color: colors.light }}>
                Transform
                <span className="gradient-text block">Conversations</span>
                Into Action
              </h1>

              <p className="text-xl leading-relaxed" style={{ color: colors.gray, fontFamily: 'Inter, sans-serif' }}>
                MeetingFlow AI automatically transcribes, analyzes, and extracts 
                actionable tasks from your meetings. Never lose track of what 
                needs to be done again.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login"
                  className="group px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 flex items-center justify-center space-x-2 animate-pulse-glow"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                    color: 'white',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}>
                  <span>Start Free Trial</span>
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </Link>
                
                <button className="px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 flex items-center justify-center space-x-2 border"
                  style={{ 
                    borderColor: colors.primary,
                    color: colors.primary,
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}>
                  <Play size={20} />
                  <span>Watch Demo</span>
                </button>
              </div>

              {/* Live Stats */}
              <div className="flex items-center space-x-8 pt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.primary }}></div>
                  <span className="text-sm font-mono" style={{ color: colors.gray }}>2,847 meetings today</span>
                </div>
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                      style={{ 
                        backgroundColor: i === 0 ? colors.primary : i === 1 ? colors.accent : colors.charcoal,
                        borderColor: colors.dark,
                        color: 'white'
                      }}>
                      {['A', 'M', 'S', 'J'][i]}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="relative animate-slide-right">
              {/* Floating Card 1 */}
              <div className="relative z-10 animate-float" style={{ animationDelay: '0s' }}>
                <div className="glass-effect rounded-2xl p-6" style={{ borderColor: `${colors.primary}40` }}>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.accent }}></div>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }}></div>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.charcoal }}></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 rounded w-3/4" style={{ backgroundColor: `${colors.light}20` }}></div>
                    <div className="h-2 rounded w-1/2" style={{ backgroundColor: `${colors.primary}40` }}></div>
                    <div className="h-2 rounded w-2/3" style={{ backgroundColor: `${colors.light}20` }}></div>
                  </div>
                  <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: `${colors.primary}20` }}>
                    <p className="text-xs font-mono" style={{ color: colors.primary }}>
                      ✅ Task: "Update dashboard design"
                    </p>
                    <p className="text-xs mt-1" style={{ color: colors.light }}>
                      Assigned to: Alex • Due: Friday
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Card 2 */}
              <div className="absolute top-20 -right-10 z-20 animate-float" style={{ animationDelay: '2s' }}>
                <div className="glass-effect rounded-xl p-4" style={{ borderColor: `${colors.accent}40` }}>
                  <div className="flex items-center space-x-2">
                    <Bot size={16} style={{ color: colors.primary }} />
                    <span className="text-sm font-medium font-grotesk" style={{ color: colors.light }}>
                      AI Summary Ready
                    </span>
                  </div>
                  <p className="text-xs mt-2" style={{ color: colors.gray }}>
                    Meeting ended • 5 action items extracted
                  </p>
                </div>
              </div>

              {/* Floating Card 3 */}
              <div className="absolute bottom-10 -left-10 z-10 animate-float" style={{ animationDelay: '4s' }}>
                <div className="glass-effect rounded-lg p-3 flex items-center space-x-3" 
                  style={{ borderColor: `${colors.primary}40` }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                    <CheckCircle size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium font-grotesk" style={{ color: colors.light }}>
                      Project Progress
                    </p>
                    <div className="w-24 h-1 rounded-full mt-1" style={{ backgroundColor: `${colors.light}20` }}>
                      <div className="h-1 rounded-full" style={{ 
                        width: '75%', 
                        background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})` 
                      }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-2">
          <span className="text-xs font-mono" style={{ color: colors.gray }}>Scroll to explore</span>
          <div className="w-0.5 h-8 rounded-full animate-pulse" style={{ backgroundColor: colors.primary }}></div>
        </div>
      </section>

      {/* ============================================ */}
      {/* TRUSTED BY SECTION */}
      {/* ============================================ */}
      <section className="py-16 border-b" style={{ 
        backgroundColor: colors.charcoal,
        borderColor: `${colors.light}10`
      }}>
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-mono mb-8" style={{ color: colors.gray }}>
            TRUSTED BY INNOVATIVE TEAMS WORLDWIDE
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center opacity-50">
            {['TechVista', 'BuildRight', 'DataFlow', 'CloudNine', 'NextGen', 'PixelLab'].map((company, i) => (
              <div key={i} className="text-xl font-bold font-display" style={{ color: colors.light }}>
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* HOW IT WORKS */}
      {/* ============================================ */}
      <section id="how-it-works" className="py-32" style={{ backgroundColor: colors.dark }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 font-display" style={{ color: colors.light }}>
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: colors.gray }}>
              Three simple steps to turn your meetings into organized action
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {[
              {
                step: '01',
                title: 'Record Your Meeting',
                description: 'Join or start a meeting and let MeetingFlow AI listen and transcribe in real-time.',
                icon: Mic,
                detail: 'Supports Zoom, Google Meet, Teams, and in-person meetings'
              },
              {
                step: '02',
                title: 'AI Processes Everything',
                description: 'Our AI extracts action items, decisions, questions, and creates a summary.',
                icon: Bot,
                detail: '98% accuracy in identifying tasks and assignees'
              },
              {
                step: '03',
                title: 'Tasks Appear Automatically',
                description: 'Extracted tasks are added to your project board with deadlines and assignees.',
                icon: CheckCircle,
                detail: 'Integrates with your existing workflow'
              },
            ].map((item, index) => (
              <div key={index} className="group relative">
                <div className="absolute inset-0 rounded-2xl transition-all duration-500 group-hover:scale-105"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.primary}10, ${colors.accent}10)`,
                    border: `1px solid ${colors.light}10`
                  }}></div>
                <div className="relative p-8">
                  <span className="text-6xl font-bold font-display opacity-10" 
                    style={{ color: colors.primary }}>
                    {item.step}
                  </span>
                  <div className="relative -mt-8 space-y-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                      <item.icon size={24} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold font-display" style={{ color: colors.light }}>
                      {item.title}
                    </h3>
                    <p className="text-base leading-relaxed" style={{ color: colors.gray }}>
                      {item.description}
                    </p>
                    <p className="text-sm font-mono" style={{ color: colors.primary }}>
                      {item.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FEATURES SHOWCASE */}
      {/* ============================================ */}
      <section id="features" className="py-32 relative overflow-hidden" 
        style={{ backgroundColor: colors.light }}>
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Feature Display */}
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full"
                style={{ backgroundColor: `${colors.dark}10`, border: `1px solid ${colors.dark}20` }}>
                <Sparkles size={16} style={{ color: colors.primary }} />
                <span className="text-sm font-medium font-grotesk" style={{ color: colors.dark }}>
                  Powerful Features
                </span>
              </div>

              <h2 className="text-5xl font-bold font-display" style={{ color: colors.dark }}>
                Everything You Need to
                <span className="block gradient-text">Stay Organized</span>
              </h2>

              <div className="space-y-4">
                {features.map((feature, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveFeature(index)}
                    className={`w-full text-left p-6 rounded-xl transition-all duration-300 ${
                      activeFeature === index ? 'scale-105' : 'hover:scale-102'
                    }`}
                    style={{
                      backgroundColor: activeFeature === index ? 'white' : 'transparent',
                      border: activeFeature === index 
                        ? `2px solid ${feature.color}` 
                        : `1px solid ${colors.gray}30`,
                      boxShadow: activeFeature === index 
                        ? `0 20px 40px rgba(0,0,0,0.1)` 
                        : 'none'
                    }}>
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${feature.color}, ${feature.color}99)` }}>
                        <feature.icon size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold font-grotesk" style={{ color: colors.dark }}>
                          {feature.title}
                        </h3>
                        <p className="text-sm mt-1" style={{ color: colors.gray }}>
                          {feature.description}
                        </p>
                        {activeFeature === index && (
                          <div className="flex items-center space-x-2 mt-3">
                            <span className="text-xs font-bold font-mono" style={{ color: feature.color }}>
                              {feature.stat}
                            </span>
                            <ChevronRight size={14} style={{ color: feature.color }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right - Feature Visual */}
            <div className="relative">
              <div className="aspect-square rounded-3xl flex items-center justify-center relative overflow-hidden animate-gradient"
                style={{ 
                  background: `linear-gradient(135deg, ${colors.dark}, ${colors.charcoal}, ${colors.dark})`,
                  backgroundSize: '200% 200%'
                }}>
                
                <div className="text-center relative z-10">
                  <span className="text-8xl block mb-6 animate-float">
                    {features[activeFeature].image}
                  </span>
                  <div className="space-y-4 max-w-md mx-auto px-8">
                    <h3 className="text-3xl font-bold font-display" style={{ color: colors.light }}>
                      {features[activeFeature].title}
                    </h3>
                    <p className="text-lg" style={{ color: colors.gray }}>
                      {features[activeFeature].description}
                    </p>
                    <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full"
                      style={{ 
                        backgroundColor: `${features[activeFeature].color}20`,
                        border: `1px solid ${features[activeFeature].color}40`
                      }}>
                      <Zap size={16} style={{ color: features[activeFeature].color }} />
                      <span className="text-sm font-bold font-mono" style={{ color: features[activeFeature].color }}>
                        {features[activeFeature].stat}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-10 left-10 w-20 h-20 rounded-full border opacity-20"
                  style={{ borderColor: colors.primary }}></div>
                <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full border opacity-20"
                  style={{ borderColor: colors.accent }}></div>
              </div>

              {/* Feature Indicators */}
              <div className="flex justify-center mt-6 space-x-2">
                {features.map((feature, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveFeature(index)}
                    className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: activeFeature === index ? feature.color : `${colors.gray}40`,
                      transform: activeFeature === index ? 'scale(1.5)' : 'scale(1)'
                    }}></button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* STATS SECTION */}
      {/* ============================================ */}
      <section ref={statsRef} className="py-24" style={{ backgroundColor: colors.dark }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <stat.icon size={32} className="mx-auto mb-4 transition-transform group-hover:scale-125 duration-300"
                  style={{ color: index % 2 === 0 ? colors.primary : colors.accent }} />
                <div className="text-4xl font-bold font-display mb-2" 
                  style={{ color: colors.light }}>
                  {stat.value}
                </div>
                <div className="text-sm font-grotesk" style={{ color: colors.gray }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* TESTIMONIALS */}
      {/* ============================================ */}
      <section id="testimonials" className="py-32" style={{ backgroundColor: colors.light }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6 font-display" style={{ color: colors.dark }}>
              Loved by <span className="gradient-text">Teams</span>
            </h2>
            <p className="text-xl" style={{ color: colors.gray }}>
              See what our users are saying about MeetingFlow AI
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="group relative">
                <div className="p-8 rounded-2xl transition-all duration-300 group-hover:-translate-y-2"
                  style={{ 
                    backgroundColor: 'white',
                    border: `1px solid ${colors.gray}20`,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                  }}>
                  
                  {/* Quote mark */}
                  <div className="text-6xl font-display leading-none opacity-10" style={{ color: testimonial.color }}>
                    "
                  </div>
                  
                  <p className="text-base leading-relaxed mt-4" style={{ color: colors.charcoal }}>
                    {testimonial.content}
                  </p>
                  
                  <div className="flex items-center mt-6 pt-6 border-t" style={{ borderColor: `${colors.gray}20` }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                      style={{ 
                        background: `linear-gradient(135deg, ${testimonial.color}, ${testimonial.color}99)`,
                        color: 'white'
                      }}>
                      {testimonial.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <p className="font-bold font-grotesk" style={{ color: colors.dark }}>
                        {testimonial.name}
                      </p>
                      <p className="text-sm" style={{ color: colors.gray }}>
                        {testimonial.role}
                      </p>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex mt-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} size={16} style={{ color: colors.primary }} fill={colors.primary} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CTA SECTION */}
      {/* ============================================ */}
      <section className="py-32 relative overflow-hidden" style={{ backgroundColor: colors.dark }}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle, ${colors.primary} 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center px-6">
          <h2 className="text-5xl lg:text-6xl font-bold mb-8 font-display" style={{ color: colors.light }}>
            Ready to
            <span className="gradient-text"> Transform</span>
            <br />Your Meetings?
          </h2>
          
          <p className="text-xl mb-12 max-w-2xl mx-auto" style={{ color: colors.gray }}>
            Join thousands of teams who've automated their meeting workflow.
            Start your free trial today — no credit card required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login"
              className="group px-10 py-5 rounded-xl font-bold text-lg transition-all hover:scale-105 flex items-center justify-center space-x-2 animate-pulse-glow"
              style={{ 
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                color: 'white',
                fontFamily: 'Space Grotesk, sans-serif'
              }}>
              <span>Get Started Free</span>
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={22} />
            </Link>
            
            <button className="px-10 py-5 rounded-xl font-bold text-lg transition-all hover:scale-105"
              style={{ 
                border: `2px solid ${colors.primary}`,
                color: colors.primary,
                fontFamily: 'Space Grotesk, sans-serif'
              }}>
              Schedule Demo
            </button>
          </div>

          <div className="flex items-center justify-center space-x-8 mt-12">
            {['No credit card', 'Free forever plan', 'Cancel anytime'].map((text, i) => (
              <div key={i} className="flex items-center space-x-2">
                <CheckCircle size={16} style={{ color: colors.primary }} />
                <span className="text-sm font-mono" style={{ color: colors.gray }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="py-16 border-t" style={{ 
        backgroundColor: colors.dark,
        borderColor: `${colors.light}10`
      }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                  <Zap size={20} className="text-white" />
                </div>
                <span className="text-2xl font-bold font-display" style={{ color: colors.light }}>
                  Meeting<span style={{ color: colors.primary }}>Flow</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: colors.gray }}>
                Transforming meetings into actionable work automatically.
              </p>
            </div>

            {['Product', 'Company', 'Resources'].map((category, i) => (
              <div key={i}>
                <h4 className="font-bold font-grotesk mb-4" style={{ color: colors.light }}>
                  {category}
                </h4>
                <ul className="space-y-3">
                  {['Features', 'Pricing', 'Integrations', 'Changelog'].map((item, j) => (
                    <li key={j}>
                      <a href="#" className="text-sm transition-colors hover:text-white"
                        style={{ color: colors.gray }}>
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center" 
            style={{ borderColor: `${colors.light}10` }}>
            <p className="text-sm font-mono" style={{ color: colors.gray }}>
              © 2024 MeetingFlow AI. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              {['Twitter', 'LinkedIn', 'GitHub', 'Discord'].map((social, i) => (
                <a key={i} href="#" className="text-sm font-mono transition-colors hover:text-white"
                  style={{ color: colors.gray }}>
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}