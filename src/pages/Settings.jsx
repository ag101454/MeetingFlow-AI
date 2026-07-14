import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  User, Bell, Shield, Palette, Building2, 
  Key, Copy, LogOut, Trash2, AlertCircle,
  Check, Loader, Globe, Users, Zap,
  Moon, Sun, Save, ExternalLink
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);
  const role = useAuthStore((state) => state.role);
  const signOut = useAuthStore((state) => state.signOut);
  const loadOrganization = useAuthStore((state) => state.loadOrganization);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const navigate = useNavigate();

  // Initialize form values
  useState(() => {
    setFullName(user?.user_metadata?.full_name || '');
    setOrgName(organization?.name || '');
  }, []);

  // Update Profile
  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      
      if (error) throw error;
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Update Organization
  const updateOrganization = async (e) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName.trim() })
        .eq('id', organization.id);

      if (error) throw error;

      // Reload organization
      await loadOrganization();
      
      toast.success('Organization updated successfully!');
    } catch (error) {
      console.error('Organization update error:', error);
      toast.error('Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  // Copy Join Code
  const copyJoinCode = () => {
    if (organization?.join_code) {
      navigator.clipboard.writeText(organization.join_code);
      toast.success('Join code copied to clipboard!');
    }
  };

  // Generate New Join Code
  const generateNewJoinCode = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ join_code: code })
        .eq('id', organization.id);

      if (error) throw error;

      await loadOrganization();
      toast.success('New join code generated!');
    } catch (error) {
      toast.error('Failed to generate new code');
    }
  };

  // Leave Organization and Create New One
  const leaveAndCreateNew = async () => {
    if (!showLeaveConfirm) {
      setShowLeaveConfirm(true);
      return;
    }

    setLoading(true);

    try {
      // Remove user from current organization
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', user.id)
        .eq('organization_id', organization.id);

      if (error) throw error;

      // Clear cached org
      localStorage.removeItem(`org_${user.id}`);

      // Reset store
      useAuthStore.setState({ organization: null, role: null });

      toast.success('Left organization. Redirecting to setup...');
      
      setTimeout(() => {
        navigate('/setup', { replace: true });
      }, 1500);

    } catch (error) {
      console.error('Leave org error:', error);
      toast.error('Failed to leave organization');
      setShowLeaveConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  // Delete Account
  const deleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setLoading(true);

    try {
      // This requires admin privileges, may not work from client
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) {
        // Alternative: just sign out
        await signOut();
        localStorage.removeItem(`org_${user.id}`);
        toast.success('Signed out. Contact support to fully delete account.');
        navigate('/login', { replace: true });
        return;
      }

      localStorage.removeItem(`org_${user.id}`);
      toast.success('Account deleted successfully');
      navigate('/login', { replace: true });

    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('Failed to delete account. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#07111D] font-display">Settings</h1>
        <p className="text-[#5D5D5D] mt-1 font-grotesk">Manage your account and workspace</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 overflow-x-auto border-b" style={{ borderColor: '#39444D10' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-all font-grotesk text-sm whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#DB9941] text-[#DB9941]'
                : 'border-transparent text-[#5D5D5D] hover:text-[#07111D]'
            }`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ============================================ */}
      {/* PROFILE TAB */}
      {/* ============================================ */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#39444D20' }}>
            <h2 className="text-xl font-bold text-[#07111D] mb-6 font-display">Profile Information</h2>
            
            <form onSubmit={updateProfile} className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center text-white text-2xl font-bold">
                  {fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-[#07111D] font-grotesk">{fullName || 'User'}</p>
                  <p className="text-sm text-[#5D5D5D] font-grotesk">{user?.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] transition-all font-grotesk"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#07111D' }}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border-2 font-grotesk opacity-60"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#5D5D5D' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Role</label>
                <input
                  type="text"
                  value={role?.replace('_', ' ')?.toUpperCase() || 'Member'}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border-2 font-grotesk capitalize opacity-60"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#DB9941' }}
                />
              </div>

              <button type="submit" disabled={loading}
                className="px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 disabled:opacity-50 font-grotesk flex items-center"
                style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
                {loading ? <Loader className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Save Changes
              </button>
            </form>
          </div>

          {/* Sign Out */}
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#39444D20' }}>
            <h2 className="text-xl font-bold text-[#07111D] mb-4 font-display">Session</h2>
            <p className="text-sm text-[#5D5D5D] mb-4 font-grotesk">Sign out of your account</p>
            <button onClick={handleSignOut}
              className="px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 font-grotesk flex items-center border"
              style={{ borderColor: '#39444D20', color: '#39444D' }}>
              <LogOut size={16} className="mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* ORGANIZATION TAB */}
      {/* ============================================ */}
      {activeTab === 'organization' && (
        <div className="max-w-2xl space-y-6">
          {/* Organization Info */}
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#39444D20' }}>
            <h2 className="text-xl font-bold text-[#07111D] mb-6 font-display">Organization Details</h2>
            
            <form onSubmit={updateOrganization} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Organization Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] transition-all font-grotesk"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#07111D' }}
                  placeholder="Enter organization name"
                />
              </div>

              <button type="submit" disabled={loading}
                className="px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 disabled:opacity-50 font-grotesk flex items-center"
                style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
                {loading ? <Loader className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                Update Organization
              </button>
            </form>
          </div>

          {/* Invite Members */}
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#39444D20' }}>
            <h2 className="text-xl font-bold text-[#07111D] mb-4 font-display">Invite Members</h2>
            <p className="text-sm text-[#5D5D5D] mb-4 font-grotesk">
              Share this join code with your team members to join your organization
            </p>
            
            <div className="p-4 rounded-xl bg-[#07111D] mb-4">
              <p className="text-3xl font-bold text-[#DB9941] font-mono tracking-widest text-center">
                {organization?.join_code || 'No code'}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button onClick={copyJoinCode}
                className="flex-1 py-2.5 rounded-xl text-white font-semibold transition-all hover:scale-105 font-grotesk flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
                <Copy size={16} className="mr-2" />
                Copy Code
              </button>
              <button onClick={generateNewJoinCode}
                className="px-4 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 font-grotesk border"
                style={{ borderColor: '#39444D20', color: '#39444D' }}>
                <Key size={16} />
              </button>
            </div>
          </div>

          {/* Leave Organization */}
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#AE2C1120' }}>
            <h2 className="text-xl font-bold text-[#AE2C11] mb-4 font-display">Leave Organization</h2>
            <p className="text-sm text-[#5D5D5D] mb-4 font-grotesk">
              Leave this organization and create or join a new one. You will lose access to all projects and data in this organization.
            </p>
            
            {showLeaveConfirm && (
              <div className="p-4 rounded-xl mb-4 flex items-start space-x-3"
                style={{ backgroundColor: '#AE2C1110', border: '1px solid #AE2C1130' }}>
                <AlertCircle size={20} className="text-[#AE2C11] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#AE2C11] font-grotesk">Are you sure?</p>
                  <p className="text-xs text-[#5D5D5D] mt-1 font-grotesk">
                    This action cannot be undone. Click again to confirm.
                  </p>
                </div>
              </div>
            )}
            
            <button onClick={leaveAndCreateNew} disabled={loading}
              className="px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 disabled:opacity-50 font-grotesk flex items-center"
              style={{ backgroundColor: '#AE2C11' }}>
              {loading ? (
                <Loader className="animate-spin mr-2" size={16} />
              ) : (
                <LogOut size={16} className="mr-2" />
              )}
              {showLeaveConfirm ? 'Confirm Leave' : 'Leave Organization'}
            </button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* NOTIFICATIONS TAB */}
      {/* ============================================ */}
      {activeTab === 'notifications' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#39444D20' }}>
            <h2 className="text-xl font-bold text-[#07111D] mb-6 font-display">Notification Preferences</h2>
            
            <div className="space-y-4">
              {[
                { label: 'Task Assignments', desc: 'When someone assigns you a task' },
                { label: 'Meeting Reminders', desc: 'Before scheduled meetings' },
                { label: 'Project Updates', desc: 'Changes to projects you\'re in' },
                { label: 'Chat Mentions', desc: 'When someone @mentions you' },
                { label: 'Client Feedback', desc: 'When clients submit feedback' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b" style={{ borderColor: '#39444D10' }}>
                  <div>
                    <p className="font-medium text-[#07111D] font-grotesk">{item.label}</p>
                    <p className="text-xs text-[#5D5D5D] font-grotesk">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{ backgroundColor: '#DB9941' }}></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* APPEARANCE TAB */}
      {/* ============================================ */}
      {activeTab === 'appearance' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#39444D20' }}>
            <h2 className="text-xl font-bold text-[#07111D] mb-6 font-display">Appearance</h2>
            
            <div className="space-y-4">
              <p className="text-sm font-semibold text-[#07111D] font-grotesk">Theme</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setTheme('light')}
                  className={`p-6 rounded-xl border-2 text-center transition-all ${
                    theme === 'light' ? 'border-[#DB9941] bg-[#DB9941]/5' : 'border-gray-200 hover:border-[#DB9941]/50'
                  }`}>
                  <Sun size={32} className="mx-auto mb-2" style={{ color: theme === 'light' ? '#DB9941' : '#5D5D5D' }} />
                  <p className="font-semibold text-[#07111D] font-grotesk">Light</p>
                  <p className="text-xs text-[#5D5D5D]">Clean and bright</p>
                </button>
                <button onClick={() => setTheme('dark')}
                  className={`p-6 rounded-xl border-2 text-center transition-all ${
                    theme === 'dark' ? 'border-[#DB9941] bg-[#DB9941]/5' : 'border-gray-200 hover:border-[#DB9941]/50'
                  }`}>
                  <Moon size={32} className="mx-auto mb-2" style={{ color: theme === 'dark' ? '#DB9941' : '#5D5D5D' }} />
                  <p className="font-semibold text-[#07111D] font-grotesk">Dark</p>
                  <p className="text-xs text-[#5D5D5D]">Easy on eyes</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SECURITY TAB */}
      {/* ============================================ */}
      {activeTab === 'security' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#39444D20' }}>
            <h2 className="text-xl font-bold text-[#07111D] mb-6 font-display">Security</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: '#39444D10' }}>
                <div>
                  <p className="font-medium text-[#07111D] font-grotesk">Two-Factor Authentication</p>
                  <p className="text-xs text-[#5D5D5D] font-grotesk">Add an extra layer of security</p>
                </div>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold font-grotesk border"
                  style={{ borderColor: '#39444D20', color: '#39444D' }}>
                  Enable
                </button>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: '#39444D10' }}>
                <div>
                  <p className="font-medium text-[#07111D] font-grotesk">Change Password</p>
                  <p className="text-xs text-[#5D5D5D] font-grotesk">Update your password regularly</p>
                </div>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold font-grotesk border"
                  style={{ borderColor: '#39444D20', color: '#39444D' }}>
                  Change
                </button>
              </div>
            </div>
          </div>

          {/* Delete Account */}
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#AE2C1120' }}>
            <h2 className="text-xl font-bold text-[#AE2C11] mb-4 font-display">Danger Zone</h2>
            <p className="text-sm text-[#5D5D5D] mb-4 font-grotesk">
              Permanently delete your account and all associated data.
            </p>
            
            {showDeleteConfirm && (
              <div className="p-4 rounded-xl mb-4 flex items-start space-x-3"
                style={{ backgroundColor: '#AE2C1110', border: '1px solid #AE2C1130' }}>
                <AlertCircle size={20} className="text-[#AE2C11] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#AE2C11] font-grotesk">Final Warning!</p>
                  <p className="text-xs text-[#5D5D5D] mt-1 font-grotesk">
                    This action is irreversible. All your data will be permanently deleted.
                  </p>
                </div>
              </div>
            )}
            
            <button onClick={deleteAccount} disabled={loading}
              className="px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 disabled:opacity-50 font-grotesk flex items-center"
              style={{ backgroundColor: '#AE2C11' }}>
              {loading ? <Loader className="animate-spin mr-2" size={16} /> : <Trash2 size={16} className="mr-2" />}
              {showDeleteConfirm ? 'Confirm Delete' : 'Delete Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}