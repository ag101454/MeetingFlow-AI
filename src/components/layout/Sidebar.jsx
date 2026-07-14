import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, Video, MessageSquare,
  Users, Settings, ChevronLeft, ChevronRight, Bot,
  Bell, FileText, BarChart3, Plus, Star, MoreHorizontal,
  X, Zap, HelpCircle, BookOpen, Heart, Globe
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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (organization) {
      loadSidebarData();
      const cleanup = subscribeToUpdates();
      return cleanup;
    }
  }, [organization?.id]);

  // Close sidebar on mobile when clicking a link
  const handleNavClick = (path) => {
    navigate(path);
    if (isMobile) toggleSidebar();
  };

  // Close on escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isMobile && sidebarOpen) toggleSidebar();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isMobile, sidebarOpen]);

  const loadSidebarData = async () => {
    if (!organization?.id) return;
    try {
      const { data: projects } = await supabase.from('projects').select('id, name, status').eq('organization_id', organization.id).order('updated_at', { ascending: false }).limit(5);
      if (projects) setRecentProjects(projects);
      if (projects?.length > 0) {
        const { count: tasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).in('project_id', projects.map(p => p.id)).neq('status', 'completed');
        setTaskCount(tasks || 0);
      }
      const { count: meetings } = await supabase.from('meetings').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('status', 'scheduled').gte('start_time', new Date().toISOString());
      setMeetingCount(meetings || 0);
      if (user) {
        const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).neq('user_id', user.id).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
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
    const channel = supabase.channel(`sidebar-${organization.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadSidebarData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => setUnreadMessages(prev => prev + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const toggleStar = (item, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const updated = starredItems.some(s => s.path === item.path)
      ? starredItems.filter(s => s.path !== item.path)
      : [...starredItems, item];
    setStarredItems(updated);
    localStorage.setItem('starredItems', JSON.stringify(updated));
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
    const colors = { active: '#10B981', completed: '#39444D', on_hold: '#DB9941', archived: '#AE2C11' };
    return colors[status] || '#5D5D5D';
  };

  return (
    <>
      {/* Mobile overlay - closes sidebar when clicking outside */}
      {sidebarOpen && isMobile && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300',
        'bg-[#07111D] border-r border-[#39444D]/20',
        // Mobile: full width overlay
        isMobile ? (sidebarOpen ? 'w-[280px] translate-x-0' : 'w-[280px] -translate-x-full') :
        // Desktop: normal sidebar
        sidebarOpen ? 'w-64' : 'w-20'
      )}>
        {/* Logo & Close */}
        <div className="flex items-center justify-between p-4 h-14 sm:h-16 border-b border-[#39444D]/20">
          {sidebarOpen || isMobile ? (
            <Link to="/app" className="flex items-center space-x-3" onClick={() => isMobile && toggleSidebar()}>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base sm:text-lg text-[#E5E5DF] font-display leading-tight">MeetingFlow</h1>
                <p className="text-[10px] text-[#5D5D5D] leading-tight">AI</p>
              </div>
            </Link>
          ) : (
            <Link to="/app" className="w-full flex justify-center">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
            </Link>
          )}
          
          {/* Close button on mobile */}
          {isMobile && sidebarOpen && (
            <button onClick={toggleSidebar} className="p-1.5 rounded-lg text-[#5D5D5D] hover:bg-[#39444D]/30 lg:hidden">
              <X size={18} />
            </button>
          )}
          
          {/* Desktop collapse */}
          {!isMobile && (
            <button onClick={toggleSidebar} className="p-1.5 rounded-lg text-[#5D5D5D] hover:bg-[#39444D]/30 transition-colors hidden lg:block">
              {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          )}
        </div>

        {/* Organization */}
        {(sidebarOpen || isMobile) && organization && (
          <div className="p-3 border-b border-[#39444D]/20">
            <button onClick={() => setShowOrgMenu(!showOrgMenu)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#39444D]/20 transition-colors">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#DB9941]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold text-[#DB9941]">{organization.name?.charAt(0)?.toUpperCase() || 'O'}</span>
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-[#E5E5DF] truncate">{organization.name}</p>
                  <p className="text-[10px] sm:text-xs text-[#5D5D5D] capitalize">{role?.replace('_', ' ') || 'Member'}</p>
                </div>
              </div>
              <ChevronLeft size={14} className={cn('text-[#5D5D5D] transition-transform flex-shrink-0', showOrgMenu && '-rotate-90')} />
            </button>
            {showOrgMenu && (
              <div className="mt-2 p-2 sm:p-3 rounded-lg bg-[#39444D]/20 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between text-[10px] sm:text-xs"><span className="text-[#5D5D5D]">Projects</span><span className="font-medium text-[#E5E5DF]">{recentProjects.length}</span></div>
                <div className="flex justify-between text-[10px] sm:text-xs"><span className="text-[#5D5D5D]">Tasks</span><span className="font-medium text-[#E5E5DF]">{taskCount}</span></div>
                <div className="flex justify-between text-[10px] sm:text-xs"><span className="text-[#5D5D5D]">Meetings</span><span className="font-medium text-[#E5E5DF]">{meetingCount}</span></div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 sm:py-3 space-y-4 sm:space-y-6">
          {/* Main Menu */}
          <div className="space-y-0.5">
            {(sidebarOpen || isMobile) && (
              <h3 className="px-3 text-[10px] sm:text-xs font-semibold text-[#5D5D5D] uppercase tracking-wider mb-1 sm:mb-2">Main Menu</h3>
            )}
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button key={item.path} onClick={() => handleNavClick(item.path)}
                  className={cn('relative flex items-center w-full px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-200 group',
                    isActive ? 'bg-[#DB9941]/15 text-[#DB9941] font-medium' : 'text-[#E5E5DF] hover:bg-[#39444D]/30'
                  )}>
                  <div className="relative">
                    <item.icon size={18} className="flex-shrink-0" />
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#AE2C11] text-white text-[9px] sm:text-[10px] rounded-full flex items-center justify-center font-bold">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  {(sidebarOpen || isMobile) && (
                    <span className="ml-3 text-xs sm:text-sm flex-1 text-left">{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary Menu */}
          <div className="space-y-0.5">
            {(sidebarOpen || isMobile) && (
              <h3 className="px-3 text-[10px] sm:text-xs font-semibold text-[#5D5D5D] uppercase tracking-wider mb-1 sm:mb-2">More</h3>
            )}
            {secondaryItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button key={item.path} onClick={() => handleNavClick(item.path)}
                  className={cn('relative flex items-center w-full px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-200 group',
                    isActive ? 'bg-[#DB9941]/15 text-[#DB9941] font-medium' : 'text-[#E5E5DF] hover:bg-[#39444D]/30'
                  )}>
                  <item.icon size={18} className="flex-shrink-0" />
                  {(sidebarOpen || isMobile) && (
                    <span className="ml-3 text-xs sm:text-sm">{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Footer */}
        <div className="p-2 sm:p-3 border-t border-[#39444D]/20">
          <Link to="/app/settings" onClick={() => isMobile && toggleSidebar()}
            className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-lg hover:bg-[#39444D]/30 transition-colors">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {getInitials(user?.user_metadata?.full_name || 'User')}
            </div>
            {(sidebarOpen || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-[#E5E5DF] truncate">{user?.user_metadata?.full_name || 'User'}</p>
                <p className="text-[10px] sm:text-xs text-[#5D5D5D] truncate">{user?.email}</p>
              </div>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}