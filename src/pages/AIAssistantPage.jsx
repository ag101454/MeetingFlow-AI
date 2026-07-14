import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader, User, Sparkles, Zap, Star, Clock, ChevronRight, Mic } from 'lucide-react';
import { askAssistant } from '../lib/ai';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! 👋 I'm your MeetingFlow AI Assistant. I can help you with:\n\n📊 Project status & progress\n✅ Task summaries & deadlines\n📹 Meeting insights & transcripts\n📈 Team productivity analysis\n📝 Weekly report generation\n\nWhat would you like to know?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  
  const organization = useAuthStore(state => state.organization);
  const user = useAuthStore(state => state.user);

  // Theme colors
  const colors = {
    dark: '#07111D',
    charcoal: '#39444D',
    gray: '#5D5D5D',
    light: '#E5E5DF',
    gold: '#DB9941',
    rust: '#AE2C11',
    white: '#FFFFFF',
  };

  useEffect(() => {
    scrollToBottom();
    loadSuggestions();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSuggestions = async () => {
    if (!organization) return;
    
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .eq('organization_id', organization.id);

    const { count: taskCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'completed');

    setSuggestions([
      { icon: '📊', label: 'Project Status', query: 'What is the current status of all projects?' },
      { icon: '⏰', label: `Tasks (${taskCount || 0} pending)`, query: 'Show me all pending tasks' },
      { icon: '📹', label: 'Recent Meetings', query: 'What happened in the most recent meetings?' },
      { icon: '📈', label: 'Weekly Report', query: 'Generate a summary of this week\'s progress' },
      { icon: '🎯', label: 'My Tasks', query: 'What tasks are assigned to me?' },
      { icon: '💡', label: 'Productivity Tips', query: 'How can we improve team productivity?' },
    ]);
  };

  const loadContext = async () => {
    try {
      if (!organization?.id) {
        return { projects: [], tasks: [], meetings: [], user: user?.user_metadata?.full_name || 'User' };
      }

      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status, description')
        .eq('organization_id', organization.id)
        .limit(10);

      let tasks = [];
      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, title, status, priority, due_date, project_id')
          .in('project_id', projectIds)
          .limit(30);
        tasks = tasksData || [];
      }

      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, title, summary, status, created_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        projects: projects || [],
        tasks: tasks || [],
        meetings: meetings || [],
        user: user?.user_metadata?.full_name || 'User',
        organization: organization.name,
        userId: user?.id
      };

    } catch (error) {
      console.error('Error loading context:', error);
      return { projects: [], tasks: [], meetings: [], user: 'User' };
    }
  };

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const context = await loadContext();
      const response = await askAssistant(question, context);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response 
      }]);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I encountered an error. Please try asking again.' 
      }]);
      toast.error('Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (query) => {
    setInput(query);
  };

  const formatMessage = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/•/g, '<br>•');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#07111D] font-display">AI Assistant</h1>
          <p className="text-[#5D5D5D] mt-1 font-grotesk">Get intelligent insights about your projects</p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 rounded-xl border" style={{ borderColor: '#DB994130', backgroundColor: '#DB994110' }}>
          <Sparkles size={16} className="text-[#DB9941]" />
          <span className="text-sm font-medium text-[#DB9941] font-grotesk">AI Powered</span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Suggestions & Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Capabilities Card */}
          <div className="rounded-2xl p-5 border" style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20' }}>
            <h3 className="font-semibold text-[#07111D] mb-4 font-display flex items-center">
              <Zap size={18} className="mr-2 text-[#DB9941]" />
              Capabilities
            </h3>
            <div className="space-y-3">
              {[
                { icon: '📊', text: 'Project status & analytics' },
                { icon: '✅', text: 'Task management & tracking' },
                { icon: '📹', text: 'Meeting summaries & insights' },
                { icon: '📝', text: 'Report generation' },
                { icon: '💡', text: 'Productivity recommendations' },
                { icon: '🔍', text: 'Data search & retrieval' },
              ].map((item, i) => (
                <div key={i} className="flex items-center space-x-3 text-sm">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-[#39444D] font-grotesk">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions Card */}
          <div className="rounded-2xl p-5 border" style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20' }}>
            <h3 className="font-semibold text-[#07111D] mb-4 font-display flex items-center">
              <Star size={18} className="mr-2 text-[#DB9941]" />
              Try Asking
            </h3>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.query)}
                  className="w-full text-left p-3 rounded-xl transition-all hover:scale-102 border text-sm"
                  style={{ 
                    backgroundColor: '#E5E5DF', 
                    borderColor: '#39444D10',
                    color: '#07111D'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#07111D';
                    e.currentTarget.style.color = '#E5E5DF';
                    e.currentTarget.style.borderColor = '#07111D';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#E5E5DF';
                    e.currentTarget.style.color = '#07111D';
                    e.currentTarget.style.borderColor = '#39444D10';
                  }}
                >
                  <div className="flex items-center space-x-2 font-grotesk">
                    <span>{suggestion.icon}</span>
                    <span className="flex-1">{suggestion.label}</span>
                    <ChevronRight size={14} className="opacity-50" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Stats Card */}
          <div className="rounded-2xl p-5 border" style={{ 
            background: 'linear-gradient(135deg, #07111D, #39444D)',
            borderColor: '#39444D30'
          }}>
            <h3 className="font-semibold text-[#E5E5DF] mb-4 font-display">Workspace Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#5D5D5D] font-grotesk">Organization</span>
                <span className="text-[#E5E5DF] font-grotesk">{organization?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5D5D5D] font-grotesk">Member</span>
                <span className="text-[#DB9941] font-grotesk">{user?.user_metadata?.full_name || 'User'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3 rounded-2xl border flex flex-col h-[700px]" 
          style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D20' }}>
          
          {/* Chat Header */}
          <div className="p-5 border-b flex items-center space-x-3" style={{ borderColor: '#39444D10' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[#07111D] font-display text-lg">MeetingFlow AI</h3>
              <p className="text-xs text-[#5D5D5D] font-grotesk">
                {organization ? `Analyzing ${organization.name}...` : 'Ready to help'}
              </p>
            </div>
            <div className="flex-1" />
            <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full" style={{ backgroundColor: '#10B98120' }}>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-green-600 font-grotesk">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-[#39444D] to-[#5D5D5D]' 
                      : 'bg-gradient-to-br from-[#DB9941] to-[#AE2C11]'
                  }`}>
                    {msg.role === 'user' ? (
                      <User size={20} className="text-white" />
                    ) : (
                      <Bot size={20} className="text-white" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`rounded-2xl px-5 py-3.5 ${
                    msg.role === 'user'
                      ? 'text-white rounded-br-md'
                      : 'rounded-bl-md border'
                  }`}
                  style={{
                    backgroundColor: msg.role === 'user' ? '#07111D' : '#FFFFFF',
                    borderColor: msg.role === 'user' ? 'transparent' : '#39444D10',
                    color: msg.role === 'user' ? '#E5E5DF' : '#07111D',
                  }}>
                    <div 
                      className="text-sm leading-relaxed font-grotesk whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                    <div className="text-xs mt-2 opacity-50 font-mono">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-3 p-4 rounded-2xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#39444D10' }}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DB9941] to-[#AE2C11] flex items-center justify-center">
                    <Bot size={20} className="text-white" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full bg-[#DB9941] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-[#DB9941] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-[#DB9941] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-[#5D5D5D] font-grotesk">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t" style={{ borderColor: '#39444D10' }}>
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask me anything about your projects, tasks, or meetings..."
                  className="w-full px-5 py-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all font-grotesk"
                  style={{ 
                    backgroundColor: '#E5E5DF',
                    border: '2px solid #39444D10',
                    color: '#07111D',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#DB9941';
                    e.target.style.boxShadow = '0 0 0 3px rgba(219, 153, 65, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#39444D10';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg text-[#5D5D5D] hover:text-[#DB9941] transition-colors"
                >
                  <Mic size={18} />
                </button>
              </div>
              
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-5 py-3.5 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                style={{ 
                  background: input.trim() ? 'linear-gradient(135deg, #DB9941, #AE2C11)' : '#E5E5DF',
                  color: input.trim() ? 'white' : '#5D5D5D'
                }}
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-xs text-[#5D5D5D] mt-2 text-center font-mono">
              Press Enter to send • Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}