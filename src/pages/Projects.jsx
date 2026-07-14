import { useState, useEffect } from 'react';
import { Plus, FolderKanban, Building2, AlertCircle, Clock, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import CreateOrganization from '../components/CreateOrganization';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assignee_id: '' });
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  
  const organization = useAuthStore((state) => state.organization);
  const user = useAuthStore((state) => state.user);
  const loadOrganization = useAuthStore((state) => state.loadOrganization);

  // Load team members when organization changes
  useEffect(() => {
    if (organization?.id) {
      loadTeamMembers();
    }
  }, [organization]);

  useEffect(() => {
    if (!organization) {
      loadOrganization();
    }
  }, []);

  useEffect(() => {
    if (organization?.id) {
      loadProjects();
    } else {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    if (selectedProject?.id) {
      loadTasks(selectedProject.id);
    }
  }, [selectedProject]);

  const loadTeamMembers = async () => {
    try {
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', organization.id);

      if (error) throw error;

      if (memberships) {
        const members = memberships.map(m => ({
          user_id: m.user_id,
          role: m.role,
          name: m.user_id === user.id ? 'You' : `Team Member (${m.role})`,
        }));
        setTeamMembers(members);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (error) throw error;
      if (data) setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    
    if (!newProject.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          organization_id: organization.id,
          name: newProject.name.trim(),
          description: newProject.description.trim(),
          created_by: user.id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setProjects(prev => [data, ...prev]);
        setSelectedProject(data);
        setShowNewProject(false);
        setNewProject({ name: '', description: '' });
        toast.success('Project created successfully!');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      const taskData = {
        project_id: selectedProject.id,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        status: 'todo',
        created_by: user.id,
        assignee_id: newTask.assignee_id || null,
        position: tasks.filter(t => t.status === 'todo').length
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setTasks(prev => [...prev, data]);
        setShowNewTask(false);
        setNewTask({ title: '', description: '', priority: 'medium', assignee_id: '' });
        toast.success('Task created successfully!');

        // Send notification to assignee if assigned to someone else
        if (newTask.assignee_id && newTask.assignee_id !== user.id) {
          try {
            await supabase.from('notifications').insert({
              user_id: newTask.assignee_id,
              organization_id: organization.id,
              type: 'task_assigned',
              title: '📋 New Task Assigned',
              message: `You've been assigned to: "${newTask.title}" in project "${selectedProject.name}"`,
              data: { task_id: data.id, project_id: selectedProject.id }
            });
          } catch (notifError) {
            console.error('Failed to send notification:', notifError);
          }
        }
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) {
        loadTasks(selectedProject.id);
        toast.error('Failed to update task');
      }
    } catch (error) {
      loadTasks(selectedProject.id);
    }
  };

  const updateTaskAssignee = async (taskId, newAssigneeId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ assignee_id: newAssigneeId || null })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, assignee_id: newAssigneeId || null } : t
      ));

      // Send notification if assigned to someone else
      if (newAssigneeId && newAssigneeId !== user.id) {
        const task = tasks.find(t => t.id === taskId);
        await supabase.from('notifications').insert({
          user_id: newAssigneeId,
          organization_id: organization.id,
          type: 'task_assigned',
          title: '📋 Task Reassigned',
          message: `You've been assigned to: "${task?.title}"`,
          data: { task_id: taskId, project_id: selectedProject.id }
        });
      }

      toast.success('Assignee updated!');
    } catch (error) {
      console.error('Error updating assignee:', error);
      toast.error('Failed to update assignee');
    }
  };

  const handleOrgCreated = async (org) => {
    setShowCreateOrg(false);
    await loadOrganization();
    toast.success('Organization created! You can now create projects and record meetings.');
  };

  const STATUSES = [
    { id: 'backlog', label: 'Backlog', color: '#5D5D5D', bg: '#5D5D5D15' },
    { id: 'todo', label: 'To Do', color: '#39444D', bg: '#39444D15' },
    { id: 'in_progress', label: 'In Progress', color: '#DB9941', bg: '#DB994115' },
    { id: 'review', label: 'Review', color: '#AE2C11', bg: '#AE2C1115' },
    { id: 'completed', label: 'Completed', color: '#10B981', bg: '#10B98115' },
  ];

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityStyle = (priority) => {
    const styles = {
      urgent: { bg: '#AE2C1120', color: '#AE2C11', border: '#AE2C1140' },
      high: { bg: '#DB994120', color: '#DB9941', border: '#DB994140' },
      medium: { bg: '#39444D20', color: '#39444D', border: '#39444D40' },
      low: { bg: '#5D5D5D20', color: '#5D5D5D', border: '#5D5D5D40' },
    };
    return styles[priority] || styles.medium;
  };

  const getAssigneeName = (assigneeId) => {
    if (!assigneeId) return null;
    if (assigneeId === user.id) return 'You';
    const member = teamMembers.find(m => m.user_id === assigneeId);
    return member?.name || 'Assigned';
  };

  // No organization state
  if (!organization && !loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 border" style={{ backgroundColor: '#DB994110', borderColor: '#DB994130' }}>
          <div className="flex items-start space-x-3">
            <AlertCircle size={24} style={{ color: '#DB9941' }} className="flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-[#07111D] font-display">No Organization Found</h2>
              <p className="text-[#5D5D5D] mt-1 font-grotesk">
                You need to create an organization before you can create projects and record meetings.
              </p>
            </div>
          </div>
        </div>
        
        {showCreateOrg ? (
          <CreateOrganization onCreated={handleOrgCreated} />
        ) : (
          <div className="text-center py-16 rounded-2xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20' }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#39444D10' }}>
              <Building2 size={36} style={{ color: '#39444D' }} />
            </div>
            <h2 className="text-2xl font-bold text-[#07111D] mb-3 font-display">Create Your Organization</h2>
            <p className="text-[#5D5D5D] mb-8 max-w-md mx-auto font-grotesk">
              Set up your workspace to start managing projects, recording meetings, and collaborating with your team.
            </p>
            <button
              onClick={() => setShowCreateOrg(true)}
              className="px-8 py-3.5 rounded-xl text-white font-semibold transition-all hover:scale-105 font-grotesk"
              style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)', boxShadow: '0 10px 30px rgba(219, 153, 65, 0.3)' }}
            >
              Create Organization
            </button>
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#DB9941' }}></div>
          <p className="text-[#5D5D5D] font-grotesk">Loading projects...</p>
        </div>
      </div>
    );
  }

  // Main Projects View
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#07111D] font-display">
            {organization?.name || 'Projects'}
          </h1>
          <p className="text-[#5D5D5D] mt-1 font-grotesk">
            {projects.length} project{projects.length !== 1 ? 's' : ''} • {tasks.length} task{tasks.length !== 1 ? 's' : ''} • {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Team Members Quick View */}
          <div className="flex -space-x-2">
            {teamMembers.slice(0, 5).map((member, i) => (
              <div key={member.user_id} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: member.user_id === user.id ? '#DB9941' : '#39444D', zIndex: 5 - i }}
                title={member.name}>
                {member.name?.charAt(0) || '?'}
              </div>
            ))}
            {teamMembers.length > 5 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-500 flex items-center justify-center text-xs font-bold text-white">
                +{teamMembers.length - 5}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowNewProject(true)}
            className="inline-flex items-center px-5 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 font-grotesk"
            style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)', boxShadow: '0 10px 30px rgba(219, 153, 65, 0.3)' }}
          >
            <Plus size={18} className="mr-2" />
            New Project
          </button>
        </div>
      </div>

      {/* Project Tabs */}
      {projects.length > 0 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className="px-5 py-2.5 rounded-xl whitespace-nowrap transition-all text-sm font-medium font-grotesk"
              style={{
                backgroundColor: selectedProject?.id === project.id ? '#07111D' : '#FFFFFF',
                color: selectedProject?.id === project.id ? '#E5E5DF' : '#07111D',
                border: selectedProject?.id === project.id ? '2px solid #07111D' : '2px solid #39444D20',
                boxShadow: selectedProject?.id === project.id ? '0 4px 15px rgba(7, 17, 29, 0.2)' : 'none',
              }}
            >
              {project.name}
            </button>
          ))}
        </div>
      )}

      {/* No Projects State */}
      {projects.length === 0 && (
        <div className="text-center py-16 rounded-2xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20' }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#39444D10' }}>
            <FolderKanban size={36} style={{ color: '#39444D' }} />
          </div>
          <h3 className="text-xl font-bold text-[#07111D] mb-3 font-display">No projects yet</h3>
          <p className="text-[#5D5D5D] mb-6 font-grotesk">Create your first project to get started</p>
          <button
            onClick={() => setShowNewProject(true)}
            className="px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 font-grotesk"
            style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}
          >
            <Plus size={18} className="inline mr-2" />
            Create Project
          </button>
        </div>
      )}

      {/* Kanban Board */}
      {selectedProject && projects.length > 0 && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #39444D20', boxShadow: '0 4px 20px rgba(7, 17, 29, 0.05)' }}>
          
          {/* Project Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#07111D] font-display">{selectedProject.name}</h2>
              {selectedProject.description && (
                <p className="text-[#5D5D5D] mt-2 font-grotesk">{selectedProject.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-4 py-1.5 rounded-full text-xs font-semibold font-grotesk" 
                style={{ backgroundColor: '#10B98120', color: '#10B981', border: '1px solid #10B98130' }}>
                {selectedProject.status}
              </span>
              <button
                onClick={() => setShowNewTask(true)}
                className="inline-flex items-center px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:scale-105 font-grotesk"
                style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}
              >
                <Plus size={16} className="mr-1.5" />
                Add Task
              </button>
            </div>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {STATUSES.map(status => (
              <div key={status.id} className="rounded-xl p-4" style={{ backgroundColor: '#E5E5DF' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <h3 className="font-semibold text-sm text-[#07111D] font-grotesk">{status.label}</h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full font-mono" 
                    style={{ backgroundColor: status.bg, color: status.color }}>
                    {getTasksByStatus(status.id).length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[200px]">
                  {getTasksByStatus(status.id).map(task => {
                    const priorityStyle = getPriorityStyle(task.priority);
                    const assigneeName = getAssigneeName(task.assignee_id);
                    
                    return (
                      <div
                        key={task.id}
                        className="rounded-xl p-4 transition-all hover:shadow-md cursor-pointer"
                        style={{ 
                          backgroundColor: '#FFFFFF',
                          border: `1px solid #39444D10`,
                          boxShadow: '0 2px 10px rgba(7, 17, 29, 0.03)'
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm text-[#07111D] font-grotesk">{task.title}</h4>
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                            className="text-xs rounded-lg px-2 py-1 border-0 cursor-pointer font-grotesk"
                            style={{ backgroundColor: '#E5E5DF', color: '#39444D' }}
                          >
                            {STATUSES.map(s => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                        
                        {task.description && (
                          <p className="text-xs text-[#5D5D5D] mb-3 line-clamp-2 font-grotesk">{task.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold font-grotesk"
                            style={{ 
                              backgroundColor: priorityStyle.bg, 
                              color: priorityStyle.color,
                              border: `1px solid ${priorityStyle.border}`
                            }}>
                            {task.priority}
                          </span>

                          {/* Assignee Selector */}
                          <select
                            value={task.assignee_id || ''}
                            onChange={(e) => updateTaskAssignee(task.id, e.target.value || null)}
                            className="text-xs rounded-lg px-2 py-1 border-0 cursor-pointer font-grotesk"
                            style={{ backgroundColor: '#E5E5DF', color: '#39444D', maxWidth: '120px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map(member => (
                              <option key={member.user_id} value={member.user_id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                          
                          {task.due_date && (
                            <span className="text-xs text-[#5D5D5D] font-mono flex items-center">
                              <Clock size={12} className="mr-1" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Assignee Badge */}
                        {assigneeName && (
                          <div className="mt-2 pt-2 border-t border-[#39444D10] flex items-center space-x-2">
                            <Users size={12} className="text-[#5D5D5D]" />
                            <span className="text-xs text-[#5D5D5D] font-grotesk">{assigneeName}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {getTasksByStatus(status.id).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-xs text-[#5D5D5D] font-grotesk">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewProject(false)}>
          <div className="rounded-2xl p-8 w-full max-w-md" style={{ backgroundColor: '#FFFFFF' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-[#07111D] mb-6 font-display">Create New Project</h2>
            <form onSubmit={createProject} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Project Name *</label>
                <input type="text" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] transition-all font-grotesk"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#07111D' }}
                  placeholder="Enter project name" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Description</label>
                <textarea value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] transition-all font-grotesk resize-none"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#07111D' }}
                  rows="3" placeholder="Project description (optional)" />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="submit" className="flex-1 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 font-grotesk"
                  style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>Create Project</button>
                <button type="button" onClick={() => setShowNewProject(false)}
                  className="px-6 py-3 rounded-xl font-semibold transition-all font-grotesk"
                  style={{ backgroundColor: '#E5E5DF', color: '#39444D' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewTask(false)}>
          <div className="rounded-2xl p-8 w-full max-w-md" style={{ backgroundColor: '#FFFFFF' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-[#07111D] mb-6 font-display">Create New Task</h2>
            <form onSubmit={createTask} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Task Title *</label>
                <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] transition-all font-grotesk"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#07111D' }}
                  placeholder="Enter task title" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Description</label>
                <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] transition-all font-grotesk resize-none"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#07111D' }}
                  rows="2" placeholder="Task description (optional)" />
              </div>
              
              {/* Assignee Selection */}
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Assign To</label>
                <select value={newTask.assignee_id} onChange={(e) => setNewTask({ ...newTask, assignee_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] transition-all font-grotesk"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#07111D' }}>
                  <option value="">Unassigned</option>
                  {teamMembers.map(member => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Priority</label>
                <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] transition-all font-grotesk"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#07111D' }}>
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="submit" className="flex-1 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 font-grotesk"
                  style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>Create Task</button>
                <button type="button" onClick={() => setShowNewTask(false)}
                  className="px-6 py-3 rounded-xl font-semibold transition-all font-grotesk"
                  style={{ backgroundColor: '#E5E5DF', color: '#39444D' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}