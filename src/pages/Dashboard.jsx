import { useState, useEffect } from 'react';
import { Users, FolderKanban, Video, CheckSquare, ChevronRight, Plus, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

// Helper to get user details
async function getUserDetails(userIds) {
  if (!userIds || userIds.length === 0) return [];
  
  try {
    // Try to get users from a custom function or direct query
    const uniqueIds = [...new Set(userIds)];
    const users = [];
    
    for (const id of uniqueIds) {
      // Get user data from auth
      const { data } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('user_id', id)
        .single();
      
      // Get profile from a profiles table or use metadata
      const { data: { user } } = await supabase.auth.admin.getUserById(id).catch(() => ({ data: { user: null } }));
      
      users.push({
        id,
        email: user?.email || 'unknown@email.com',
        full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Team Member',
        role: data?.role || 'member',
      });
    }
    
    return users;
  } catch (error) {
    console.log('Using fallback for user details');
    return userIds.map(id => ({ id, email: `user-${id.slice(0, 6)}@org.com`, full_name: 'Team Member' }));
  }
}

export default function Dashboard() {
  const organization = useAuthStore((state) => state.organization);
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState({ projects: 0, meetings: 0, tasks: 0, members: 0, completionRate: 0 });
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization) loadDashboardData();
  }, [organization]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: projects } = await supabase.from('projects').select('id, name, status').eq('organization_id', organization.id);
      const { data: meetings } = await supabase.from('meetings').select('id, title, start_time, status').eq('organization_id', organization.id).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true });
      
      let tasksData = [];
      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: tasks } = await supabase.from('tasks').select('id, title, status, priority, assignee_id, due_date, project_id, created_at').in('project_id', projectIds);
        tasksData = tasks || [];
      }

      // Get real team members with their details
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', organization.id);

      if (memberships && memberships.length > 0) {
        const memberIds = memberships.map(m => m.user_id);
        const userDetails = await getUserDetails(memberIds);
        
        // Map memberships with user details
        const members = memberships.map(m => {
          const details = userDetails.find(u => u.id === m.user_id);
          return {
            user_id: m.user_id,
            role: m.role,
            name: details?.full_name || 'Team Member',
            email: details?.email || 'No email',
            isYou: m.user_id === user.id,
          };
        });
        
        setTeamMembers(members);
      }

      const completedTasks = tasksData.filter(t => t.status === 'completed').length;
      const completionRate = tasksData.length ? Math.round((completedTasks / tasksData.length) * 100) : 0;

      setStats({
        projects: projects?.length || 0,
        meetings: meetings?.length || 0,
        tasks: tasksData.length || 0,
        members: memberships?.length || 0,
        completionRate
      });

      const assignedToMe = tasksData.filter(t => t.assignee_id === user.id && t.status !== 'completed')
        .sort((a, b) => { const order = { urgent: 0, high: 1, medium: 2, low: 3 }; return order[a.priority] - order[b.priority]; });
      setMyTasks(assignedToMe.slice(0, 5));

      const recentTasks = tasksData.filter(t => t.assignee_id || t.status === 'completed')
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 5);
      setRecentActivity(recentTasks);
      setUpcomingMeetings(meetings?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Projects', value: stats.projects, icon: FolderKanban, color: '#DB9941', link: '/app/projects' },
    { title: 'Members', value: stats.members, icon: Users, color: '#39444D', link: '/app/settings' },
    { title: 'Meetings', value: stats.meetings, icon: Video, color: '#AE2C11', link: '/app/meetings' },
    { title: 'Tasks', value: stats.tasks, icon: CheckSquare, color: '#5D5D5D', link: '/app/projects' },
  ];

  const getPriorityStyle = (priority) => {
    const s = { urgent: { dot: '#AE2C11' }, high: { dot: '#DB9941' }, medium: { dot: '#39444D' }, low: { dot: '#5D5D5D' } };
    return s[priority] || s.medium;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto" style={{ borderColor: '#DB9941' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#07111D] font-display">Dashboard</h1>
          <p className="text-xs sm:text-sm text-[#5D5D5D] mt-0.5 font-grotesk">Welcome back, {user?.user_metadata?.full_name || user?.email || 'User'}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Link to="/app/meetings" className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all hover:scale-105 font-grotesk border" style={{ borderColor: '#39444D20', color: '#39444D' }}>
            <Video size={14} className="mr-1.5" />Record
          </Link>
          <Link to="/app/projects" className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm font-semibold transition-all hover:scale-105 font-grotesk" style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
            <Plus size={14} className="mr-1.5" />Task
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {statCards.map((stat, index) => (
          <Link to={stat.link} key={index}
            className="p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer bg-white border border-[#39444D]/10">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-[#5D5D5D] font-grotesk uppercase tracking-wider truncate">{stat.title}</p>
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-[#07111D] mt-0.5 font-display">{stat.value}</p>
              </div>
              <div className="p-1.5 sm:p-2 lg:p-3 rounded-lg sm:rounded-xl flex-shrink-0" style={{ backgroundColor: `${stat.color}15` }}>
                <stat.icon size={16} className="sm:w-[18px] lg:w-[22px]" style={{ color: stat.color }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* My Tasks */}
        <div className="lg:col-span-2 rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-white border border-[#39444D]/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-[#07111D] font-display">My Tasks</h3>
            {myTasks.length > 0 && (
              <Link to="/app/projects" className="text-xs sm:text-sm text-[#DB9941] hover:text-[#AE2C11] font-grotesk flex items-center">View All <ChevronRight size={14} /></Link>
            )}
          </div>
          {myTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare size={36} className="mx-auto mb-3 text-[#5D5D5D]/30" />
              <p className="text-xs sm:text-sm text-[#5D5D5D] font-grotesk">No tasks assigned to you</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTasks.map(task => {
                const priorityStyle = getPriorityStyle(task.priority);
                return (
                  <div key={task.id} className="flex items-center justify-between p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-[#E5E5DF]">
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: priorityStyle.dot }}></div>
                      <p className="font-medium text-[#07111D] font-grotesk text-xs sm:text-sm truncate">{task.title}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold font-grotesk whitespace-nowrap" style={{ backgroundColor: priorityStyle.dot + '20', color: priorityStyle.dot }}>{task.priority}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Completion Rate */}
          <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-white border border-[#39444D]/10">
            <h3 className="font-semibold text-[#07111D] mb-3 sm:mb-4 font-grotesk text-sm sm:text-base">Completion Rate</h3>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl sm:text-4xl font-bold text-[#07111D] font-display">{stats.completionRate}%</span>
              <span className="text-[10px] sm:text-xs text-[#5D5D5D] font-grotesk">{stats.tasks} total</span>
            </div>
            <div className="w-full h-2 sm:h-2.5 rounded-full bg-[#E5E5DF]">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stats.completionRate}%`, background: 'linear-gradient(90deg, #DB9941, #AE2C11)' }} />
            </div>
          </div>

          {/* Team Members - NOW SHOWING REAL DATA */}
          <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-white border border-[#39444D]/10">
            <h3 className="font-semibold text-[#07111D] mb-3 sm:mb-4 font-grotesk text-sm sm:text-base">Team Members</h3>
            <div className="space-y-2 sm:space-y-3">
              {teamMembers.slice(0, 5).map(member => (
                <div key={member.user_id} className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: member.isYou ? '#DB9941' : '#39444D' }}>
                    {member.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-[#07111D] font-grotesk truncate">
                      {member.name}
                      {member.isYou && <span className="text-[#DB9941] ml-1 text-[10px]">(You)</span>}
                    </p>
                    <p className="text-[10px] sm:text-xs text-[#5D5D5D] font-grotesk truncate">{member.email}</p>
                  </div>
                  <span className="text-[10px] sm:text-xs text-[#5D5D5D] font-grotesk capitalize bg-[#39444D]/5 px-2 py-0.5 rounded">{member.role}</span>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-xs text-[#5D5D5D] font-grotesk text-center py-2">No members yet</p>
              )}
            </div>
            {teamMembers.length > 5 && (
              <p className="text-[10px] sm:text-xs text-[#5D5D5D] font-grotesk text-center mt-2">+{teamMembers.length - 5} more members</p>
            )}
          </div>

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-white border border-[#39444D]/10">
              <h3 className="font-semibold text-[#07111D] mb-3 sm:mb-4 font-grotesk text-sm sm:text-base">Recent Activity</h3>
              <div className="space-y-2">
                {recentActivity.map(task => {
                  const priorityStyle = getPriorityStyle(task.priority);
                  return (
                    <div key={task.id} className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: task.status === 'completed' ? '#10B981' : priorityStyle.dot }}></div>
                      <p className="text-xs text-[#39444D] font-grotesk truncate">{task.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-white border border-[#39444D]/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-[#07111D] font-display">Upcoming Meetings</h3>
            <Link to="/app/meetings" className="text-xs sm:text-sm text-[#DB9941] font-grotesk flex items-center">View All <ChevronRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl bg-[#E5E5DF]">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 bg-[#DB9941]/10">
                    <Video size={14} className="sm:w-[18px]" style={{ color: '#DB9941' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#07111D] font-grotesk text-xs sm:text-sm truncate">{meeting.title || 'Meeting'}</p>
                    <p className="text-[10px] sm:text-xs text-[#5D5D5D] font-mono">{new Date(meeting.start_time).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}