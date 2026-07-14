import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState({
    taskStats: [],
    projectProgress: [],
    teamWorkload: [],
    meetingStats: []
  });
  const [loading, setLoading] = useState(true);
  
  const organization = useAuthStore(state => state.organization);

  useEffect(() => {
    if (organization) {
      loadAnalytics();
    }
  }, [organization]);

  const loadAnalytics = async () => {
    try {
      // Get all projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organization.id);

      // Get all tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .in('project_id', projects?.map(p => p.id) || []);

      // Get meetings
      const { data: meetings } = await supabase
        .from('meetings')
        .select('*')
        .eq('organization_id', organization.id);

      // Calculate task stats
      const taskByStatus = [
        { name: 'Backlog', value: tasks?.filter(t => t.status === 'backlog').length || 0 },
        { name: 'To Do', value: tasks?.filter(t => t.status === 'todo').length || 0 },
        { name: 'In Progress', value: tasks?.filter(t => t.status === 'in_progress').length || 0 },
        { name: 'Review', value: tasks?.filter(t => t.status === 'review').length || 0 },
        { name: 'Completed', value: tasks?.filter(t => t.status === 'completed').length || 0 },
      ];

      // Calculate project progress
      const projectProgress = projects?.map(project => {
        const projectTasks = tasks?.filter(t => t.project_id === project.id) || [];
        const completed = projectTasks.filter(t => t.status === 'completed').length;
        const total = projectTasks.length;
        return {
          name: project.name,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
          tasks: total,
          completed: completed
        };
      }) || [];

      // Calculate team workload
      const userTasks = {};
      tasks?.forEach(task => {
        if (task.assignee_id) {
          userTasks[task.assignee_id] = (userTasks[task.assignee_id] || 0) + 1;
        }
      });
      
      const teamWorkload = Object.entries(userTasks).map(([userId, count]) => ({
        name: `User ${userId.slice(0, 4)}`,
        tasks: count,
        completed: tasks?.filter(t => t.assignee_id === userId && t.status === 'completed').length || 0
      }));

      // Meeting stats by week
      const meetingByWeek = {};
      meetings?.forEach(meeting => {
        const week = new Date(meeting.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        meetingByWeek[week] = (meetingByWeek[week] || 0) + 1;
      });

      const meetingStats = Object.entries(meetingByWeek).map(([week, count]) => ({
        week,
        meetings: count
      })).slice(-7);

      setAnalytics({
        taskStats: taskByStatus,
        projectProgress,
        teamWorkload,
        meetingStats
      });
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics Dashboard</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center space-x-2 text-blue-600">
            <CheckCircle size={20} />
            <span className="text-sm font-medium">Total Tasks</span>
          </div>
          <p className="text-3xl font-bold mt-2">
            {analytics.taskStats.reduce((sum, item) => sum + item.value, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center space-x-2 text-green-600">
            <TrendingUp size={20} />
            <span className="text-sm font-medium">Completion Rate</span>
          </div>
          <p className="text-3xl font-bold mt-2">
            {Math.round(
              (analytics.taskStats.find(t => t.name === 'Completed')?.value || 0) /
              Math.max(analytics.taskStats.reduce((sum, item) => sum + item.value, 0), 1) * 100
            )}%
          </p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center space-x-2 text-purple-600">
            <Users size={20} />
            <span className="text-sm font-medium">Team Members</span>
          </div>
          <p className="text-3xl font-bold mt-2">
            {analytics.teamWorkload.length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center space-x-2 text-orange-600">
            <Clock size={20} />
            <span className="text-sm font-medium">Meetings This Week</span>
          </div>
          <p className="text-3xl font-bold mt-2">
            {analytics.meetingStats[analytics.meetingStats.length - 1]?.meetings || 0}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Distribution */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Task Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.taskStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.taskStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Project Progress */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Project Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.projectProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="progress" fill="#3b82f6" name="Progress %" />
              <Bar dataKey="tasks" fill="#10b981" name="Total Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team Workload */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Team Workload</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.teamWorkload}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tasks" fill="#8b5cf6" name="Assigned Tasks" />
              <Bar dataKey="completed" fill="#10b981" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Meeting Frequency */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Meeting Frequency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.meetingStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="meetings" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Meetings" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}