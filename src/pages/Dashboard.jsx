import { useState, useEffect } from 'react';
import {
  Users,
  FolderKanban,
  Video,
  CheckSquare,
  TrendingUp,
  Clock,
  AlertCircle,
  ChevronRight,
  User,
  Zap,
} from 'lucide-react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const organization = useAuthStore((state) => state.organization);
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState({
    projects: 0,
    meetings: 0,
    tasks: 0,
    members: 0,
    completionRate: 0
  });
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      loadDashboardData();
    }
  }, [organization]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('organization_id', organization.id);

      // Load upcoming meetings
      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, title, start_time, status')
        .eq('organization_id', organization.id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      // Load tasks
      let tasksData = [];
      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title, status, priority, assignee_id, due_date, project_id')
          .in('project_id', projectIds);
        tasksData = tasks || [];
      }

      // Load team members
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', organization.id);

      if (members) {
        setTeamMembers(members.map(m => ({
          ...m,
          name: m.user_id === user.id ? 'You' : `Member (${m.role})`,
        })));
      }

      // Calculate stats
      const completedTasks = tasksData.filter(t => t.status === 'completed').length;
      const completionRate = tasksData.length ? Math.round((completedTasks / tasksData.length) * 100) : 0;

      setStats({
        projects: projects?.length || 0,
        meetings: meetings?.length || 0,
        tasks: tasksData.length || 0,
        members: members?.length || 0,
        completionRate: completionRate
      });

      // My tasks (assigned to current user, not completed)
      const assignedToMe = tasksData.filter(
        t => t.assignee_id === user.id && t.status !== 'completed'
      ).sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setMyTasks(assignedToMe.slice(0, 5));

      // Recent activity
      const recentTasks = tasksData
        .filter(t => t.assignee_id || t.status === 'completed')
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 5);

      setRecentActivity(recentTasks);
      setUpcomingMeetings(meetings?.slice(0, 5) || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Active Projects', value: stats.projects, icon: FolderKanban, color: '#DB9941', link: '/app/projects' },
    { title: 'Team Members', value: stats.members, icon: Users, color: '#39444D', link: '/app/settings' },
    { title: 'Upcoming Meetings', value: stats.meetings, icon: Video, color: '#AE2C11', link: '/app/meetings' },
    { title: 'Open Tasks', value: stats.tasks, icon: CheckSquare, color: '#5D5D5D', link: '/app/projects' },
  ];

  const getPriorityStyle = (priority) => {
    const styles = {
      urgent: { bg: '#AE2C1120', color: '#AE2C11', dot: '#AE2C11' },
      high: { bg: '#DB994120', color: '#DB9941', dot: '#DB9941' },
      medium: { bg: '#39444D20', color: '#39444D', dot: '#39444D' },
      low: { bg: '#5D5D5D20', color: '#5D5D5D', dot: '#5D5D5D' },
    };
    return styles[priority] || styles.medium;
  };

  const getStatusStyle = (status) => {
    const styles = {
      completed: { bg: '#10B98120', color: '#10B981' },
      in_progress: { bg: '#DB994120', color: '#DB9941' },
      review: { bg: '#AE2C1120', color: '#AE2C11' },
      todo: { bg: '#39444D20', color: '#39444D' },
      backlog: { bg: '#5D5D5D20', color: '#5D5D5D' },
    };
    return styles[status] || styles.todo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#DB9941' }}></div>
          <p className="text-[#5D5D5D] font-grotesk">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#07111D] font-display">Dashboard</h1>
          <p className="text-[#5D5D5D] mt-1 font-grotesk">
            Welcome back, {organization?.name || 'Workspace'}
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center space-x-3">
          <Link to="/app/meetings"
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 font-grotesk border"
            style={{ borderColor: '#39444D20', color: '#39444D' }}>
            <Video size={16} className="inline mr-2" />
            Record Meeting
          </Link>
          <Link to="/app/projects"
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:scale-105 font-grotesk"
            style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
            <Plus size={16} className="inline mr-2" />
            New Task
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Link to={stat.link} key={index}
            className="p-5 rounded-2xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
            style={{ 
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(57, 68, 77, 0.1)',
              boxShadow: '0 4px 20px rgba(7, 17, 29, 0.05)'
            }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#5D5D5D] font-grotesk uppercase tracking-wider">{stat.title}</p>
                <p className="text-3xl font-bold text-[#07111D] mt-1 font-display">{stat.value}</p>
              </div>
              <div className="p-3 rounded-xl transition-transform hover:scale-110" 
                style={{ backgroundColor: `${stat.color}15` }}>
                <stat.icon size={22} style={{ color: stat.color }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks Section */}
        <div className="lg:col-span-2 rounded-2xl p-6" style={{ 
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(57, 68, 77, 0.1)',
          boxShadow: '0 4px 20px rgba(7, 17, 29, 0.05)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#07111D] font-display">
              My Tasks
            </h3>
            {myTasks.length > 0 && (
              <Link to="/app/projects" 
                className="text-sm text-[#DB9941] hover:text-[#AE2C11] font-grotesk flex items-center">
                View All <ChevronRight size={16} />
              </Link>
            )}
          </div>

          {myTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare size={40} className="mx-auto mb-3 text-[#5D5D5D]/30" />
              <p className="text-[#5D5D5D] font-grotesk">No tasks assigned to you</p>
              <p className="text-xs text-[#5D5D5D] mt-1 font-grotesk">
                Tasks assigned to you will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTasks.map(task => {
                const priorityStyle = getPriorityStyle(task.priority);
                const statusStyle = getStatusStyle(task.status);
                return (
                  <div key={task.id} 
                    className="flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-md"
                    style={{ backgroundColor: '#E5E5DF' }}>
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: priorityStyle.dot }}></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#07111D] font-grotesk text-sm truncate">
                          {task.title}
                        </p>
                        {task.due_date && (
                          <p className="text-xs text-[#5D5D5D] font-mono mt-1">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold font-grotesk"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-bold font-grotesk"
                        style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.color }}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Completion Rate */}
          <div className="rounded-2xl p-6" style={{ 
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(57, 68, 77, 0.1)',
            boxShadow: '0 4px 20px rgba(7, 17, 29, 0.05)'
          }}>
            <h3 className="font-semibold text-[#07111D] mb-4 font-grotesk">Completion Rate</h3>
            <div className="flex items-end justify-between mb-3">
              <span className="text-4xl font-bold text-[#07111D] font-display">{stats.completionRate}%</span>
              <span className="text-sm text-[#5D5D5D] font-grotesk">
                {stats.tasks - (Math.round(stats.completionRate * stats.tasks / 100))} remaining
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full" style={{ backgroundColor: '#E5E5DF' }}>
              <div className="h-2.5 rounded-full transition-all duration-500"
                style={{ 
                  width: `${stats.completionRate}%`,
                  background: 'linear-gradient(90deg, #DB9941, #AE2C11)'
                }} />
            </div>
          </div>

          {/* Team Members */}
          <div className="rounded-2xl p-6" style={{ 
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(57, 68, 77, 0.1)',
            boxShadow: '0 4px 20px rgba(7, 17, 29, 0.05)'
          }}>
            <h3 className="font-semibold text-[#07111D] mb-4 font-grotesk">Team Members</h3>
            <div className="space-y-3">
              {teamMembers.slice(0, 5).map(member => (
                <div key={member.user_id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ 
                      backgroundColor: member.user_id === user.id ? '#DB9941' : '#39444D'
                    }}>
                    {member.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#07111D] font-grotesk truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-[#5D5D5D] font-grotesk capitalize">{member.role}</p>
                  </div>
                  {member.user_id === user.id && (
                    <span className="text-xs text-[#DB9941] font-grotesk font-semibold">You</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <div className="rounded-2xl p-6" style={{ 
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(57, 68, 77, 0.1)',
              boxShadow: '0 4px 20px rgba(7, 17, 29, 0.05)'
            }}>
              <h3 className="font-semibold text-[#07111D] mb-4 font-grotesk">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map(task => {
                  const priorityStyle = getPriorityStyle(task.priority);
                  return (
                    <div key={task.id} className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: task.status === 'completed' ? '#10B981' : priorityStyle.dot }}></div>
                      <p className="text-sm text-[#39444D] font-grotesk truncate">{task.title}</p>
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
        <div className="rounded-2xl p-6" style={{ 
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(57, 68, 77, 0.1)',
          boxShadow: '0 4px 20px rgba(7, 17, 29, 0.05)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#07111D] font-display">Upcoming Meetings</h3>
            <Link to="/app/meetings" 
              className="text-sm text-[#DB9941] hover:text-[#AE2C11] font-grotesk flex items-center">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.id} 
                className="flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-md"
                style={{ backgroundColor: '#E5E5DF' }}>
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#DB994110' }}>
                    <Video size={18} style={{ color: '#DB9941' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#07111D] font-grotesk text-sm truncate">
                      {meeting.title || 'Untitled Meeting'}
                    </p>
                    <p className="text-xs text-[#5D5D5D] font-mono">
                      {new Date(meeting.start_time).toLocaleDateString()} at {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold font-grotesk flex-shrink-0 ml-3"
                  style={{ backgroundColor: '#10B98120', color: '#10B981' }}>
                  {meeting.status || 'Scheduled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}