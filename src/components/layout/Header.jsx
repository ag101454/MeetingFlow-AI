import { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Search, 
  Moon, 
  Sun, 
  Menu,
  ChevronDown,
  Settings,
  LogOut,
  HelpCircle,
  Command,
  X,
  Calendar,
  MessageSquare,
  FileText,
  Users,
  Zap
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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          toast(payload.new.title || 'New notification', {
            icon: '🔔',
            duration: 4000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const [projectResults, taskResults, meetingResults] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, status')
          .eq('organization_id', organization?.id)
          .ilike('name', `%${query}%`)
          .limit(5),
        supabase
          .from('tasks')
          .select('id, title, status, priority')
          .ilike('title', `%${query}%`)
          .limit(5),
        supabase
          .from('meetings')
          .select('id, title, status')
          .eq('organization_id', organization?.id)
          .ilike('title', `%${query}%`)
          .limit(5),
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
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
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
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left Section */}
          <div className="flex items-center flex-1">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-[#E5E5DF] hover:bg-[#39444D]/30 transition-colors lg:hidden"
            >
              <Menu size={20} />
            </button>

            <Link to="/app" className="hidden sm:flex items-center space-x-2 ml-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <span className="text-lg font-bold text-[#E5E5DF] font-display">
                Meeting<span className="text-[#DB9941]">Flow</span>
              </span>
            </Link>

            <div className="hidden sm:flex items-center flex-1 max-w-lg ml-6" ref={searchRef}>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5D5D5D]" size={18} />
                <input
                  type="text"
                  placeholder="Search... (Ctrl+K)"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  className="w-full pl-10 pr-14 py-2 bg-[#39444D]/30 border border-[#39444D] rounded-lg text-sm text-[#E5E5DF] placeholder-[#5D5D5D] focus:outline-none focus:border-[#DB9941] font-grotesk"
                />
                <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-0.5 text-xs text-[#5D5D5D] bg-[#39444D]/50 border border-[#39444D] rounded font-mono">
                  ⌘K
                </kbd>
              </div>

              {showSearch && searchQuery.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#07111D] border border-[#39444D] rounded-xl shadow-xl max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-[#5D5D5D]">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#DB9941] mx-auto mb-2"></div>
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            navigate(result.link);
                            setShowSearch(false);
                            setSearchQuery('');
                          }}
                          className="w-full px-4 py-3 hover:bg-[#39444D]/30 flex items-center space-x-3 text-left text-[#E5E5DF]"
                        >
                          <span className="text-xl">{result.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{result.name || result.title}</p>
                            <p className="text-xs text-[#5D5D5D] capitalize">{result.type}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-[#5D5D5D]">
                      No results found
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSearch(true)}
              className="sm:hidden ml-auto p-2 rounded-lg text-[#E5E5DF]"
            >
              <Search size={20} />
            </button>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg text-[#E5E5DF] hover:bg-[#39444D]/30 transition-colors"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <button className="p-2 rounded-lg text-[#E5E5DF] hover:bg-[#39444D]/30 transition-colors hidden md:block">
              <HelpCircle size={18} />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                className="relative p-2 rounded-lg text-[#E5E5DF] hover:bg-[#39444D]/30 transition-colors"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#AE2C11] text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-[#07111D] border border-[#39444D] rounded-xl shadow-xl">
                  <div className="p-4 border-b border-[#39444D]/30">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-[#E5E5DF]">Notifications</h3>
                      <div className="flex items-center space-x-2">
                        {unreadCount > 0 && (
                          <button onClick={markAllAsRead} className="text-xs text-[#DB9941] font-medium">
                            Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button onClick={clearAllNotifications} className="text-xs text-[#5D5D5D]">
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#DB9941] mx-auto"></div>
                        <p className="text-sm text-[#5D5D5D] mt-2">Loading...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell size={32} className="mx-auto mb-2 text-[#5D5D5D] opacity-30" />
                        <p className="text-sm text-[#5D5D5D]">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#39444D]/30">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 hover:bg-[#39444D]/30 transition-colors cursor-pointer group ${!notification.read ? 'bg-[#DB9941]/10' : ''}`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="p-2 rounded-lg bg-[#39444D]/30">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <p className={`text-sm ${!notification.read ? 'font-semibold text-[#E5E5DF]' : 'text-[#E5E5DF]'}`}>
                                    {notification.title}
                                  </p>
                                  <button
                                    onClick={(e) => deleteNotification(notification.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#39444D]/50 rounded"
                                  >
                                    <X size={14} className="text-[#5D5D5D]" />
                                  </button>
                                </div>
                                <p className="text-xs text-[#5D5D5D] mt-1 line-clamp-2">{notification.message}</p>
                                <span className="text-xs text-[#39444D] mt-2 block">
                                  {formatRelativeTime(notification.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-[#39444D]/30">
                      <Link
                        to="/app/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="block text-center text-sm text-[#DB9941] font-medium"
                      >
                        View all notifications
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center space-x-2 p-1.5 rounded-lg text-[#E5E5DF] hover:bg-[#39444D]/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center text-white text-sm font-bold">
                  {getInitials(user?.user_metadata?.full_name || 'User')}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium leading-tight max-w-[120px] truncate">
                    {user?.user_metadata?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-[#5D5D5D] leading-tight max-w-[120px] truncate">
                    {organization?.name || 'Organization'}
                  </p>
                </div>
                <ChevronDown size={16} className="hidden md:block text-[#5D5D5D]" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-[#07111D] border border-[#39444D] rounded-xl shadow-xl">
                  <div className="p-4 border-b border-[#39444D]/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center text-white text-lg font-bold">
                        {getInitials(user?.user_metadata?.full_name || 'User')}
                      </div>
                      <div>
                        <p className="font-semibold text-[#E5E5DF]">{user?.user_metadata?.full_name || 'User'}</p>
                        <p className="text-sm text-[#5D5D5D]">{user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-[#DB9941]/20 text-[#DB9941] text-xs rounded-full capitalize">
                          {useAuthStore.getState().role || 'Member'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <button
                      onClick={() => { navigate('/app/settings'); setShowProfileMenu(false); }}
                      className="w-full px-4 py-2.5 text-sm text-[#E5E5DF] hover:bg-[#39444D]/30 flex items-center space-x-3"
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={() => { navigate('/app/ai-assistant'); setShowProfileMenu(false); }}
                      className="w-full px-4 py-2.5 text-sm text-[#E5E5DF] hover:bg-[#39444D]/30 flex items-center space-x-3"
                    >
                      <Command size={16} />
                      <span>AI Assistant</span>
                    </button>
                  </div>

                  <div className="border-t border-[#39444D]/30 py-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 text-sm text-[#AE2C11] hover:bg-[#AE2C11]/10 flex items-center space-x-3"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>

                  <div className="px-4 py-3 border-t border-[#39444D]/30">
                    <p className="text-xs text-[#5D5D5D] text-center font-mono">MeetingFlow AI v1.0.0</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-black/80 sm:hidden" onClick={() => setShowSearch(false)}>
          <div className="m-4 bg-[#07111D] rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex items-center space-x-3">
                <Search size={20} className="text-[#5D5D5D]" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[#E5E5DF] focus:outline-none text-lg"
                  autoFocus
                />
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1">
                  <X size={20} className="text-[#5D5D5D]" />
                </button>
              </div>
            </div>
            {searchResults.length > 0 && (
              <div className="border-t border-[#39444D]/30 max-h-96 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      navigate(result.link);
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className="w-full px-4 py-3 hover:bg-[#39444D]/30 flex items-center space-x-3 text-[#E5E5DF]"
                  >
                    <span className="text-xl">{result.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{result.name || result.title}</p>
                      <p className="text-xs text-[#5D5D5D] capitalize">{result.type}</p>
                    </div>
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