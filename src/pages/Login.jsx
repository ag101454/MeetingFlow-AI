import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  Eye, EyeOff, Mail, Lock, User, Zap, ArrowRight, ArrowLeft, CheckCircle 
} from 'lucide-react';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const navigate = useNavigate();
  const loadOrganization = useAuthStore((state) => state.loadOrganization);

  // Handle email signup/login
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isSignUp && !fullName) {
      toast.error('Please enter your full name');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          }
        });
        
        if (error) throw error;
        
        if (data.user && !data.session) {
          toast.success('Account created! Check your email to confirm.');
        } else {
          toast.success('Account created!');
          await loadOrganization();
          const org = useAuthStore.getState().organization;
          navigate(org ? '/app' : '/setup', { replace: true });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast.success('Welcome back!');
        await loadOrganization();
        
        // Check organization after loading
        const org = useAuthStore.getState().organization;
        navigate(org ? '/app' : '/setup', { replace: true });
      }
    } catch (error) {
      if (error.message?.includes('Invalid login')) {
        toast.error('Invalid email or password');
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Please confirm your email first');
      } else {
        toast.error(error.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });
      
      if (error) throw error;
    } catch (error) {
      toast.error('Google login failed: ' + error.message);
    }
  };

  // Handle GitHub login
  const handleGitHubLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });
      
      if (error) throw error;
    } catch (error) {
      toast.error('GitHub login failed: ' + error.message);
    }
  };

  // Handle OAuth redirect - check if user has org
  useEffect(() => {
    const checkOrg = async () => {
      const user = useAuthStore.getState().user;
      if (user) {
        await loadOrganization();
        const org = useAuthStore.getState().organization;
        if (org) {
          navigate('/app', { replace: true });
        }
      }
    };
    checkOrg();
  }, []);

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ backgroundColor: '#E5E5DF' }}>
      
      {/* LEFT SIDE - BRANDING */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, #07111D 0%, #0a1a2e 30%, #07111D 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradient-shift 10s ease infinite',
        }}>
        
        <div className="absolute inset-0 opacity-[0.05]">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, #DB9941 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="absolute top-20 left-20 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ backgroundColor: '#DB9941' }}></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ backgroundColor: '#AE2C11' }}></div>

        <div className="relative z-10 flex flex-col justify-center px-16 w-full">
          <Link to="/" className="flex items-center space-x-3 mb-16 group">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
              <Zap size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white font-display">
                Meeting<span style={{ color: '#DB9941' }}>Flow</span>
              </h1>
              <p className="text-xs text-[#5D5D5D] font-grotesk tracking-wider uppercase mt-0.5">AI Platform</p>
            </div>
          </Link>

          <h2 className="text-5xl font-bold text-white mb-6 font-display leading-tight">
            Transform
            <br />
            <span style={{ 
              background: 'linear-gradient(135deg, #DB9941, #AE2C11)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Meetings Into
            </span>
            <br />
            Action
          </h2>
          <p className="text-lg text-[#5D5D5D] font-grotesk leading-relaxed max-w-md">
            AI-powered meeting transcription, smart task extraction, and real-time team collaboration.
          </p>

          <div className="mt-12 space-y-4">
            {['AI Transcription', 'Smart Task Extraction', 'Team Chat', 'Client Portal'].map((f, i) => (
              <div key={i} className="flex items-center space-x-3">
                <CheckCircle size={18} className="text-[#DB9941]" />
                <span className="text-[#E5E5DF] font-grotesk">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-[420px]">
          
          <Link to="/" className="lg:hidden flex items-center justify-center mb-10 space-x-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
              <Zap size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#07111D] font-display">
              Meeting<span style={{ color: '#DB9941' }}>Flow</span>
            </h1>
          </Link>

          <div className="relative">
            <div className="absolute -inset-[1px] rounded-[28px] blur opacity-20"
              style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}></div>
            
            <div className="relative bg-white rounded-[26px] p-8 shadow-xl">
              
              <div className="flex p-1.5 rounded-xl mb-8" style={{ backgroundColor: '#E5E5DF' }}>
                <button onClick={() => setIsSignUp(false)}
                  className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all font-grotesk ${
                    !isSignUp ? 'text-white shadow-md' : 'text-[#5D5D5D] hover:text-[#07111D]'
                  }`}
                  style={!isSignUp ? { background: 'linear-gradient(135deg, #DB9941, #AE2C11)' } : {}}>
                  Sign In
                </button>
                <button onClick={() => setIsSignUp(true)}
                  className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all font-grotesk ${
                    isSignUp ? 'text-white shadow-md' : 'text-[#5D5D5D] hover:text-[#07111D]'
                  }`}
                  style={isSignUp ? { background: 'linear-gradient(135deg, #DB9941, #AE2C11)' } : {}}>
                  Sign Up
                </button>
              </div>

              <h2 className="text-3xl font-bold text-[#07111D] mb-1 font-display">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-[#5D5D5D] mb-8 font-grotesk text-sm">
                {isSignUp ? 'Start your free trial' : 'Sign in to your account'}
              </p>

              {/* Social Buttons */}
              <div className="space-y-3 mb-6">
                <button onClick={handleGoogleLogin} type="button"
                  className="w-full flex items-center justify-center space-x-3 py-3.5 rounded-xl border-2 border-gray-200 hover:border-[#DB9941] hover:bg-[#DB9941]/5 transition-all font-grotesk font-medium text-[#07111D]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button onClick={handleGitHubLogin} type="button"
                  className="w-full flex items-center justify-center space-x-3 py-3.5 rounded-xl border-2 border-gray-200 hover:border-[#39444D] hover:bg-[#39444D]/5 transition-all font-grotesk font-medium text-[#07111D]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span>Continue with GitHub</span>
                </button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E5E5DF]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-[#5D5D5D] font-grotesk">or with email</span>
                </div>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5D5D5D]" size={18} />
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-[#E5E5DF] focus:border-[#DB9941] focus:outline-none font-grotesk text-[#07111D]"
                        placeholder="John Doe" disabled={loading} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5D5D5D]" size={18} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-[#E5E5DF] focus:border-[#DB9941] focus:outline-none font-grotesk text-[#07111D]"
                      placeholder="you@example.com" disabled={loading} autoComplete="email" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5D5D5D]" size={18} />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-[#E5E5DF] focus:border-[#DB9941] focus:outline-none font-grotesk text-[#07111D]"
                      placeholder="••••••••" disabled={loading} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5D5D5D] hover:text-[#07111D] p-1">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {isSignUp && (
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 rounded border-[#E5E5DF] text-[#DB9941] focus:ring-[#DB9941] mt-1" />
                    <span className="text-sm text-[#5D5D5D] font-grotesk">
                      I agree to the Terms of Service and Privacy Policy
                    </span>
                  </label>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-50 font-grotesk flex items-center justify-center space-x-2"
                  style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)', boxShadow: '0 10px 30px rgba(219,153,65,0.3)' }}>
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <span>{isSignUp ? 'Create Free Account' : 'Sign In'}</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="inline-flex items-center space-x-2 text-sm text-[#5D5D5D] hover:text-[#07111D] font-grotesk group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}