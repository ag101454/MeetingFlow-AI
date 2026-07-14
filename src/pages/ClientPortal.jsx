import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useClientPortal } from '../hooks/useClientPortal';
import { toast } from 'react-hot-toast';
import { 
  Eye, ThumbsUp, MessageSquare, FileText, 
  Calendar, Clock, CheckCircle, Download,
  Send, Star, TrendingUp, Users, AlertCircle,
  Building2, ArrowRight, Sparkles, X,
  Paperclip, Upload, Plus, ExternalLink,
  Filter, ChevronDown, Search, User,
  Check, Trash2, Edit, EyeOff, Globe,
  Lock, Unlock
} from 'lucide-react';

export default function ClientPortal() {
  const {
    projects,
    deliverables,
    feedbacks,
    stats,
    loading,
    addDeliverable,
    updateDeliverableStatus,
    submitFeedback,
    updateFeedbackStatus,
    toggleClientVisibility,
  } = useClientPortal();

  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ feedback: '', rating: 0, category: 'general' });
  const [deliverableForm, setDeliverableForm] = useState({ title: '', description: '', due_date: '' });
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  
  const organization = useAuthStore((state) => state.organization);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);

  // Colors
  const colors = {
    dark: '#07111D', charcoal: '#39444D', gray: '#5D5D5D',
    light: '#E5E5DF', gold: '#DB9941', rust: '#AE2C11', white: '#FFFFFF',
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setFileUploading(true);
    try {
      const filePath = `${organization.id}/deliverables/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);
      setUploadedFile({ url: publicUrl, name: file.name });
      toast.success('File uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setFileUploading(false);
    }
  };

  const handleAddDeliverable = async (e) => {
    e.preventDefault();
    if (!deliverableForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      await addDeliverable({
        project_id: selectedProject.id,
        title: deliverableForm.title,
        description: deliverableForm.description,
        file_url: uploadedFile?.url || null,
        due_date: deliverableForm.due_date || null,
      });
      toast.success('Deliverable added!');
      setShowAddDeliverable(false);
      setDeliverableForm({ title: '', description: '', due_date: '' });
      setUploadedFile(null);
    } catch (error) {
      toast.error('Failed to add deliverable');
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackForm.feedback.trim()) {
      toast.error('Please enter feedback');
      return;
    }
    try {
      await submitFeedback({
        project_id: selectedProject.id,
        feedback: feedbackForm.feedback,
        rating: feedbackForm.rating,
        category: feedbackForm.category,
      });
      toast.success('Feedback submitted!');
      setShowFeedback(false);
      setFeedbackForm({ feedback: '', rating: 0, category: 'general' });
    } catch (error) {
      toast.error('Failed to submit feedback');
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      pending: { bg: '#DB994120', color: '#DB9941', label: 'Pending' },
      in_review: { bg: '#39444D20', color: '#39444D', label: 'In Review' },
      approved: { bg: '#10B98120', color: '#10B981', label: 'Approved' },
      rejected: { bg: '#AE2C1120', color: '#AE2C11', label: 'Rejected' },
      open: { bg: '#DB994120', color: '#DB9941', label: 'Open' },
      resolved: { bg: '#10B98120', color: '#10B981', label: 'Resolved' },
    };
    return styles[status] || styles.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#DB9941' }}></div>
          <p className="text-[#5D5D5D] font-grotesk">Loading client portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#07111D] font-display">
            {role === 'client' ? 'My Projects' : 'Client Portal'}
          </h1>
          <p className="text-[#5D5D5D] mt-1 font-grotesk">
            {organization?.name} • {stats.totalProjects} project{stats.totalProjects !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: 'Projects', value: stats.totalProjects, color: '#DB9941' },
          { icon: Clock, label: 'Pending', value: stats.pendingDeliverables, color: '#39444D' },
          { icon: CheckCircle, label: 'Approved', value: stats.approvedDeliverables, color: '#10B981' },
          { icon: MessageSquare, label: 'Feedback', value: stats.openFeedbacks, color: '#AE2C11' },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl p-5 border bg-white" style={{ borderColor: '#39444D10' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${stat.color}15` }}>
              <stat.icon size={20} style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold text-[#07111D] font-display">{stat.value}</p>
            <p className="text-xs text-[#5D5D5D] font-grotesk">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="rounded-2xl p-6 bg-white border" style={{ borderColor: '#39444D10' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#07111D] font-grotesk">Overall Progress</h3>
          <span className="text-2xl font-bold text-[#DB9941] font-display">{stats.overallProgress}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-[#E5E5DF]">
          <div className="h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.overallProgress}%`, background: 'linear-gradient(90deg, #DB9941, #AE2C11)' }} />
        </div>
      </div>

      {/* Project Tabs */}
      {projects.length > 0 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {projects.map(project => (
            <button key={project.id} onClick={() => setSelectedProject(project)}
              className="px-5 py-2.5 rounded-xl whitespace-nowrap transition-all text-sm font-medium font-grotesk"
              style={{
                backgroundColor: selectedProject?.id === project.id ? '#07111D' : '#FFFFFF',
                color: selectedProject?.id === project.id ? '#E5E5DF' : '#07111D',
                border: selectedProject?.id === project.id ? '2px solid #07111D' : '2px solid #39444D20',
              }}>
              {project.name}
              {project.is_client_visible && <Eye size={12} className="inline ml-1" />}
            </button>
          ))}
        </div>
      )}

      {/* Selected Project Details */}
      {selectedProject && (
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: '#39444D20' }}>
          {/* Tabs */}
          <div className="border-b px-6" style={{ borderColor: '#39444D10' }}>
            <div className="flex space-x-6">
              {['overview', 'deliverables', 'feedback'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`py-4 px-2 font-grotesk text-sm font-medium border-b-2 capitalize transition-all ${
                    activeTab === tab ? 'border-[#DB9941] text-[#DB9941]' : 'border-transparent text-[#5D5D5D] hover:text-[#07111D]'
                  }`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-[#07111D] mb-2 font-display">{selectedProject.name}</h3>
                  <p className="text-[#5D5D5D] font-grotesk">{selectedProject.description || 'No description'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#E5E5DF]">
                    <h4 className="font-semibold text-[#07111D] mb-3 font-grotesk">Project Info</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-[#5D5D5D]">Status</span><span className="font-medium text-[#10B981]">{selectedProject.status}</span></div>
                      <div className="flex justify-between"><span className="text-[#5D5D5D]">Started</span><span className="font-medium">{new Date(selectedProject.created_at).toLocaleDateString()}</span></div>
                      <div className="flex justify-between"><span className="text-[#5D5D5D]">Client Visible</span>
                        <button onClick={() => toggleClientVisibility(selectedProject.id, !selectedProject.is_client_visible)}
                          className="font-medium" style={{ color: selectedProject.is_client_visible ? '#10B981' : '#AE2C11' }}>
                          {selectedProject.is_client_visible ? <Eye size={14} className="inline" /> : <EyeOff size={14} className="inline" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#E5E5DF]">
                    <h4 className="font-semibold text-[#07111D] mb-3 font-grotesk">Quick Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-[#5D5D5D]">Deliverables</span><span className="font-medium">{deliverables.filter(d => d.project_id === selectedProject.id).length}</span></div>
                      <div className="flex justify-between"><span className="text-[#5D5D5D]">Feedback Items</span><span className="font-medium">{feedbacks.filter(f => f.project_id === selectedProject.id).length}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deliverables Tab */}
            {activeTab === 'deliverables' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-[#07111D] font-display">Deliverables</h3>
                  {role !== 'client' && (
                    <button onClick={() => setShowAddDeliverable(true)}
                      className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:scale-105 font-grotesk"
                      style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
                      <Plus size={16} className="inline mr-1" /> Add Deliverable
                    </button>
                  )}
                </div>

                {deliverables.filter(d => d.project_id === selectedProject.id).length === 0 ? (
                  <div className="text-center py-12">
                    <FileText size={48} className="mx-auto mb-4 text-[#5D5D5D]/30" />
                    <p className="text-[#5D5D5D] font-grotesk">No deliverables yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliverables.filter(d => d.project_id === selectedProject.id).map(deliverable => {
                      const statusStyle = getStatusStyle(deliverable.status);
                      return (
                        <div key={deliverable.id} className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: '#39444D10' }}>
                          <div className="flex items-center space-x-4 min-w-0">
                            <FileText size={20} className="text-[#39444D] flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-[#07111D] font-grotesk truncate">{deliverable.title}</p>
                              {deliverable.description && <p className="text-xs text-[#5D5D5D] truncate">{deliverable.description}</p>}
                              {deliverable.due_date && (
                                <p className="text-xs text-[#5D5D5D] font-mono mt-1">Due: {new Date(deliverable.due_date).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 flex-shrink-0 ml-3">
                            <span className="px-3 py-1 rounded-full text-xs font-bold font-grotesk"
                              style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                              {statusStyle.label}
                            </span>
                            {deliverable.file_url && (
                              <a href={deliverable.file_url} target="_blank" rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-[#E5E5DF] text-[#39444D]">
                                <Download size={16} />
                              </a>
                            )}
                            {role === 'client' && deliverable.status !== 'approved' && (
                              <button onClick={() => updateDeliverableStatus(deliverable.id, 'approved')}
                                className="p-2 rounded-lg hover:bg-green-50 text-green-600">
                                <ThumbsUp size={16} />
                              </button>
                            )}
                            {role !== 'client' && (
                              <select value={deliverable.status}
                                onChange={(e) => updateDeliverableStatus(deliverable.id, e.target.value)}
                                className="text-xs rounded-lg px-2 py-1 border font-grotesk"
                                style={{ borderColor: '#39444D20' }}>
                                <option value="pending">Pending</option>
                                <option value="in_review">In Review</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-[#07111D] font-display">Feedback</h3>
                  <button onClick={() => setShowFeedback(true)}
                    className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:scale-105 font-grotesk"
                    style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
                    <MessageSquare size={16} className="inline mr-1" /> Submit Feedback
                  </button>
                </div>

                {feedbacks.filter(f => f.project_id === selectedProject.id).length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare size={48} className="mx-auto mb-4 text-[#5D5D5D]/30" />
                    <p className="text-[#5D5D5D] font-grotesk">No feedback yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedbacks.filter(f => f.project_id === selectedProject.id).map(fb => {
                      const statusStyle = getStatusStyle(fb.status);
                      return (
                        <div key={fb.id} className="p-4 rounded-xl border" style={{ borderColor: '#39444D10' }}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 rounded-full text-xs font-bold font-grotesk"
                                style={{ backgroundColor: '#DB994120', color: '#DB9941' }}>
                                {fb.category}
                              </span>
                              {fb.rating > 0 && (
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={14} fill={i < fb.rating ? '#DB9941' : 'none'} color={i < fb.rating ? '#DB9941' : '#5D5D5D'} />
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="px-2 py-1 rounded-full text-xs font-bold font-grotesk"
                              style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                              {statusStyle.label}
                            </span>
                          </div>
                          <p className="text-sm text-[#39444D] font-grotesk">{fb.feedback}</p>
                          <p className="text-xs text-[#5D5D5D] mt-2 font-mono">{new Date(fb.created_at).toLocaleString()}</p>
                          {role !== 'client' && fb.status === 'open' && (
                            <button onClick={() => updateFeedbackStatus(fb.id, 'resolved')}
                              className="mt-2 text-xs text-green-600 font-grotesk hover:underline">
                              Mark as Resolved
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Projects */}
      {projects.length === 0 && (
        <div className="text-center py-16 rounded-2xl border bg-white" style={{ borderColor: '#39444D20' }}>
          <Eye size={48} className="mx-auto mb-4 text-[#5D5D5D]/30" />
          <h3 className="text-xl font-bold text-[#07111D] mb-2 font-display">No Projects Yet</h3>
          <p className="text-[#5D5D5D] font-grotesk">
            {role === 'client' ? 'No projects have been shared with you yet.' : 'Create projects to share with clients.'}
          </p>
        </div>
      )}

      {/* Add Deliverable Modal */}
      {showAddDeliverable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddDeliverable(false)}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-[#07111D] mb-6 font-display">Add Deliverable</h2>
            <form onSubmit={handleAddDeliverable} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Title *</label>
                <input type="text" value={deliverableForm.title} onChange={(e) => setDeliverableForm({...deliverableForm, title: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] font-grotesk"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20' }} placeholder="Deliverable title" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Description</label>
                <textarea value={deliverableForm.description} onChange={(e) => setDeliverableForm({...deliverableForm, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] font-grotesk resize-none" rows="3"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20' }} placeholder="Description" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Due Date</label>
                <input type="date" value={deliverableForm.due_date} onChange={(e) => setDeliverableForm({...deliverableForm, due_date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] font-grotesk"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20' }} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">File</label>
                <input type="file" onChange={(e) => handleFileUpload(e.target.files[0])}
                  className="w-full text-sm font-grotesk" />
                {fileUploading && <p className="text-xs text-[#DB9941] mt-1">Uploading...</p>}
                {uploadedFile && <p className="text-xs text-green-600 mt-1">✅ {uploadedFile.name}</p>}
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="submit" className="flex-1 py-3 rounded-xl text-white font-semibold hover:scale-105 font-grotesk"
                  style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>Add Deliverable</button>
                <button type="button" onClick={() => setShowAddDeliverable(false)}
                  className="px-6 py-3 rounded-xl font-semibold bg-[#E5E5DF] text-[#39444D] font-grotesk">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowFeedback(false)}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-[#07111D] mb-6 font-display">Submit Feedback</h2>
            <form onSubmit={handleSubmitFeedback} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Rating</label>
                <div className="flex space-x-1">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} type="button" onClick={() => setFeedbackForm({...feedbackForm, rating: star})}>
                      <Star size={28} fill={star <= feedbackForm.rating ? '#DB9941' : 'none'} color={star <= feedbackForm.rating ? '#DB9941' : '#5D5D5D'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Category</label>
                <select value={feedbackForm.category} onChange={(e) => setFeedbackForm({...feedbackForm, category: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] font-grotesk"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20' }}>
                  <option value="general">General</option>
                  <option value="design">Design</option>
                  <option value="functionality">Functionality</option>
                  <option value="performance">Performance</option>
                  <option value="bug">Bug Report</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#07111D] mb-2 font-grotesk">Feedback *</label>
                <textarea value={feedbackForm.feedback} onChange={(e) => setFeedbackForm({...feedbackForm, feedback: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] font-grotesk resize-none" rows="4"
                  style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20' }} placeholder="Share your thoughts..." required />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="submit" className="flex-1 py-3 rounded-xl text-white font-semibold hover:scale-105 font-grotesk"
                  style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>Submit Feedback</button>
                <button type="button" onClick={() => setShowFeedback(false)}
                  className="px-6 py-3 rounded-xl font-semibold bg-[#E5E5DF] text-[#39444D] font-grotesk">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}