import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  Building2, ArrowRight, Check, Zap, Loader,
  Key, UserPlus, Copy
} from 'lucide-react';

export default function OrganizationSetup() {
  const [mode, setMode] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdOrg, setCreatedOrg] = useState(null);
  
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);
  const authLoading = useAuthStore((state) => state.loading);
  const loadOrganization = useAuthStore((state) => state.loadOrganization);
  const navigate = useNavigate();

  // If user already has organization, redirect to app
  useEffect(() => {
    if (!authLoading && organization) {
      console.log('User already has organization, redirecting to app');
      navigate('/app', { replace: true });
    }
  }, [authLoading, organization, navigate]);

  const generateJoinCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createOrganization = async (e) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      toast.error('Please enter an organization name');
      return;
    }

    if (!user) {
      toast.error('Please log in first');
      return;
    }

    setLoading(true);

    try {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
      const joinCode = generateJoinCode();

      console.log('Creating organization:', { name: orgName, slug, joinCode });

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          slug: slug,
          join_code: joinCode,
        })
        .select()
        .single();

      if (orgError) {
        console.error('Org creation error:', orgError);
        throw orgError;
      }

      console.log('Organization created:', org);

      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) {
        console.error('Member creation error:', memberError);
        throw memberError;
      }

      console.log('User added as owner');

      // Create default channels
      const defaultChannels = ['general', 'random', 'announcements'];
      for (const channelName of defaultChannels) {
        const { data: channel, error: channelError } = await supabase
          .from('channels')
          .insert({
            organization_id: org.id,
            name: channelName,
            type: 'public',
            created_by: user.id
          })
          .select()
          .single();

        if (!channelError && channel) {
          await supabase.from('channel_members').insert({
            channel_id: channel.id,
            user_id: user.id
          });
        }
      }

      // Create default project
      await supabase.from('projects').insert({
        organization_id: org.id,
        name: 'Getting Started',
        description: 'Welcome to MeetingFlow AI! Start by exploring the features.',
        status: 'active',
        created_by: user.id
      });

      // Cache organization in localStorage
      localStorage.setItem(`org_${user.id}`, JSON.stringify({
        org: { ...org, join_code: joinCode },
        role: 'owner',
        timestamp: Date.now()
      }));

      setCreatedOrg({ ...org, join_code: joinCode });
      
      // Reload organization in store
      await loadOrganization();
      
      toast.success('Organization created successfully!');
      
      // Navigate to app after 2 seconds
      setTimeout(() => {
        navigate('/app', { replace: true });
      }, 2000);

    } catch (error) {
      console.error('Create org error:', error);
      toast.error('Failed to create organization: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const joinOrganization = async (e) => {
    e.preventDefault();
    
    if (!joinCode.trim()) {
      toast.error('Please enter a join code');
      return;
    }

    if (!user) {
      toast.error('Please log in first');
      return;
    }

    setLoading(true);

    try {
      console.log('Joining with code:', joinCode.trim().toUpperCase());

      // Find organization by join code
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('join_code', joinCode.trim().toUpperCase())
        .single();

      if (orgError || !org) {
        toast.error('Invalid join code. Organization not found.');
        setLoading(false);
        return;
      }

      console.log('Found organization:', org.name);

      // Check if already a member
      const { data: existingMembership } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', org.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMembership) {
        toast.error('You are already a member of this organization');
        setLoading(false);
        return;
      }

      // Add user as member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'team_member'
        });

      if (memberError) throw memberError;

      console.log('User added as member');

      // Add to public channels
      const { data: channels } = await supabase
        .from('channels')
        .select('id')
        .eq('organization_id', org.id)
        .eq('type', 'public');

      if (channels) {
        for (const channel of channels) {
          await supabase.from('channel_members').insert({
            channel_id: channel.id,
            user_id: user.id
          }).select().maybeSingle();
        }
      }

      // Cache organization in localStorage
      localStorage.setItem(`org_${user.id}`, JSON.stringify({
        org: org,
        role: 'team_member',
        timestamp: Date.now()
      }));

      // Reload organization
      await loadOrganization();
      
      toast.success(`Joined ${org.name}!`);
      
      setTimeout(() => {
        navigate('/app', { replace: true });
      }, 1000);

    } catch (error) {
      console.error('Join org error:', error);
      toast.error('Failed to join organization: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const copyJoinCode = () => {
    if (createdOrg?.join_code) {
      navigator.clipboard.writeText(createdOrg.join_code);
      toast.success('Join code copied!');
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E5E5DF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DB9941] mx-auto"></div>
          <p className="mt-4 text-[#5D5D5D] font-grotesk">Loading...</p>
        </div>
      </div>
    );
  }

  // Show success screen after creation
  if (createdOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E5E5DF] p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Check size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#07111D] mb-3 font-display">Organization Created!</h1>
          <p className="text-[#5D5D5D] mb-8 font-grotesk">
            Share this join code with your team members:
          </p>
          
          <div className="p-6 rounded-2xl bg-[#07111D] mb-6">
            <p className="text-3xl font-bold text-[#DB9941] font-mono tracking-widest mb-3">
              {createdOrg.join_code}
            </p>
            <button onClick={copyJoinCode}
              className="flex items-center space-x-2 mx-auto text-sm text-[#E5E5DF] hover:text-white transition-colors font-grotesk">
              <Copy size={14} />
              <span>Copy Code</span>
            </button>
          </div>
          
          <p className="text-sm text-[#5D5D5D] font-grotesk">
            Redirecting to your workspace...
          </p>
          <Loader className="animate-spin mx-auto mt-4 text-[#DB9941]" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E5E5DF] p-4">
      <div className="w-full max-w-md">
        {!mode ? (
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Building2 size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#07111D] mb-3 font-display">Welcome!</h1>
            <p className="text-[#5D5D5D] mb-10 font-grotesk">
              Set up your workspace to get started
            </p>
            
            <div className="space-y-4">
              <button onClick={() => setMode('create')}
                className="w-full p-6 rounded-2xl border-2 border-[#DB9941]/30 hover:border-[#DB9941] hover:bg-[#DB9941]/5 transition-all text-left group bg-white">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-[#DB9941]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 size={24} className="text-[#DB9941]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[#07111D] font-grotesk text-lg">Create Organization</h3>
                    <p className="text-sm text-[#5D5D5D]">Start a new workspace for your team</p>
                  </div>
                  <ArrowRight size={20} className="text-[#DB9941] group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
              
              <button onClick={() => setMode('join')}
                className="w-full p-6 rounded-2xl border-2 border-[#39444D]/20 hover:border-[#39444D] hover:bg-[#39444D]/5 transition-all text-left group bg-white">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-[#39444D]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserPlus size={24} className="text-[#39444D]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[#07111D] font-grotesk text-lg">Join Organization</h3>
                    <p className="text-sm text-[#5D5D5D]">Enter a join code from your team</p>
                  </div>
                  <ArrowRight size={20} className="text-[#39444D] group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        ) : mode === 'create' ? (
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <button onClick={() => setMode(null)}
              className="text-[#5D5D5D] hover:text-[#07111D] transition-colors mb-6 font-grotesk text-sm">
              ← Back
            </button>
            
            <div className="w-14 h-14 rounded-xl bg-[#DB9941]/10 flex items-center justify-center mb-6">
              <Building2 size={28} className="text-[#DB9941]" />
            </div>
            
            <h2 className="text-2xl font-bold text-[#07111D] mb-2 font-display">Create Organization</h2>
            <p className="text-[#5D5D5D] mb-6 font-grotesk text-sm">
              Set up your team workspace
            </p>
            
            <form onSubmit={createOrganization} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g., My Agency, Tech Startup"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#DB9941] focus:outline-none font-grotesk"
                  required
                  autoFocus
                />
              </div>
              
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-lg transition-all hover:scale-105 disabled:opacity-50 font-grotesk flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
                {loading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>Create Organization</span>
                    <ArrowRight size={20} className="ml-2" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <button onClick={() => setMode(null)}
              className="text-[#5D5D5D] hover:text-[#07111D] transition-colors mb-6 font-grotesk text-sm">
              ← Back
            </button>
            
            <div className="w-14 h-14 rounded-xl bg-[#39444D]/10 flex items-center justify-center mb-6">
              <Key size={28} className="text-[#39444D]" />
            </div>
            
            <h2 className="text-2xl font-bold text-[#07111D] mb-2 font-display">Join Organization</h2>
            <p className="text-[#5D5D5D] mb-6 font-grotesk text-sm">
              Enter the join code shared by your team admin
            </p>
            
            <form onSubmit={joinOrganization} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">
                  Join Code *
                </label>
                <div className="relative">
                  <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5D5D5D]" />
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter 8-character code"
                    maxLength={8}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#DB9941] focus:outline-none font-mono text-lg tracking-widest text-center uppercase"
                    required
                    autoFocus
                  />
                </div>
              </div>
              
              <button type="submit" disabled={loading || joinCode.length < 8}
                className="w-full py-3.5 rounded-xl text-white font-bold text-lg transition-all hover:scale-105 disabled:opacity-50 font-grotesk flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #39444D, #07111D)' }}>
                {loading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>Join Organization</span>
                    <ArrowRight size={20} className="ml-2" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}