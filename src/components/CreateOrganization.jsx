import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Building2, Zap, Loader, Check } from 'lucide-react';

export default function CreateOrganization({ onCreated }) {
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [loading, setLoading] = useState(false);
  
  const user = useAuthStore((state) => state.user);
  const loadOrganization = useAuthStore((state) => state.loadOrganization);

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name) => {
    setOrgName(name);
    setOrgSlug(generateSlug(name));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      toast.error('Please enter an organization name');
      return;
    }

    setLoading(true);

    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          slug: orgSlug.trim() || generateSlug(orgName.trim()),
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      // Create default channels
      const defaultChannels = ['general', 'random', 'announcements'];
      for (const channelName of defaultChannels) {
        try {
          const { data: channel } = await supabase
            .from('channels')
            .insert({
              organization_id: org.id,
              name: channelName,
              type: 'public',
              created_by: user.id
            })
            .select()
            .single();

          if (channel) {
            await supabase
              .from('channel_members')
              .insert({
                channel_id: channel.id,
                user_id: user.id
              });
          }
        } catch (err) {
          console.error(`Error creating channel ${channelName}:`, err);
        }
      }

      // Create a default project
      await supabase
        .from('projects')
        .insert({
          organization_id: org.id,
          name: 'My First Project',
          description: 'Welcome to MeetingFlow AI! Start by adding tasks and recording meetings.',
          status: 'active',
          created_by: user.id
        });

      // Reload organization in store
      await loadOrganization();
      
      toast.success('Organization created successfully! 🎉');
      
      if (onCreated) {
        onCreated(org);
      }

    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error('Failed to create organization: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create Your Organization</h1>
        <p className="text-gray-500 mt-2">
          Set up your workspace to start managing projects and meetings
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Organization Name *
          </label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., My Agency, Tech Startup, Freelance Studio"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-lg"
            required
            autoFocus
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workspace URL
          </label>
          <div className="flex items-center">
            <span className="px-3 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-500 text-sm">
              app.meetingflow.ai/
            </span>
            <input
              type="text"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              placeholder="your-organization"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This will be your unique workspace URL
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">What you'll get:</h3>
          <ul className="space-y-2">
            {[
              'Private workspace for your team',
              'Project management with Kanban boards',
              'Meeting recording and transcription',
              'AI-powered meeting insights',
              'Team chat and collaboration',
              'Client portal for deliverables',
              'File sharing and management',
              'Analytics and reporting'
            ].map((feature, index) => (
              <li key={index} className="flex items-center text-sm text-blue-700">
                <Check size={16} className="mr-2 text-blue-600 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={20} />
              <span>Creating Organization...</span>
            </>
          ) : (
            <>
              <Zap size={20} />
              <span>Create Organization</span>
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          By creating an organization, you agree to our Terms of Service
        </p>
      </form>
    </div>
  );
}