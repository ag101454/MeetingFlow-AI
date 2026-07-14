import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader, User, Sparkles } from 'lucide-react';
import { askAssistant } from '../lib/ai';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! 👋 I'm your MeetingFlow AI Assistant. I can help you with:\n\n• Project status and progress\n• Task summaries and deadlines\n• Meeting insights\n• Team productivity\n• Weekly reports\n\nWhat would you like to know?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const organization = useAuthStore(state => state.organization);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadContext = async () => {
    try {
      if (!organization?.id) {
        return {
          projects: [],
          tasks: [],
          meetings: [],
          user: user?.user_metadata?.full_name || 'User'
        };
      }

      // Load projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status, description')
        .eq('organization_id', organization.id)
        .limit(10);

      // Load tasks
      let tasks = [];
      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, title, status, priority, due_date')
          .in('project_id', projectIds)
          .limit(20);
        tasks = tasksData || [];
      }

      // Load recent meetings
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
        organization: organization.name
      };

    } catch (error) {
      console.error('Error loading context:', error);
      return {
        projects: [],
        tasks: [],
        meetings: [],
        user: 'User'
      };
    }
  };

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    // Add user message
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      // Load context
      const context = await loadContext();
      console.log('Context loaded:', context);
      
      // Get AI response
      const response = await askAssistant(question, context);
      console.log('AI response:', response);
      
      // Add AI response
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { 
      icon: '📊', 
      label: 'Project Status', 
      query: 'What is the current status of all projects?' 
    },
    { 
      icon: '⏰', 
      label: 'Overdue Tasks', 
      query: 'Are there any overdue tasks?' 
    },
    { 
      icon: '📅', 
      label: 'Recent Meetings', 
      query: 'What happened in the most recent meetings?' 
    },
    { 
      icon: '📈', 
      label: 'Weekly Summary', 
      query: 'Give me a summary of this week\'s progress' 
    },
    { 
      icon: '🎯', 
      label: 'My Tasks', 
      query: 'What tasks are assigned to me?' 
    },
    { 
      icon: '📝', 
      label: 'Create Report', 
      query: 'Help me create a status report' 
    },
  ];

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-sm border">
      {/* Header */}
      <div className="p-4 border-b flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Bot className="text-white" size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">AI Assistant</h3>
          <p className="text-xs text-gray-500">Powered by Groq AI</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${
              msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-brand-100' : 'bg-purple-100'
              }`}>
                {msg.role === 'user' ? (
                  <User size={16} className="text-brand-600" />
                ) : (
                  <Bot size={16} className="text-purple-600" />
                )}
              </div>
              <div className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2 bg-gray-100 p-3 rounded-lg">
              <Loader className="animate-spin" size={16} />
              <span className="text-sm text-gray-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t flex flex-wrap gap-2">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={() => setInput(action.query)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
          >
            <span>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your projects..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}