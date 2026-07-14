// ==========================================
// MEETINGFLOW AI - FREE VERSION
// Uses browser APIs and smart templates
// No API key or credits required
// ==========================================

// ==========================================
// SPEECH TO TEXT (Browser-Based - Free)
// ==========================================

export class BrowserTranscriber {
    constructor() {
      this.recognition = null;
      this.isListening = false;
    }
  
    initialize(language = 'en-US') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported in this browser. Please use Chrome.');
      }
  
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = language;
  
      return this.recognition;
    }
  
    startListening(onResult, onError) {
      return new Promise((resolve, reject) => {
        if (!this.recognition) {
          this.initialize();
        }
  
        let finalTranscript = '';
  
        this.recognition.onresult = (event) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
  
          if (onResult) {
            onResult({
              final: finalTranscript,
              interim: interimTranscript,
              full: finalTranscript + interimTranscript
            });
          }
        };
  
        this.recognition.onerror = (event) => {
          if (onError) onError(event.error);
          reject(event.error);
        };
  
        this.recognition.onend = () => {
          this.isListening = false;
          resolve(finalTranscript);
        };
  
        this.recognition.start();
        this.isListening = true;
      });
    }
  
    stopListening() {
      if (this.recognition && this.isListening) {
        this.recognition.stop();
        this.isListening = false;
      }
    }
  }
  
  export const transcriber = new BrowserTranscriber();
  
  // ==========================================
  // TRANSCRIPTION FUNCTION
  // ==========================================
  
  export async function transcribeAudio(audioFile) {
    // For uploaded files, we can't transcribe without an API
    // Return a message to use live recording instead
    return {
      text: "Please use the live recording feature for transcription. Uploaded file transcription requires an API key.",
      segments: []
    };
  }
  
  // ==========================================
  // MEETING INSIGHTS GENERATOR (Template-Based)
  // ==========================================
  
  export async function generateMeetingInsights(transcript) {
    // Extract keywords and create structured output from transcript
    const text = transcript.toLowerCase();
    
    // Find action items
    const actionItems = extractActionItems(text);
    
    // Find decisions
    const decisions = extractDecisions(text);
    
    // Find questions
    const questions = extractQuestions(text);
    
    // Generate summary
    const summary = generateSummary(text);
  
    return {
      summary: summary,
      highlights: [
        `Meeting covered ${countWords(text)} words of discussion`,
        `${actionItems.length} action items identified`,
        `${decisions.length} decisions recorded`
      ],
      decisions: decisions,
      risks: [],
      questions: questions,
      action_items: actionItems
    };
  }
  
  // ==========================================
  // AI ASSISTANT (Rule-Based, No API Needed)
  // ==========================================
  
  export async function askAssistant(question, context = {}) {
    const q = question.toLowerCase();
    
    // Project-related questions
    if (q.includes('project') && (q.includes('status') || q.includes('progress'))) {
      return formatProjectStatus(context);
    }
    
    // Task-related questions
    if (q.includes('task') || q.includes('overdue') || q.includes('pending')) {
      return formatTaskList(context);
    }
    
    // Meeting-related questions
    if (q.includes('meeting') || q.includes('discussed') || q.includes('yesterday')) {
      return formatMeetingSummary(context);
    }
    
    // Report requests
    if (q.includes('report') || q.includes('summary') || q.includes('weekly')) {
      return generateSimpleReport(context);
    }
    
    // My tasks
    if (q.includes('my task') || q.includes('assigned to me')) {
      return formatMyTasks(context);
    }
    
    // Help
    if (q.includes('help') || q.includes('what can you do')) {
      return getHelpMessage();
    }
    
    // Default response
    return getDefaultResponse(context);
  }
  
  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================
  
  function extractActionItems(text) {
    const items = [];
    
    // Look for common action item patterns
    const patterns = [
      /(\w+)\s+will\s+([^.]+)/gi,
      /(\w+)\s+needs?\s+to\s+([^.]+)/gi,
      /(\w+)\s+should\s+([^.]+)/gi,
      /action(?:\s+item)?:?\s+([^.]+)/gi,
      /todo:?\s+([^.]+)/gi,
      /task:?\s+([^.]+)/gi,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        items.push({
          title: match[2]?.trim() || match[1]?.trim(),
          description: '',
          assignee: match[1]?.trim() || 'Unassigned',
          priority: 'medium',
          deadline: 'Not specified'
        });
      }
    });
    
    // If no items found, add some based on keywords
    if (items.length === 0) {
      if (text.includes('design')) items.push({ title: 'Design work mentioned', assignee: 'Team', priority: 'medium', deadline: 'TBD' });
      if (text.includes('develop')) items.push({ title: 'Development work mentioned', assignee: 'Team', priority: 'medium', deadline: 'TBD' });
      if (text.includes('test')) items.push({ title: 'Testing mentioned', assignee: 'Team', priority: 'medium', deadline: 'TBD' });
      if (text.includes('deploy')) items.push({ title: 'Deployment mentioned', assignee: 'Team', priority: 'medium', deadline: 'TBD' });
      if (text.includes('review')) items.push({ title: 'Review mentioned', assignee: 'Team', priority: 'medium', deadline: 'TBD' });
    }
    
    return items.slice(0, 5); // Max 5 items
  }
  
  function extractDecisions(text) {
    const decisions = [];
    
    const patterns = [
      /decided\s+(?:that\s+)?([^.]+)/gi,
      /decision:?\s+([^.]+)/gi,
      /agreed\s+(?:to|that)\s+([^.]+)/gi,
      /we will\s+([^.]+)/gi,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        decisions.push(match[1]?.trim());
      }
    });
    
    return decisions.slice(0, 3);
  }
  
  function extractQuestions(text) {
    const questions = [];
    const matches = text.match(/[^.!?]*\?/g);
    if (matches) {
      matches.forEach(m => questions.push(m.trim()));
    }
    return questions.slice(0, 3);
  }
  
  function generateSummary(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const firstFew = sentences.slice(0, 3).join('. ');
    return `Meeting discussed ${firstFew}. Total of ${countWords(text)} words discussed.`;
  }
  
  function countWords(text) {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }
  
  function formatProjectStatus(context) {
    const projects = context.projects || [];
    
    if (projects.length === 0) {
      return "📊 **Project Status**\n\nNo projects found. Create your first project to track progress!";
    }
    
    let response = "📊 **Project Status Update**\n\n";
    
    projects.forEach(project => {
      response += `**${project.name}**\n`;
      response += `• Status: ${project.status}\n`;
      
      // Count tasks for this project
      const projectTasks = (context.tasks || []).filter(t => t.project_id === project.id);
      const completed = projectTasks.filter(t => t.status === 'completed').length;
      const total = projectTasks.length;
      
      if (total > 0) {
        const progress = Math.round((completed / total) * 100);
        response += `• Progress: ${progress}% (${completed}/${total} tasks)\n`;
      } else {
        response += `• No tasks yet\n`;
      }
      response += '\n';
    });
    
    return response;
  }
  
  function formatTaskList(context) {
    const tasks = context.tasks || [];
    
    if (tasks.length === 0) {
      return "📋 **Task List**\n\nNo tasks found. Create tasks in your projects to track work.";
    }
    
    const pending = tasks.filter(t => t.status !== 'completed');
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
    
    let response = "📋 **Task Overview**\n\n";
    response += `• Total Tasks: ${tasks.length}\n`;
    response += `• Pending: ${pending.length}\n`;
    response += `• Overdue: ${overdue.length}\n\n`;
    
    response += "**Recent Tasks:**\n";
    tasks.slice(0, 5).forEach(task => {
      response += `• ${task.title} - ${task.status} (${task.priority})\n`;
    });
    
    return response;
  }
  
  function formatMeetingSummary(context) {
    const meetings = context.meetings || [];
    
    if (meetings.length === 0) {
      return "📹 **Meetings**\n\nNo meetings recorded yet. Record your first meeting to get AI insights!";
    }
    
    let response = "📹 **Recent Meetings**\n\n";
    
    meetings.slice(0, 5).forEach(meeting => {
      response += `**${meeting.title}**\n`;
      response += `• Date: ${new Date(meeting.created_at).toLocaleDateString()}\n`;
      if (meeting.summary) {
        response += `• Summary: ${meeting.summary}\n`;
      }
      response += '\n';
    });
    
    return response;
  }
  
  function formatMyTasks(context) {
    const tasks = context.tasks || [];
    const user = context.user || 'User';
    
    const myTasks = tasks.filter(t => 
      t.assignee_id === context.userId || 
      t.title?.toLowerCase().includes(user.toLowerCase())
    );
    
    if (myTasks.length === 0) {
      return `🎯 **My Tasks**\n\nNo tasks assigned to you. Ask your project manager to assign tasks.`;
    }
    
    let response = `🎯 **Tasks for ${user}**\n\n`;
    myTasks.forEach(task => {
      response += `• ${task.title}\n`;
      response += `  Status: ${task.status} | Priority: ${task.priority}\n`;
      if (task.due_date) {
        response += `  Due: ${new Date(task.due_date).toLocaleDateString()}\n`;
      }
    });
    
    return response;
  }
  
  function generateSimpleReport(context) {
    const projects = context.projects || [];
    const tasks = context.tasks || [];
    const meetings = context.meetings || [];
    
    return `📄 **Weekly Report**\n\n` +
      `**Projects:** ${projects.length} active\n` +
      `**Tasks:** ${tasks.length} total, ${tasks.filter(t => t.status === 'completed').length} completed\n` +
      `**Meetings:** ${meetings.length} this week\n\n` +
      `**Recommendations:**\n` +
      `• Review overdue tasks\n` +
      `• Schedule team sync-up\n` +
      `• Update project timelines\n` +
      `• Check pending approvals`;
  }
  
  function getHelpMessage() {
    return `🤖 **I can help you with:**\n\n` +
      `• **Project Status** - Ask "What's the project status?"\n` +
      `• **Task Lists** - Ask "Show me tasks"\n` +
      `• **Meetings** - Ask "What meetings do we have?"\n` +
      `• **My Tasks** - Ask "What are my tasks?"\n` +
      `• **Reports** - Ask "Generate a report"\n\n` +
      `Try asking one of these questions!`;
  }
  
  function getDefaultResponse(context) {
    return `🤖 **MeetingFlow AI Assistant**\n\n` +
      `I'm a smart assistant that can help you with:\n\n` +
      `• Checking project status\n` +
      `• Listing tasks and deadlines\n` +
      `• Summarizing meetings\n` +
      `• Generating reports\n\n` +
      `Try asking:\n` +
      `• "Show project status"\n` +
      `• "What tasks are pending?"\n` +
      `• "What happened in meetings?"\n` +
      `• "Generate weekly report"\n` +
      `• "What are my tasks?"\n\n` +
      `**Current Stats:**\n` +
      `• Projects: ${(context.projects || []).length}\n` +
      `• Tasks: ${(context.tasks || []).length}\n` +
      `• Meetings: ${(context.meetings || []).length}`;
  }
  
  // ==========================================
  // WEEKLY REPORT GENERATOR
  // ==========================================
  
  export async function generateWeeklyReport(projectData) {
    const projects = projectData?.projects || [];
    const tasks = projectData?.tasks || [];
    const meetings = projectData?.meetings || [];
    
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return `# Weekly Project Report\n\n` +
      `## Executive Summary\n` +
      `This week we made progress across ${projects.length} projects with ${completed} tasks completed out of ${total} total tasks (${progress}% completion rate).\n\n` +
      `## Key Metrics\n` +
      `- **Active Projects:** ${projects.length}\n` +
      `- **Tasks Completed:** ${completed}\n` +
      `- **Tasks Pending:** ${total - completed}\n` +
      `- **Meetings Held:** ${meetings.length}\n` +
      `- **Completion Rate:** ${progress}%\n\n` +
      `## Project Details\n` +
      projects.map(p => `### ${p.name}\n- Status: ${p.status}\n- Tasks: ${tasks.filter(t => t.project_id === p.id).length}\n`).join('\n') +
      `\n## Recommendations\n` +
      `- Focus on high-priority pending tasks\n` +
      `- Schedule follow-up meetings for blocked items\n` +
      `- Update project timelines based on progress\n` +
      `- Review resource allocation`;
  }
  
  // ==========================================
  // CLIENT UPDATE GENERATOR
  // ==========================================
  
  export async function generateClientUpdate(projectData) {
    return `Dear Client,\n\n` +
      `Here's a quick update on our progress:\n\n` +
      `We've made significant progress this week with several key milestones achieved. Our team is working diligently to meet all deadlines and deliver high-quality results.\n\n` +
      `**Completed:**\n` +
      `- Multiple tasks across all active projects\n` +
      `- Regular team meetings for coordination\n\n` +
      `**Next Steps:**\n` +
      `- Continue work on remaining deliverables\n` +
      `- Schedule review session for completed work\n\n` +
      `Please let us know if you have any questions or feedback.\n\n` +
      `Best regards,\n` +
      `The Team`;
  }