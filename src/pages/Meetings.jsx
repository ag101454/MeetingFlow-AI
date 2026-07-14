import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Video, Calendar, Clock, Building2, AlertCircle,
  Mic, Play, Pause, Square, Loader, Sparkles,
  FileText, CheckCircle, Zap, ArrowRight, Download,
  ChevronRight, BarChart3, Users, MessageSquare,
  Pencil, Monitor, StopCircle, Volume2, VolumeX,
  Maximize2, Minimize2, RefreshCw, Share2, Trash2,
  Copy, ExternalLink
} from 'lucide-react';
import { Search } from 'lucide-react';
import MeetingRecorder from '../components/MeetingRecorder';
import CollaborativeWhiteboard from '../components/CollaborativeWhiteboard';
import GitHubIntegration from '../components/GitHubIntegration';

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, tasksCreated: 0, avgDuration: 0 });
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const organization = useAuthStore((state) => state.organization);
  const loadOrganization = useAuthStore((state) => state.loadOrganization);
  const user = useAuthStore((state) => state.user);

  // Theme colors
  const colors = {
    dark: '#07111D',
    charcoal: '#39444D',
    gray: '#5D5D5D',
    light: '#E5E5DF',
    gold: '#DB9941',
    rust: '#AE2C11',
    white: '#FFFFFF',
  };

  useEffect(() => {
    if (!organization) {
      loadOrganization();
    }
  }, []);

  useEffect(() => {
    if (organization) {
      loadMeetings();
      loadStats();
    }
  }, [organization]);

  const loadMeetings = async () => {
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });

    if (data) {
      setMeetings(data);
      if (data.length > 0 && !selectedMeeting) {
        setSelectedMeeting(data[0]);
      }
    }
  };

  const loadStats = async () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: allMeetings } = await supabase
      .from('meetings')
      .select('id, created_at')
      .eq('organization_id', organization.id);

    const { data: recentMeetings } = await supabase
      .from('meetings')
      .select('id')
      .eq('organization_id', organization.id)
      .gte('created_at', weekAgo.toISOString());

    const { count: tasksCreated } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .not('metadata->meeting_id', 'is', null);

    setStats({
      total: allMeetings?.length || 0,
      thisWeek: recentMeetings?.length || 0,
      tasksCreated: tasksCreated || 0,
      avgDuration: 32,
    });
  };

  const handleMeetingProcessed = (data) => {
    if (data.meeting) {
      setMeetings(prev => [data.meeting, ...prev]);
      setSelectedMeeting(data.meeting);
    }
    setShowRecorder(false);
    loadStats();
  };

  const deleteMeeting = async (meetingId) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;

      setMeetings(prev => prev.filter(m => m.id !== meetingId));
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(meetings[0] || null);
      }
      toast.success('Meeting deleted');
      loadStats();
    } catch (error) {
      toast.error('Failed to delete meeting');
    }
  };

  const copyTranscript = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Transcript copied to clipboard!');
  };

  const shareMeeting = (meeting) => {
    const url = `${window.location.origin}/app/meetings/${meeting.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Meeting link copied!');
  };

  const filteredMeetings = meetings.filter(meeting => {
    if (filterStatus !== 'all' && meeting.status !== filterStatus) return false;
    if (searchQuery) {
      return (
        meeting.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const statCards = [
    { 
      icon: Video, 
      label: 'Total Meetings', 
      value: stats.total, 
      color: '#DB9941',
      bg: '#DB994110',
      border: '#DB994130'
    },
    { 
      icon: Calendar, 
      label: 'This Week', 
      value: stats.thisWeek, 
      color: '#39444D',
      bg: '#39444D10',
      border: '#39444D30'
    },
    { 
      icon: CheckCircle, 
      label: 'Tasks Created', 
      value: stats.tasksCreated, 
      color: '#10B981',
      bg: '#10B98110',
      border: '#10B98130'
    },
    { 
      icon: Clock, 
      label: 'Avg Duration', 
      value: `${stats.avgDuration}m`, 
      color: '#AE2C11',
      bg: '#AE2C1110',
      border: '#AE2C1130'
    },
  ];

  const statusFilters = [
    { value: 'all', label: 'All', count: meetings.length },
    { value: 'completed', label: 'Completed', count: meetings.filter(m => m.status === 'completed').length },
    { value: 'scheduled', label: 'Scheduled', count: meetings.filter(m => m.status === 'scheduled').length },
    { value: 'in_progress', label: 'In Progress', count: meetings.filter(m => m.status === 'in_progress').length },
  ];

  if (!organization) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 border" style={{ backgroundColor: '#DB994110', borderColor: '#DB994130' }}>
          <div className="flex items-start space-x-3">
            <AlertCircle size={24} style={{ color: '#DB9941' }} className="flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-[#07111D] font-display">Organization Required</h2>
              <p className="text-[#5D5D5D] mt-1 font-grotesk">Create an organization before recording meetings.</p>
            </div>
          </div>
        </div>
        
        <div className="text-center py-16 rounded-2xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20' }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#39444D10' }}>
            <Building2 size={36} style={{ color: '#39444D' }} />
          </div>
          <h2 className="text-2xl font-bold text-[#07111D] mb-3 font-display">Create an Organization First</h2>
          <p className="text-[#5D5D5D] mb-8 font-grotesk">Go to Projects to create your organization and start recording meetings.</p>
          <Link to="/app/projects" className="px-8 py-3.5 rounded-xl text-white font-semibold transition-all hover:scale-105 font-grotesk inline-flex items-center"
            style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
            Go to Projects
            <ArrowRight size={18} className="ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#07111D] font-display">Meetings</h1>
          <p className="text-[#5D5D5D] mt-1 font-grotesk">
            {organization.name} • {stats.total} meetings recorded
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Whiteboard Button */}
          <button
            onClick={() => setShowWhiteboard(true)}
            className="inline-flex items-center px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all hover:scale-105 font-grotesk"
            style={{ borderColor: '#39444D20', color: '#39444D' }}
          >
            <Pencil size={18} className="mr-2" />
            Whiteboard
          </button>
          
          {/* Record Button */}
          <button
            onClick={() => setShowRecorder(!showRecorder)}
            className="inline-flex items-center px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 font-grotesk"
            style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)', boxShadow: '0 10px 30px rgba(219, 153, 65, 0.3)' }}
          >
            {showRecorder ? (
              <>
                <StopCircle size={18} className="mr-2" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic size={18} className="mr-2" />
                Record Meeting
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {!showRecorder && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <div key={index} className="rounded-2xl p-5 border transition-all hover:shadow-lg cursor-pointer"
              style={{ backgroundColor: '#FFFFFF', borderColor: stat.border }}
              onClick={() => setFilterStatus(stat.label === 'Total Meetings' ? 'all' : 'completed')}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
                <ChevronRight size={16} className="text-[#5D5D5D]/30" />
              </div>
              <p className="text-2xl font-bold text-[#07111D] font-display">{stat.value}</p>
              <p className="text-xs text-[#5D5D5D] mt-1 font-grotesk">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      {!showRecorder && meetings.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] transition-all font-grotesk text-sm"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20', color: '#07111D' }}
            />
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5D5D5D]" />
          </div>
          <div className="flex space-x-2">
            {statusFilters.map(filter => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all font-grotesk ${
                  filterStatus === filter.value
                    ? 'text-white'
                    : 'text-[#5D5D5D] hover:text-[#07111D] border'
                }`}
                style={{
                  backgroundColor: filterStatus === filter.value ? '#07111D' : '#FFFFFF',
                  borderColor: filterStatus === filter.value ? '#07111D' : '#39444D20',
                }}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {showRecorder ? (
        <MeetingRecorder onMeetingProcessed={handleMeetingProcessed} />
      ) : (
        <>
          {/* Meetings List */}
          {filteredMeetings.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Meeting List */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="font-semibold text-[#07111D] mb-3 font-display text-lg">
                  {filterStatus === 'all' ? 'Recent Meetings' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Meetings`}
                </h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {filteredMeetings.map(meeting => (
                    <button
                      key={meeting.id}
                      onClick={() => setSelectedMeeting(meeting)}
                      className="w-full text-left p-4 rounded-xl transition-all border group"
                      style={{
                        backgroundColor: selectedMeeting?.id === meeting.id ? '#07111D' : '#FFFFFF',
                        color: selectedMeeting?.id === meeting.id ? '#E5E5DF' : '#07111D',
                        borderColor: selectedMeeting?.id === meeting.id ? '#07111D' : '#39444D20',
                        boxShadow: selectedMeeting?.id === meeting.id ? '0 4px 15px rgba(7, 17, 29, 0.2)' : 'none',
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: selectedMeeting?.id === meeting.id ? '#39444D' : '#39444D10' }}>
                          <Video size={18} style={{ color: selectedMeeting?.id === meeting.id ? '#DB9941' : '#39444D' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate font-grotesk">{meeting.title}</p>
                          <p className="text-xs mt-1 font-mono opacity-70">
                            {new Date(meeting.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 
                            size={14} 
                            className="text-red-400 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMeeting(meeting.id);
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Meeting Detail */}
              {selectedMeeting && (
                <div className="lg:col-span-2 rounded-2xl border p-6" style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20' }}>
                  {/* Actions Bar */}
                  <div className="flex items-center justify-end space-x-2 mb-4">
                    <button onClick={() => copyTranscript(selectedMeeting.transcript)} 
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Copy Transcript">
                      <Copy size={16} />
                    </button>
                    <button onClick={() => shareMeeting(selectedMeeting)} 
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Share Meeting">
                      <Share2 size={16} />
                    </button>
                    <button onClick={() => deleteMeeting(selectedMeeting.id)} 
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete Meeting">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#07111D] font-display">{selectedMeeting.title}</h2>
                      <div className="flex items-center space-x-4 mt-2 font-mono text-sm text-[#5D5D5D]">
                        <span className="flex items-center">
                          <Calendar size={14} className="mr-1.5" />
                          {new Date(selectedMeeting.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <Clock size={14} className="mr-1.5" />
                          {new Date(selectedMeeting.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold font-grotesk"
                      style={{ 
                        backgroundColor: selectedMeeting.status === 'completed' ? '#10B98120' : '#DB994120',
                        color: selectedMeeting.status === 'completed' ? '#10B981' : '#DB9941'
                      }}>
                      {selectedMeeting.status}
                    </span>
                  </div>

                  {/* Summary */}
                  {selectedMeeting.summary && (
                    <div className="mb-6 p-5 rounded-xl" style={{ backgroundColor: '#E5E5DF' }}>
                      <h3 className="font-semibold text-[#07111D] mb-2 font-display flex items-center">
                        <Sparkles size={18} className="mr-2 text-[#DB9941]" />
                        AI Summary
                      </h3>
                      <p className="text-sm text-[#39444D] leading-relaxed font-grotesk">{selectedMeeting.summary}</p>
                    </div>
                  )}

                  {/* Highlights */}
                  {selectedMeeting.highlights?.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-[#07111D] mb-3 font-display">Highlights</h3>
                      <div className="space-y-2">
                        {selectedMeeting.highlights.map((highlight, i) => (
                          <div key={i} className="flex items-start space-x-3 p-3 rounded-lg" style={{ backgroundColor: '#DB994110' }}>
                            <Zap size={16} className="text-[#DB9941] flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-[#07111D] font-grotesk">{highlight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decisions */}
                  {selectedMeeting.decisions?.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-[#07111D] mb-3 font-display">Decisions Made</h3>
                      <div className="space-y-2">
                        {selectedMeeting.decisions.map((decision, i) => (
                          <div key={i} className="flex items-start space-x-3 p-3 rounded-lg" style={{ backgroundColor: '#39444D10' }}>
                            <CheckCircle size={16} className="text-[#39444D] flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-[#07111D] font-grotesk">{decision}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transcript */}
                  {selectedMeeting.transcript && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-[#07111D] mb-3 font-display">Full Transcript</h3>
                      <div className="p-4 rounded-xl max-h-48 overflow-y-auto relative" style={{ backgroundColor: '#E5E5DF' }}>
                        <p className="text-sm text-[#39444D] leading-relaxed whitespace-pre-wrap font-grotesk">
                          {selectedMeeting.transcript}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recording */}
                  {selectedMeeting.recording_url && (
                    <div className="mb-6 pt-6 border-t" style={{ borderColor: '#39444D10' }}>
                      <h3 className="font-semibold text-[#07111D] mb-3 font-display">Recording</h3>
                      <audio controls className="w-full" src={selectedMeeting.recording_url} />
                    </div>
                  )}

                  {/* GitHub Integration Section */}
                  <div className="pt-6 border-t" style={{ borderColor: '#39444D10' }}>
                    <GitHubIntegration projectId={selectedMeeting.project_id} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 rounded-2xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20' }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#39444D10' }}>
                <Video size={36} style={{ color: '#39444D' }} />
              </div>
              <h3 className="text-xl font-bold text-[#07111D] mb-3 font-display">
                {searchQuery ? 'No matching meetings' : 'No meetings yet'}
              </h3>
              <p className="text-[#5D5D5D] mb-6 font-grotesk">
                {searchQuery ? 'Try a different search term' : 'Record your first meeting to get AI-powered insights'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowRecorder(true)}
                  className="px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 font-grotesk"
                  style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}
                >
                  <Mic size={18} className="inline mr-2" />
                  Record Meeting
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Whiteboard Modal */}
      {showWhiteboard && (
        <CollaborativeWhiteboard 
          channelId={organization?.id} 
          onClose={() => setShowWhiteboard(false)} 
        />
      )}
    </div>
  );
}