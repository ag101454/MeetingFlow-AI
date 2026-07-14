import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  Hash, Lock, Plus, Send, Paperclip, 
  MessageSquare, Search, X, Smile,
  AtSign, FileText, Users, Download,
  File, Image, Video, Music, Archive,
  ExternalLink, Trash2, Upload
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Chat() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', type: 'public' });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);

  useEffect(() => {
    if (organization) {
      loadChannels();
      ensureChannelMembership();
    }
  }, [organization]);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages(selectedChannel.id);
      subscribeToChannel(selectedChannel.id);
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const ensureChannelMembership = async () => {
    try {
      const { data: publicChannels } = await supabase
        .from('channels')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('type', 'public');
      if (!publicChannels) return;
      for (const channel of publicChannels) {
        const { data: membership } = await supabase
          .from('channel_members')
          .select('id')
          .eq('channel_id', channel.id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!membership) {
          await supabase.from('channel_members').insert({
            channel_id: channel.id, user_id: user.id
          });
        }
      }
    } catch (error) {
      console.error('Error ensuring membership:', error);
    }
  };

  const loadChannels = async () => {
    const { data: memberships } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', user.id);
    if (!memberships || memberships.length === 0) { setChannels([]); return; }
    const channelIds = memberships.map(m => m.channel_id);
    const { data } = await supabase
      .from('channels')
      .select('*')
      .in('id', channelIds)
      .order('created_at', { ascending: true });
    if (data) {
      setChannels(data);
      if (data.length > 0 && !selectedChannel) setSelectedChannel(data[0]);
    }
  };

  const loadMessages = async (channelId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setMessages(data);
  };

  const subscribeToChannel = (channelId) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const channelName = `chat-${channelId}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
    channelRef.current = channel;
  };

  const createChannel = async (e) => {
    e.preventDefault();
    if (!newChannel.name.trim()) return;
    const channelName = newChannel.name.toLowerCase().replace(/\s+/g, '-');
    const { data, error } = await supabase.from('channels').insert({
      organization_id: organization.id, name: channelName,
      type: newChannel.type, created_by: user.id
    }).select().single();
    if (error) { toast.error('Failed to create channel'); return; }
    if (data) {
      await supabase.from('channel_members').insert({ channel_id: data.id, user_id: user.id });
      if (newChannel.type === 'public') {
        const { data: orgMembers } = await supabase.from('organization_members')
          .select('user_id').eq('organization_id', organization.id);
        if (orgMembers) {
          for (const member of orgMembers) {
            if (member.user_id !== user.id) {
              await supabase.from('channel_members').insert({ channel_id: data.id, user_id: member.user_id });
            }
          }
        }
      }
      setChannels([...channels, data]);
      setSelectedChannel(data);
      setShowCreateChannel(false);
      setNewChannel({ name: '', type: 'public' });
      toast.success('Channel created!');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChannel) return;
    const { error } = await supabase.from('messages').insert({
      channel_id: selectedChannel.id, user_id: user.id, content: newMessage.trim()
    });
    if (!error) setNewMessage('');
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { toast.error('File too large. Max 100MB.'); return; }
    setUploading(true);
    try {
      const timestamp = Date.now();
      const filePath = `${organization.id}/chat/${timestamp}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-uploads').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('chat-uploads').getPublicUrl(filePath);
      const fileMessage = {
        channel_id: selectedChannel.id, user_id: user.id,
        content: `📎 Shared: ${file.name}`, file_url: publicUrl,
        file_type: file.type, file_name: file.name, file_size: file.size
      };
      await supabase.from('messages').insert(fileMessage);
      toast.success('File uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const getFileIcon = (fileType, fileName) => {
    if (!fileType && !fileName) return <File size={20} />;
    const type = fileType || ''; const name = fileName || '';
    if (type.startsWith('image/')) return <Image size={20} className="text-blue-500" />;
    if (type.startsWith('video/')) return <Video size={20} className="text-purple-500" />;
    if (type.startsWith('audio/')) return <Music size={20} className="text-green-500" />;
    if (type.includes('pdf')) return <FileText size={20} className="text-red-500" />;
    if (type.includes('zip') || type.includes('rar')) return <Archive size={20} className="text-orange-500" />;
    if (name.endsWith('.doc') || name.endsWith('.docx')) return <FileText size={20} className="text-blue-500" />;
    if (name.endsWith('.xls') || name.endsWith('.xlsx')) return <FileText size={20} className="text-green-500" />;
    return <File size={20} className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const downloadFile = async (url, fileName) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl; link.download = fileName || 'download';
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const getInitials = (name) => { if (!name) return 'U'; return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); };
  const formatTime = (date) => { return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };

  return (
    <div className="flex h-[calc(100vh-7rem)] rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
      {/* Channels Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-[#07111D]">
        <div className="p-5 border-b border-[#39444D]/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-[#E5E5DF] font-display">Chat</h2>
            <button onClick={() => setShowCreateChannel(true)} className="p-2 rounded-lg hover:bg-[#39444D]/30 text-[#DB9941] transition-colors">
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="mb-4">
            <span className="px-2 text-xs font-semibold text-[#5D5D5D] uppercase tracking-wider font-grotesk">Channels</span>
          </div>
          <div className="space-y-0.5">
            {channels.filter(c => c.type !== 'direct').map(ch => (
              <button key={ch.id} onClick={() => setSelectedChannel(ch)}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all font-grotesk ${
                  selectedChannel?.id === ch.id ? 'bg-[#DB9941]/10 text-[#DB9941] font-medium' : 'text-[#E5E5DF] hover:bg-[#39444D]/20'
                }`}>
                {ch.type === 'public' ? <Hash size={16} className="mr-2 flex-shrink-0" /> : <Lock size={16} className="mr-2 flex-shrink-0" />}
                <span className="flex-1 text-left truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#E5E5DF]" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {dragOver && (
          <div className="absolute inset-0 z-50 bg-[#DB9941]/10 border-4 border-dashed border-[#DB9941] rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <Upload size={48} className="mx-auto mb-3 text-[#DB9941]" />
              <p className="text-xl font-bold text-[#DB9941] font-grotesk">Drop file to upload</p>
            </div>
          </div>
        )}
        {selectedChannel ? (
          <>
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#39444D]/10 flex items-center justify-center">
                  {selectedChannel.type === 'public' ? <Hash size={20} className="text-[#39444D]" /> : <Lock size={20} className="text-[#39444D]" />}
                </div>
                <div>
                  <h3 className="font-bold text-[#07111D] text-lg font-display">{selectedChannel.name}</h3>
                  <p className="text-xs text-[#5D5D5D] font-grotesk">{messages.length} messages</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare size={48} className="mx-auto mb-4 text-[#5D5D5D]/30" />
                  <h3 className="text-lg font-bold text-[#07111D] mb-2 font-display">No messages yet</h3>
                  <p className="text-[#5D5D5D] font-grotesk">Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwn = msg.user_id === user.id;
                  const isFile = msg.file_url && msg.file_type;
                  return (
                    <div key={msg.id} className={`flex items-start space-x-3 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials('User')}
                      </div>
                      <div className={`max-w-[60%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        <div className={`rounded-2xl px-4 py-2.5 ${isOwn ? 'bg-[#07111D] text-[#E5E5DF] rounded-br-md' : 'bg-white text-[#07111D] rounded-bl-md border border-gray-100'}`}>
                          {isFile ? (
                            <div>
                              <p className="text-sm leading-relaxed font-grotesk mb-2">{msg.content}</p>
                              <div className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer hover:opacity-80 transition-opacity ${isOwn ? 'bg-white/10' : 'bg-[#E5E5DF]'}`}
                                onClick={() => downloadFile(msg.file_url, msg.file_name)}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/20">{getFileIcon(msg.file_type, msg.file_name)}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate font-grotesk">{msg.file_name || 'Download file'}</p>
                                  {msg.file_size && <p className="text-xs opacity-70 font-mono">{formatFileSize(msg.file_size)}</p>}
                                </div>
                                <Download size={18} className="flex-shrink-0" />
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed font-grotesk">{msg.content}</p>
                          )}
                        </div>
                        <span className="text-xs text-[#5D5D5D] mt-1 block font-mono">{formatTime(msg.created_at)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200">
              {uploading && (
                <div className="mb-2 flex items-center space-x-2 text-sm text-[#DB9941] font-grotesk">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#DB9941] border-t-transparent"></div>
                  <span>Uploading file...</span>
                </div>
              )}
              <div className="flex items-end space-x-3">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="p-2.5 rounded-xl hover:bg-[#E5E5DF] text-[#5D5D5D] hover:text-[#DB9941] transition-colors disabled:opacity-50">
                  <Paperclip size={20} />
                </button>
                <input ref={fileInputRef} type="file" onChange={onFileInputChange} className="hidden" />
                <div className="flex-1 relative">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                    placeholder={`Message #${selectedChannel.name}`}
                    className="w-full px-5 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DB9941] focus:border-transparent bg-[#E5E5DF] border-2 border-gray-200 text-[#07111D] placeholder-[#5D5D5D] font-grotesk" />
                </div>
                <button type="submit" disabled={!newMessage.trim()}
                  className="p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  style={{ background: newMessage.trim() ? 'linear-gradient(135deg, #DB9941, #AE2C11)' : '#E5E5DF', color: newMessage.trim() ? 'white' : '#5D5D5D' }}>
                  <Send size={20} />
                </button>
              </div>
              <p className="text-xs text-[#5D5D5D] mt-2 text-center font-mono">Press Enter to send • Drag & drop files • Max 100MB</p>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-4 text-[#5D5D5D]/30" />
              <h2 className="text-xl font-bold text-[#07111D] mb-2 font-display">Select a Channel</h2>
              <p className="text-[#5D5D5D] font-grotesk">Choose a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateChannel(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#07111D] font-display">Create Channel</h3>
              <button onClick={() => setShowCreateChannel(false)} className="p-1 rounded-lg hover:bg-[#E5E5DF] text-[#5D5D5D]"><X size={20} /></button>
            </div>
            <form onSubmit={createChannel} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Channel Name</label>
                <input type="text" value={newChannel.name} onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  placeholder="e.g., project-updates" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-[#DB9941] bg-[#E5E5DF] text-[#07111D] font-grotesk" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Channel Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setNewChannel({ ...newChannel, type: 'public' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${newChannel.type === 'public' ? 'border-[#DB9941] bg-[#DB9941]/5' : 'border-gray-200 hover:border-[#DB9941]/50'}`}>
                    <Hash size={20} className="mb-2" style={{ color: newChannel.type === 'public' ? '#DB9941' : '#5D5D5D' }} />
                    <p className="font-semibold text-sm text-[#07111D] font-grotesk">Public</p>
                    <p className="text-xs text-[#5D5D5D] mt-1">Everyone can join</p>
                  </button>
                  <button type="button" onClick={() => setNewChannel({ ...newChannel, type: 'private' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${newChannel.type === 'private' ? 'border-[#DB9941] bg-[#DB9941]/5' : 'border-gray-200 hover:border-[#DB9941]/50'}`}>
                    <Lock size={20} className="mb-2" style={{ color: newChannel.type === 'private' ? '#DB9941' : '#5D5D5D' }} />
                    <p className="font-semibold text-sm text-[#07111D] font-grotesk">Private</p>
                    <p className="text-xs text-[#5D5D5D] mt-1">Invite only</p>
                  </button>
                </div>
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="submit" className="flex-1 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 font-grotesk"
                  style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>Create Channel</button>
                <button type="button" onClick={() => setShowCreateChannel(false)}
                  className="px-6 py-3 rounded-xl font-semibold bg-[#E5E5DF] text-[#39444D] font-grotesk">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}