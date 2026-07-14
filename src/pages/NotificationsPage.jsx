import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { 
  Bell, Check, Trash2, Search,
  Calendar, MessageSquare, FileText, Users,
  Clock, X, CheckCheck,
  Inbox, Star, Video
} from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    
    // Create unique channel for notifications
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        if (payload.new.title) {
          toast(payload.new.title, { icon: '🔔', duration: 4000 });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      if (data) setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
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
      setSelectedNotifications([]);
      toast.success('All notifications marked as read');
    } catch (error) { toast.error('Failed to mark all as read'); }
  };

  const deleteNotification = async (id) => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setSelectedNotifications(prev => prev.filter(nId => nId !== id));
    } catch (error) { console.error('Error deleting notification:', error); }
  };

  const deleteSelected = async () => {
    try {
      await supabase.from('notifications').delete().in('id', selectedNotifications);
      setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)));
      setSelectedNotifications([]);
      toast.success(`${selectedNotifications.length} notifications deleted`);
    } catch (error) { toast.error('Failed to delete notifications'); }
  };

  const clearAll = async () => {
    if (!confirm('Delete all notifications?')) return;
    try {
      await supabase.from('notifications').delete().eq('user_id', user.id);
      setNotifications([]); setSelectedNotifications([]);
      toast.success('All notifications cleared');
    } catch (error) { toast.error('Failed to clear notifications'); }
  };

  const toggleSelect = (id) => {
    setSelectedNotifications(prev => prev.includes(id) ? prev.filter(nId => nId !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      task_assigned: { icon: FileText, color: '#DB9941', bg: '#DB994115' },
      meeting_reminder: { icon: Video, color: '#39444D', bg: '#39444D15' },
      project_update: { icon: Bell, color: '#10B981', bg: '#10B98115' },
      mention: { icon: MessageSquare, color: '#AE2C11', bg: '#AE2C1115' },
      feedback: { icon: Users, color: '#5D5D5D', bg: '#5D5D5D15' },
      general: { icon: Bell, color: '#39444D', bg: '#39444D15' },
    };
    return icons[type] || icons.general;
  };

  const getTypeLabel = (type) => {
    const labels = { task_assigned: 'Task', meeting_reminder: 'Meeting', project_update: 'Project', mention: 'Mention', feedback: 'Feedback', general: 'General' };
    return labels[type] || 'General';
  };

  const filters = [
    { value: 'all', label: 'All', icon: Inbox, count: notifications.length },
    { value: 'unread', label: 'Unread', icon: Star, count: notifications.filter(n => !n.read).length },
    { value: 'task_assigned', label: 'Tasks', icon: FileText, count: notifications.filter(n => n.type === 'task_assigned').length },
    { value: 'meeting_reminder', label: 'Meetings', icon: Video, count: notifications.filter(n => n.type === 'meeting_reminder').length },
    { value: 'project_update', label: 'Projects', icon: Bell, count: notifications.filter(n => n.type === 'project_update').length },
    { value: 'mention', label: 'Mentions', icon: MessageSquare, count: notifications.filter(n => n.type === 'mention').length },
    { value: 'feedback', label: 'Feedback', icon: Users, count: notifications.filter(n => n.type === 'feedback').length },
  ];

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter !== 'all' && filter !== 'unread') return n.type === filter;
    if (searchTerm) return (n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || n.message?.toLowerCase().includes(searchTerm.toLowerCase()));
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#DB9941' }}></div>
          <p className="text-[#5D5D5D] font-grotesk">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#07111D] font-display">Notifications</h1>
          <p className="text-[#5D5D5D] mt-1 font-grotesk">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</p>
        </div>
        <div className="flex items-center space-x-2">
          {selectedNotifications.length > 0 && (
            <button onClick={deleteSelected} className="px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all hover:scale-105 font-grotesk flex items-center" style={{ backgroundColor: '#AE2C11' }}>
              <Trash2 size={16} className="mr-2" />Delete ({selectedNotifications.length})
            </button>
          )}
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 font-grotesk flex items-center border" style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20', color: '#39444D' }}>
              <CheckCheck size={16} className="mr-2" />Mark All Read
            </button>
          )}
          <button onClick={clearAll} className="px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 font-grotesk flex items-center border" style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20', color: '#AE2C11' }}>
            <Trash2 size={16} className="mr-2" />Clear All
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-5 border" style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20' }}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5D5D5D]" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search notifications..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] transition-all font-grotesk text-sm"
              style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#07111D' }} />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#5D5D5D]"><X size={16} /></button>}
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all font-grotesk flex items-center space-x-2 ${filter === f.value ? 'text-white' : 'text-[#5D5D5D] hover:text-[#07111D] border'}`}
                style={{ backgroundColor: filter === f.value ? '#07111D' : '#FFFFFF', borderColor: filter === f.value ? '#07111D' : '#39444D20' }}>
                <f.icon size={14} /><span>{f.label}</span>
                {f.count > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: filter === f.value ? 'rgba(255,255,255,0.2)' : '#39444D10' }}>{f.count}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredNotifications.length > 0 && (
        <div className="flex items-center space-x-3 px-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0} onChange={selectAll}
              className="w-4 h-4 rounded border-[#39444D40] text-[#DB9941] focus:ring-[#DB9941]" />
            <span className="text-sm text-[#5D5D5D] font-grotesk">Select All ({filteredNotifications.length})</span>
          </label>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20' }}>
        {filteredNotifications.length === 0 ? (
          <div className="p-16 text-center">
            <Bell size={36} className="mx-auto mb-4" style={{ color: '#39444D' }} />
            <h3 className="text-xl font-bold text-[#07111D] mb-2 font-display">{searchTerm ? 'No matching notifications' : 'No notifications'}</h3>
            <p className="text-[#5D5D5D] font-grotesk">{searchTerm ? 'Try adjusting your search' : 'You\'re all caught up!'}</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#39444D10' }}>
            {filteredNotifications.map((notification) => {
              const iconData = getNotificationIcon(notification.type);
              const IconComponent = iconData.icon;
              return (
                <div key={notification.id} className={`p-5 transition-all group relative ${!notification.read ? 'bg-[#DB9941]/5' : 'hover:bg-[#E5E5DF]/30'}`}>
                  <div className="flex items-start space-x-4">
                    <input type="checkbox" checked={selectedNotifications.includes(notification.id)} onChange={() => toggleSelect(notification.id)}
                      className="w-4 h-4 rounded border-[#39444D40] text-[#DB9941] focus:ring-[#DB9941] mt-1" />
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconData.bg }}>
                      <IconComponent size={22} style={{ color: iconData.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className={`font-semibold font-grotesk ${!notification.read ? 'text-[#07111D]' : 'text-[#39444D]'}`}>{notification.title}</h4>
                            {!notification.read && <span className="w-2 h-2 rounded-full bg-[#DB9941] flex-shrink-0"></span>}
                          </div>
                          <p className="text-sm text-[#5D5D5D] leading-relaxed font-grotesk">{notification.message}</p>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-4">
                          {!notification.read && (
                            <button onClick={() => markAsRead(notification.id)} className="p-2 rounded-lg transition-all hover:scale-110" style={{ color: '#10B981' }}><Check size={16} /></button>
                          )}
                          <button onClick={() => deleteNotification(notification.id)} className="p-2 rounded-lg transition-all hover:scale-110" style={{ color: '#AE2C11' }}><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold font-grotesk" style={{ backgroundColor: iconData.bg, color: iconData.color }}>{getTypeLabel(notification.type)}</span>
                        <span className="flex items-center text-xs text-[#5D5D5D] font-mono"><Clock size={12} className="mr-1" />{formatRelativeTime(notification.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}