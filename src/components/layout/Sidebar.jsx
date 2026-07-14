import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Video,
  MessageSquare,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bot,
  Bell,
  FileText,
  BarChart3,
  Plus,
  Star,
  MoreHorizontal,
  X,
  Zap,
  HelpCircle,
  BookOpen,
  Heart,
  Globe
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { cn, getInitials } from '../../lib/utils';
import { toast } from 'react-hot-toast';

export default function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const location = useLocation();
  const navigate = useNavigate();
  
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);
  const role = useAuthStore((state) => state.role);

  const [recentProjects, setRecentProjects] = useState([]);
  const [starredItems, setStarredItems] = useState([]);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [meetingCount, setMeetingCount] = useState(0);

  const quickCreateRef = useRef(null);

  useEffect(() => {
    if (organization) {
      loadSidebarData();
      const cleanup = subscribeToUpdates();
      return cleanup;
    }
  }, [organization?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (quickCreateRef.current && !quickCreateRef.current.contains(event.target)) {
        setShowQuickCreate(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyboard = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, []);

  const loadSidebarData = async () => {
    if (!organization?.id) return;

    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('organization_id', organization.id)
        .order('updated_at', { ascending: false })
        .limit(5);
      if (projects) setRecentProjects(projects);

      if (projects?.length > 0) {
        const { count: tasks } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projects.map(p => p.id))
          .neq('status', 'completed');
        setTaskCount(tasks || 0);
      }

      const { count: meetings } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('status', 'scheduled')
        .gte('start_time', new Date().toISOString());
      setMeetingCount(meetings || 0);

      if (user) {
        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .neq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        setUnreadMessages(msgCount || 0);
      }

      const starred = JSON.parse(localStorage.getItem('starredItems') || '[]');
      setStarredItems(starred);
    } catch (error) {
      console.error('Error loading sidebar data:', error);
    }
  };

  const subscribeToUpdates = () => {
    if (!organization?.id) return;

    const channel = supabase
      .channel(`sidebar-${organization.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadSidebarData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        setUnreadMessages(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleStar = (item, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const updated = starredItems.some(s => s.path === item.path)
      ? starredItems.filter(s => s.path !== item.path)
      : [...starredItems, item];
    
    setStarredItems(updated);
    localStorage.setItem('starredItems', JSON.stringify(updated));
    toast.success(
      starredItems.some(s => s.path === item.path) ? 'Removed from favorites' : 'Added to favorites'
    );
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/app', shortcut: 'D' },
    { icon: FolderKanban, label: 'Projects', path: '/app/projects', shortcut: 'P', badge: taskCount },
    { icon: Video, label: 'Meetings', path: '/app/meetings', shortcut: 'M', badge: meetingCount },
    { icon: MessageSquare, label: 'Chat', path: '/app/chat', shortcut: 'C', badge: unreadMessages },
    { icon: Bot, label: 'AI Assistant', path: '/app/ai-assistant', shortcut: 'A', isNew: true },
  ];

  const secondaryItems = [
    { icon: Users, label: 'Client Portal', path: '/app/client-portal' },
    { icon: Bell, label: 'Notifications', path: '/app/notifications' },
    { icon: FileText, label: 'Reports', path: '/app/reports' },
    { icon: BarChart3, label: 'Analytics', path: '/app/analytics' },
    { icon: Settings, label: 'Settings', path: '/app/settings' },
  ];

  const getStatusColor = (status) => {
    const colors = {
      active: '#DB9941',
      completed: '#39444D',
      on_hold: '#5D5D5D',
      archived: '#AE2C11',
    };
    return colors[status] || '#5D5D5D';
  };

  const quickActions = [
    { icon: Plus, label: 'New Project', action: () => { navigate('/app/projects'); setShowQuickCreate(false); }},
    { icon: Video, label: 'Start Meeting', action: () => { navigate('/app/meetings'); setShowQuickCreate(false); }},
    { icon: MessageSquare, label: 'New Message', action: () => { navigate('/app/chat'); setShowQuickCreate(false); }},
    { icon: FileText, label: 'Generate Report', action: () => { navigate('/app/reports'); setShowQuickCreate(false); }},
  ];

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} />
      )}

      <aside className={cn(
        'fixed left-0 top-0 h-full bg-[#07111D] border-r border-[#39444D]/20 transition-all duration-300 z-50 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-20'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 h-16 border-b border-[#39444D]/20">
          {sidebarOpen ? (
            <Link to="/app" className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight text-[#E5E5DF] font-display">MeetingFlow</h1>
                <p className="text-xs leading-tight text-[#5D5D5D]">AI</p>
              </div>
            </Link>
          ) : (
            <Link to="/app" className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-[#5D5D5D] hover:bg-[#39444D]/30 transition-colors hidden lg:block"
            title={`${sidebarOpen ? 'Collapse' : 'Expand'} (Ctrl+B)`}
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Organization */}
        {sidebarOpen && organization && (
          <div className="p-3 border-b border-[#39444D]/20">
            <button
              onClick={() => setShowOrgMenu(!showOrgMenu)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#39444D]/20 transition-colors"
            >
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#DB9941]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-[#DB9941]">
                    {organization.name?.charAt(0)?.toUpperCase() || 'O'}
                  </span>
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-[#E5E5DF] truncate">{organization.name}</p>
                  <p className="text-xs text-[#5D5D5D] capitalize">{role?.replace('_', ' ') || 'Member'}</p>
                </div>
              </div>
              <ChevronLeft size={16} className={`text-[#5D5D5D] transition-transform ${showOrgMenu ? '-rotate-90' : ''}`} />
            </button>
            {showOrgMenu && (
              <div className="mt-2 p-3 rounded-lg bg-[#39444D]/20 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5D5D5D]">Projects</span>
                  <span className="font-medium text-[#E5E5DF]">{recentProjects.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#5D5D5D]">Tasks</span>
                  <span className="font-medium text-[#E5E5DF]">{taskCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#5D5D5D]">Meetings</span>
                  <span className="font-medium text-[#E5E5DF]">{meetingCount}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Create */}
        {sidebarOpen && (
          <div className="px-3 pt-3" ref={quickCreateRef}>
            <button
              onClick={() => setShowQuickCreate(!showQuickCreate)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#DB9941] to-[#AE2C11] text-white font-medium text-sm hover:scale-105 transition-transform"
            >
              <Plus size={18} />
              <span>Quick Create</span>
            </button>
            {showQuickCreate && (
              <div className="mt-2 p-2 rounded-lg border border-[#39444D] bg-[#07111D] shadow-lg">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#E5E5DF] hover:bg-[#39444D]/30 transition-colors text-sm"
                  >
                    <action.icon size={16} className="text-[#DB9941]" />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-6">
          {/* Main Menu */}
          <div className="space-y-1">
            {sidebarOpen && (
              <h3 className="px-3 text-xs font-semibold text-[#5D5D5D] uppercase tracking-wider mb-2">
                Main Menu
              </h3>
            )}
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isStarred = starredItems.some(s => s.path === item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    'relative flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group',
                    isActive ? 'bg-[#DB9941]/15 text-[#DB9941] font-medium' : 'text-[#E5E5DF] hover:bg-[#39444D]/30'
                  )}
                >
                  <div className="relative">
                    <item.icon size={20} className="flex-shrink-0" />
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#AE2C11] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  
                  {sidebarOpen && (
                    <>
                      <span className="ml-3 text-sm flex-1">{item.label}</span>
                      <div className="flex items-center space-x-1">
                        {item.isNew && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-[#DB9941]/20 text-[#DB9941] rounded font-bold">
                            NEW
                          </span>
                        )}
                        {item.shortcut && (
                          <kbd className="hidden group-hover:inline-block px-1.5 py-0.5 text-[10px] text-[#5D5D5D] bg-[#39444D]/50 rounded font-mono">
                            ⌘{item.shortcut}
                          </kbd>
                        )}
                        <button
                          onClick={(e) => toggleStar(item, e)}
                          className={`p-0.5 rounded transition-all ${isStarred ? 'text-[#DB9941] opacity-100' : 'opacity-0 group-hover:opacity-100 text-[#5D5D5D] hover:text-[#DB9941]'}`}
                        >
                          <Star size={14} fill={isStarred ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </>
                  )}

                  {!sidebarOpen && hoveredItem === item.path && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#39444D] text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
                      <div className="flex items-center space-x-2">
                        <span>{item.label}</span>
                        {item.shortcut && (
                          <kbd className="px-1.5 py-0.5 text-[10px] bg-[#07111D]/50 rounded">⌘{item.shortcut}</kbd>
                        )}
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Recent Projects */}
          {sidebarOpen && recentProjects.length > 0 && (
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-[#5D5D5D] uppercase tracking-wider mb-2">
                Recent Projects
              </h3>
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/app/projects/${project.id}`}
                  className="flex items-center px-3 py-2 rounded-lg text-sm text-[#E5E5DF] hover:bg-[#39444D]/30 transition-colors group"
                >
                  <div className="w-2 h-2 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: getStatusColor(project.status) }} />
                  <span className="flex-1 truncate">{project.name}</span>
                  <MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 text-[#5D5D5D] transition-opacity" />
                </Link>
              ))}
            </div>
          )}

          {/* Starred */}
          {sidebarOpen && starredItems.length > 0 && (
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-[#5D5D5D] uppercase tracking-wider mb-2">
                Favorites
              </h3>
              {starredItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center px-3 py-2 rounded-lg text-sm text-[#E5E5DF] hover:bg-[#39444D]/30 transition-colors group"
                >
                  <Star size={14} className="mr-3 text-[#DB9941] flex-shrink-0" fill="currentColor" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <button
                    onClick={(e) => toggleStar(item, e)}
                    className="opacity-0 group-hover:opacity-100 text-[#5D5D5D] hover:text-[#AE2C11] transition-all"
                  >
                    <X size={12} />
                  </button>
                </Link>
              ))}
            </div>
          )}

          {/* Secondary Menu */}
          <div className="space-y-1">
            {sidebarOpen && (
              <h3 className="px-3 text-xs font-semibold text-[#5D5D5D] uppercase tracking-wider mb-2">
                More
              </h3>
            )}
            {secondaryItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    'relative flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group',
                    isActive ? 'bg-[#DB9941]/15 text-[#DB9941] font-medium' : 'text-[#E5E5DF] hover:bg-[#39444D]/30'
                  )}
                >
                  <item.icon size={20} />
                  {sidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
                  {!sidebarOpen && hoveredItem === item.path && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#39444D] text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-[#39444D]/20">
          {sidebarOpen ? (
            <Link
              to="/app/settings"
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[#39444D]/30 transition-colors group"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {getInitials(user?.user_metadata?.full_name || 'User')}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#07111D]"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#E5E5DF] truncate">
                  {user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-[#5D5D5D] truncate">{user?.email}</p>
              </div>
              <Settings size={16} className="text-[#5D5D5D] opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ) : (
            <div className="flex justify-center">
              <Link
                to="/app/settings"
                className="relative group"
                onMouseEnter={() => setHoveredItem('profile')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {getInitials(user?.user_metadata?.full_name || 'User')}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#07111D]"></div>
                {hoveredItem === 'profile' && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#39444D] text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
                    {user?.user_metadata?.full_name || 'User'}<br />
                    <span className="text-[#5D5D5D] text-[10px]">{user?.email}</span>
                  </div>
                )}
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        {sidebarOpen && (
          <div className="px-3 py-2 border-t border-[#39444D]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <a href="#" className="p-1.5 rounded-lg text-[#5D5D5D] hover:bg-[#39444D]/30 transition-colors" title="Help">
                  <HelpCircle size={14} />
                </a>
                <a href="#" className="p-1.5 rounded-lg text-[#5D5D5D] hover:bg-[#39444D]/30 transition-colors" title="Documentation">
                  <BookOpen size={14} />
                </a>
                <a href="#" className="p-1.5 rounded-lg text-[#5D5D5D] hover:bg-[#39444D]/30 transition-colors" title="Website">
                  <Globe size={14} />
                </a>
              </div>
              <div className="flex items-center space-x-1">
                <Heart size={12} className="text-[#AE2C11]" />
                <span className="text-[10px] text-[#5D5D5D] font-mono">v1.0.0</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}