import { useState, useEffect, useRef } from 'react';
import { 
  Bell, Search, Moon, Sun, Menu, ChevronDown,
  Settings, LogOut, HelpCircle, X, Calendar,
  MessageSquare, FileText, Users, Zap
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { cn, formatRelativeTime, getInitials } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  
  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);
  const signOut = useAuthStore((state) => state.signOut);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (user) {
      loadNotifications();
      const cleanup = subscribeToNotifications();
      return cleanup;
    }
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyboard = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileMenu(false);
        setShowSearch(false);
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, []);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      if (data) setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`header-notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        toast(payload.new.title || 'New notification', { icon: '🔔', duration: 4000 });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const [projectResults, taskResults, meetingResults] = await Promise.all([
        supabase.from('projects').select('id, name, status').eq('organization_id', organization?.id).ilike('name', `%${query}%`).limit(5),
        supabase.from('tasks').select('id, title, status, priority').ilike('title', `%${query}%`).limit(5),
        supabase.from('meetings').select('id, title, status').eq('organization_id', organization?.id).ilike('title', `%${query}%`).limit(5),
      ]);
      const results = [
        ...(projectResults.data || []).map(p => ({ ...p, type: 'project', icon: '📁', link: '/app/projects' })),
        ...(taskResults.data || []).map(t => ({ ...t, type: 'task', icon: '✅', link: '/app/projects' })),
        ...(meetingResults.data || []).map(m => ({ ...m, type: 'meeting', icon: '📹', link: '/app/meetings' })),
      ];
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) { console.error('Error marking as read:', error); }
  };

  const markAllAsRead = async () => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) { console.error('Error marking all as read:', error); }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await supabase.from('notifications').delete().eq('id', id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) { console.error('Error deleting notification:', error); }
  };

  const clearAllNotifications = async () => {
    try {
      await supabase.from('notifications').delete().eq('user_id', user.id);
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (error) { console.error('Error clearing notifications:', error); }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast.success('Signed out successfully');
    } catch (error) { toast.error('Failed to sign out'); }
  };

  const getNotificationIcon = (type) => {
    const iconStyle = { color: '#DB9941' };
    switch (type) {
      case 'task_assigned': return <FileText size={16} style={iconStyle} />;
      case 'meeting_reminder': return <Calendar size={16} style={{ color: '#AE2C11' }} />;
      case 'project_update': return <Bell size={16} style={{ color: '#39444D' }} />;
      case 'mention': return <MessageSquare size={16} style={iconStyle} />;
      case 'feedback': return <Users size={16} style={{ color: '#5D5D5D' }} />;
      default: return <Bell size={16} style={{ color: '#39444D' }} />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#07111D] border-b border-[#39444D]/20">
      <div className="px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* LEFT SECTION */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Mobile menu button */}
            <button onClick={toggleSidebar}
              className="p-2 rounded-lg text-[#E5E5DF] hover:bg-[#39444D]/30 transition-colors lg:hidden mr-1 flex-shrink-0">
              <Menu size={20} />
            </button>

            {/* Logo */}
            <Link to="/app" className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center">
                <Zap size={14} className="text-white" />
              </div>
              <span className="text-base sm:text-lg font-bold text-[#E5E5DF] font-display hidden xs:inline">
                Meeting<span className="text-[#DB9941]">Flow</span>
              </span>
            </Link>

            {/* Desktop Search */}
            <div className="hidden md:flex items-center flex-1 max-w-lg ml-4 lg:ml-6" ref={searchRef}>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5D5D5D]" size={16} />
                <input type="text" placeholder="Search... (Ctrl+K)" value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)} onFocus={() => setShowSearch(true)}
                  className="w-full pl-9 pr-12 py-2 bg-[#39444D]/30 border border-[#39444D] rounded-lg text-sm text-[#E5E5DF] placeholder-[#5D5D5D] focus:outline-none focus:border-[#DB9941] font-grotesk" />
                <kbd className="absolute right-2 top-1/2 transform -translate-y-1/2 px-1.5 py-0.5 text-[10px] text-[#5D5D5D] bg-[#39444D]/50 border border-[#39444D] rounded font-mono hidden lg:block">⌘K</kbd>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {/* Mobile search button */}
            <button onClick={() => setShowSearch(true)}
              className="md:hidden p-2 rounded-lg text-[#E5E5DF]">
              <Search size={18} />
            </button>

            {/* Theme toggle */}
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg text-[#E5E5DF] hover:bg-[#39444D]/30 transition-colors hidden xs:block">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
                className="relative p-2 rounded-lg text-[#E5E5DF] hover:bg-[#39444D]/30 transition-colors">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#AE2C11] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-40px)] max-w-[380px] sm:w-96 bg-[#07111D] border border-[#39444D] rounded-xl shadow-xl z-50"
                  style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
                  <div className="p-3 sm:p-4 border-b border-[#39444D]/30">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-[#E5E5DF] text-sm sm:text-base">Notifications</h3>
                      <div className="flex items-center space-x-2">
                        {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-[#DB9941] font-medium">Mark all read</button>}
                        {notifications.length > 0 && <button onClick={clearAllNotifications} className="text-xs text-[#5D5D5D]">Clear all</button>}
                      </div>
                    </div>
                  </div>
                  <div className="max-h-64 sm:max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="p-6 text-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#DB9941] mx-auto"></div></div>
                    ) : notifications.length === 0 ? (
                      <div className="p-6 text-center"><Bell size={24} className="mx-auto mb-2 text-[#5D5D5D] opacity-30" /><p className="text-xs text-[#5D5D5D]">No notifications</p></div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-3 sm:p-4 hover:bg-[#39444D]/30 cursor-pointer group ${!n.read ? 'bg-[#DB9941]/10' : ''}`} onClick={() => markAsRead(n.id)}>
                          <div className="flex items-start space-x-2 sm:space-x-3">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-[#39444D]/30 flex-shrink-0">{getNotificationIcon(n.type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <p className={`text-xs sm:text-sm ${!n.read ? 'font-semibold text-[#E5E5DF]' : 'text-[#E5E5DF]'}`}>{n.title}</p>
                                <button onClick={(e) => deleteNotification(n.id, e)} className="opacity-0 group-hover:opacity-100 p-1"><X size={12} className="text-[#5D5D5D]" /></button>
                              </div>
                              <p className="text-[10px] sm:text-xs text-[#5D5D5D] mt-0.5 line-clamp-2">{n.message}</p>
                              <span className="text-[10px] sm:text-xs text-[#39444D] mt-1 block">{formatRelativeTime(n.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                className="flex items-center space-x-1.5 p-1.5 rounded-lg text-[#E5E5DF] hover:bg-[#39444D]/30 transition-colors">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center text-white text-xs font-bold">
                  {getInitials(user?.user_metadata?.full_name || 'User')}
                </div>
                <ChevronDown size={14} className="hidden sm:block text-[#5D5D5D]" />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-[#07111D] border border-[#39444D] rounded-xl shadow-xl z-50">
                  <div className="p-3 sm:p-4 border-b border-[#39444D]/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center text-white font-bold">{getInitials(user?.user_metadata?.full_name || 'User')}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#E5E5DF] text-sm truncate">{user?.user_metadata?.full_name || 'User'}</p>
                        <p className="text-xs text-[#5D5D5D] truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { navigate('/app/settings'); setShowProfileMenu(false); }} className="w-full px-4 py-2.5 text-sm text-[#E5E5DF] hover:bg-[#39444D]/30 flex items-center space-x-3"><Settings size={16} /><span>Settings</span></button>
                  </div>
                  <div className="border-t border-[#39444D]/30 py-1">
                    <button onClick={handleSignOut} className="w-full px-4 py-2.5 text-sm text-[#AE2C11] hover:bg-[#AE2C11]/10 flex items-center space-x-3"><LogOut size={16} /><span>Sign Out</span></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-black/80 md:hidden" onClick={() => setShowSearch(false)}>
          <div className="m-3 bg-[#07111D] rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-3">
              <div className="flex items-center space-x-2">
                <Search size={18} className="text-[#5D5D5D]" />
                <input type="text" placeholder="Search..." value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[#E5E5DF] focus:outline-none text-base" autoFocus />
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1"><X size={18} className="text-[#5D5D5D]" /></button>
              </div>
            </div>
            {searchResults.length > 0 && (
              <div className="border-t border-[#39444D]/30 max-h-80 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button key={index} onClick={() => { navigate(result.link); setShowSearch(false); setSearchQuery(''); }}
                    className="w-full px-4 py-3 hover:bg-[#39444D]/30 flex items-center space-x-3 text-[#E5E5DF] text-left">
                    <span className="text-lg">{result.icon}</span>
                    <div><p className="text-sm font-medium">{result.name || result.title}</p><p className="text-xs text-[#5D5D5D] capitalize">{result.type}</p></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}