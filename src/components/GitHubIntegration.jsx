import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { 
  GitBranch, 
  GitPullRequest, 
  Check, 
  Link, 
  Unlink, 
  ExternalLink,
  Globe
} from 'lucide-react';

export default function GitHubIntegration({ projectId }) {
  const [isConnected, setIsConnected] = useState(false);
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const organization = useAuthStore((state) => state.organization);

  const connectGitHub = async () => {
    if (!repo.trim() || !token.trim()) {
      toast.error('Please enter repository and token');
      return;
    }

    // Validate repo format
    if (!repo.includes('/')) {
      toast.error('Please enter repository as owner/repo');
      return;
    }

    setLoading(true);
    try {
      const [owner, repoName] = repo.split('/');
      const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls?state=open`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Invalid repository or token');
      }

      const data = await response.json();
      setPrs(data.slice(0, 10));
      setIsConnected(true);
      setShowSetup(false);

      // Save connection to database
      await supabase.from('project_members').upsert({
        project_id: projectId,
        user_id: useAuthStore.getState().user.id,
        role: 'member',
        metadata: { 
          github_repo: repo,
          github_connected: true,
        },
      });

      toast.success('GitHub connected successfully!');
    } catch (error) {
      toast.error('Failed to connect: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setIsConnected(false);
    setPrs([]);
    setRepo('');
    setToken('');
    
    try {
      await supabase.from('project_members').upsert({
        project_id: projectId,
        user_id: useAuthStore.getState().user.id,
        role: 'member',
        metadata: { 
          github_connected: false,
        },
      });
      toast.success('GitHub disconnected');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const linkTaskToPR = async (taskId, prNumber) => {
    try {
      await supabase
        .from('tasks')
        .update({ 
          metadata: { 
            github_pr: prNumber,
            github_repo: repo,
          }
        })
        .eq('id', taskId);

      toast.success('Task linked to PR!');
    } catch (error) {
      toast.error('Failed to link task');
    }
  };

  const getPRStatus = (state) => {
    const statuses = {
      open: { bg: '#10B98120', color: '#10B981', label: 'Open' },
      closed: { bg: '#AE2C1120', color: '#AE2C11', label: 'Closed' },
      merged: { bg: '#8B5CF620', color: '#8B5CF6', label: 'Merged' },
    };
    return statuses[state] || statuses.open;
  };

  // GitHub SVG Icon Component
  const GitHubIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#24292e] flex items-center justify-center">
            <GitHubIcon />
          </div>
          <div>
            <h3 className="font-bold text-[#07111D] font-display text-lg">GitHub Integration</h3>
            <p className="text-xs text-[#5D5D5D] font-grotesk">
              {isConnected ? `Connected to ${repo}` : 'Link tasks to pull requests'}
            </p>
          </div>
        </div>
        
        {isConnected ? (
          <button
            onClick={disconnect}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors font-grotesk"
          >
            <Unlink size={14} />
            <span>Disconnect</span>
          </button>
        ) : (
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:scale-105 font-grotesk"
            style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}
          >
            <Link size={14} />
            <span>Connect GitHub</span>
          </button>
        )}
      </div>

      {/* Setup Form */}
      {showSetup && !isConnected && (
        <div className="mb-6 p-4 rounded-xl bg-[#E5E5DF] space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">
              Repository (owner/repo)
            </label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="e.g., facebook/react"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#DB9941] focus:outline-none font-grotesk text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">
              GitHub Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#DB9941] focus:outline-none font-grotesk text-sm"
            />
            <p className="text-xs text-[#5D5D5D] mt-1 font-grotesk">
              Create a token at{' '}
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" 
                className="text-[#DB9941] underline">
                github.com/settings/tokens
              </a>
              {' '}with 'repo' scope
            </p>
          </div>
          <button
            onClick={connectGitHub}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-white font-semibold transition-all hover:scale-105 disabled:opacity-50 font-grotesk flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </button>
        </div>
      )}

      {/* Pull Requests List */}
      {isConnected && prs.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-[#07111D] font-grotesk text-sm">Open Pull Requests</h4>
          {prs.map((pr) => {
            const status = getPRStatus(pr.state);
            return (
              <div key={pr.id} 
                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-[#DB9941]/50 transition-all">
                <div className="flex items-center space-x-3 min-w-0">
                  <GitPullRequest size={18} style={{ color: status.color }} className="flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#07111D] font-grotesk truncate">{pr.title}</p>
                    <p className="text-xs text-[#5D5D5D] font-mono">
                      #{pr.number} by {pr.user?.login || 'unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                  <span className="px-2 py-1 rounded-full text-xs font-bold font-grotesk"
                    style={{ backgroundColor: status.bg, color: status.color }}>
                    {status.label}
                  </span>
                  <a 
                    href={pr.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    title="Open in GitHub"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isConnected && prs.length === 0 && (
        <div className="text-center py-8">
          <GitPullRequest size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-[#5D5D5D] font-grotesk">No open pull requests</p>
        </div>
      )}
    </div>
  );
}