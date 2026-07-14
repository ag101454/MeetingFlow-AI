import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { 
  FileText, Download, Loader, Calendar, 
  TrendingUp, Users, CheckCircle,
  Clock, Sparkles, Eye, Printer, Share2,
  Activity, Target, RefreshCw, File, X,
  Video, MessageSquare
} from 'lucide-react';
import { fetchReportData, generateFormattedReport, downloadReport, generateFilename } from '../lib/reportGenerator';

export default function Reports() {
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportType, setReportType] = useState('weekly');
  const [selectedProject, setSelectedProject] = useState('all');
  const [projects, setProjects] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0, completedTasks: 0, totalMeetings: 0,
    activeProjects: 0, completionRate: 0, teamMembers: 0,
    totalDeliverables: 0, openFeedbacks: 0,
  });
  
  const organization = useAuthStore((state) => state.organization);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (organization) loadData();
  }, [organization]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: projectsData } = await supabase
        .from('projects').select('*').eq('organization_id', organization.id);
      if (projectsData) setProjects(projectsData);

      if (projectsData?.length > 0) {
        const projectIds = projectsData.map(p => p.id);
        const { data: tasks } = await supabase.from('tasks').select('*').in('project_id', projectIds);
        const { count: meetings } = await supabase.from('meetings').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id);
        const { count: members } = await supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id);
        const { count: deliverables } = await supabase.from('deliverables').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id);
        const { count: feedbacks } = await supabase.from('client_feedback').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('status', 'open');

        const completed = tasks?.filter(t => t.status === 'completed').length || 0;
        const total = tasks?.length || 0;

        setStats({
          totalTasks: total, completedTasks: completed,
          totalMeetings: meetings || 0,
          activeProjects: projectsData.filter(p => p.status === 'active').length,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          teamMembers: members || 0,
          totalDeliverables: deliverables || 0,
          openFeedbacks: feedbacks || 0,
        });
      }

      const { data: reportsData } = await supabase
        .from('reports').select('*').eq('organization_id', organization.id)
        .order('created_at', { ascending: false }).limit(20);
      if (reportsData) setReports(reportsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const projectId = selectedProject !== 'all' ? selectedProject : null;
      const data = await fetchReportData(organization.id, projectId, reportType);
      const content = generateFormattedReport(data);
      const title = `${reportType === 'client' ? 'Client Update' : reportType === 'weekly' ? 'Weekly' : 'Monthly'} Report - ${new Date().toLocaleDateString()}`;
      
      const { data: savedReport, error } = await supabase.from('reports').insert({
        organization_id: organization.id, project_id: projectId,
        type: reportType, title: title,
        content: { text: content, data: data }, generated_by: user.id,
      }).select().single();

      if (!error && savedReport) setReports(prev => [savedReport, ...prev]);
      setSelectedReport({ title, content, type: reportType, generatedAt: new Date().toISOString() });
      setShowPreview(true);
      toast.success('Report generated!');
    } catch (error) {
      console.error('Report error:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedReport?.content) return;
    const content = typeof selectedReport.content === 'string' ? selectedReport.content : selectedReport.content?.text;
    if (!content) return;
    const filename = generateFilename(organization?.name, reportType).replace('.txt', '.pdf');
    import('../lib/reportGenerator').then(module => {
      module.downloadReportAsPDF(content, filename, organization?.name);
      toast.success('PDF downloaded!');
    });
  };

  const handleDownloadTXT = () => {
    if (!selectedReport?.content) return;
    const content = typeof selectedReport.content === 'string' ? selectedReport.content : selectedReport.content?.text;
    if (!content) return;
    const filename = generateFilename(organization?.name, reportType);
    downloadReport(content, filename);
    toast.success('TXT downloaded!');
  };

  const handleCopy = () => {
    if (!selectedReport?.content) return;
    const content = typeof selectedReport.content === 'string' ? selectedReport.content : selectedReport.content?.text;
    if (!content) return;
    navigator.clipboard.writeText(content);
    toast.success('Copied!');
  };

  const handlePrint = () => {
    if (!selectedReport?.content) return;
    const content = typeof selectedReport.content === 'string' ? selectedReport.content : selectedReport.content?.text;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<pre style="font-family:monospace;font-size:12px;padding:20px;white-space:pre-wrap;">${content}</pre>`);
    win.document.close();
    win.print();
  };

  const reportTypes = [
    { id: 'weekly', label: 'Weekly Report', icon: Calendar, description: 'Last 7 days', color: '#DB9941' },
    { id: 'monthly', label: 'Monthly Report', icon: TrendingUp, description: 'Last 30 days', color: '#39444D' },
    { id: 'client', label: 'Client Update', icon: FileText, description: 'Client summary', color: '#AE2C11' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#DB9941' }}></div>
          <p className="text-[#5D5D5D] font-grotesk">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#07111D] font-display">Reports</h1>
          <p className="text-[#5D5D5D] mt-1 font-grotesk">{organization?.name} • Generate and manage reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={loadData} className="p-2.5 rounded-xl border bg-white hover:scale-110 transition-all" style={{ borderColor: '#39444D20', color: '#39444D' }}>
            <RefreshCw size={18} />
          </button>
          <button onClick={generateReport} disabled={generating}
            className="inline-flex items-center px-6 py-3 rounded-xl text-white font-semibold hover:scale-105 disabled:opacity-50 font-grotesk"
            style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)', boxShadow: '0 10px 30px rgba(219,153,65,0.3)' }}>
            {generating ? <Loader className="animate-spin mr-2" size={18} /> : <Sparkles className="mr-2" size={18} />}
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Target, label: 'Total Tasks', value: stats.totalTasks, color: '#DB9941' },
          { icon: CheckCircle, label: 'Completed', value: stats.completedTasks, color: '#10B981' },
          { icon: TrendingUp, label: 'Rate', value: `${stats.completionRate}%`, color: '#39444D' },
          { icon: Activity, label: 'Projects', value: stats.activeProjects, color: '#AE2C11' },
          { icon: Video, label: 'Meetings', value: stats.totalMeetings, color: '#5D5D5D' },
          { icon: Users, label: 'Team', value: stats.teamMembers, color: '#DB9941' },
          { icon: FileText, label: 'Deliverables', value: stats.totalDeliverables, color: '#10B981' },
          { icon: MessageSquare, label: 'Feedback', value: stats.openFeedbacks, color: '#AE2C11' },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl p-4 border bg-white hover:shadow-md transition-all" style={{ borderColor: '#39444D10' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${stat.color}15` }}>
              <stat.icon size={16} style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold text-[#07111D] font-display">{stat.value}</p>
            <p className="text-xs text-[#5D5D5D] font-grotesk">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6 border bg-white" style={{ borderColor: '#39444D20' }}>
        <h2 className="text-xl font-bold text-[#07111D] mb-6 font-display">Generate New Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-[#07111D] mb-3 font-grotesk">Report Type</label>
            <div className="space-y-2">
              {reportTypes.map(type => (
                <button key={type.id} onClick={() => setReportType(type.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all font-grotesk ${reportType === type.id ? 'border-[#DB9941] bg-[#DB9941]/5' : 'border-[#39444D]/10 hover:border-[#DB9941]/50'}`}>
                  <div className="flex items-center space-x-3">
                    <type.icon size={18} style={{ color: reportType === type.id ? '#DB9941' : '#5D5D5D' }} />
                    <div>
                      <p className="font-semibold text-sm" style={{ color: reportType === type.id ? '#DB9941' : '#07111D' }}>{type.label}</p>
                      <p className="text-xs text-[#5D5D5D]">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#07111D] mb-3 font-grotesk">Project</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DB9941] font-grotesk"
              style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#07111D' }}>
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <button onClick={generateReport} disabled={generating}
              className="w-full px-6 py-3.5 rounded-xl text-white font-bold text-lg hover:scale-105 disabled:opacity-50 font-grotesk flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)', boxShadow: '0 10px 30px rgba(219,153,65,0.3)' }}>
              {generating ? <Loader className="animate-spin mr-2" size={20} /> : <Sparkles className="mr-2" size={20} />}
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {showPreview && selectedReport && (
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: '#39444D20' }}>
          <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: '#39444D10' }}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>
                <FileText size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-[#07111D] text-lg font-display">{selectedReport.title}</h3>
                <p className="text-xs text-[#5D5D5D] font-grotesk">{organization?.name} • {new Date(selectedReport.generatedAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={handlePrint} className="p-2.5 rounded-xl border hover:scale-110 transition-all" style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#39444D' }} title="Print"><Printer size={18} /></button>
              <button onClick={handleCopy} className="p-2.5 rounded-xl border hover:scale-110 transition-all" style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#39444D' }} title="Copy"><Share2 size={18} /></button>
              <button onClick={handleDownloadPDF} className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm hover:scale-105 transition-all flex items-center space-x-2 font-grotesk" style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }} title="Download PDF"><Download size={16} /><span>PDF</span></button>
              <button onClick={handleDownloadTXT} className="px-4 py-2.5 rounded-xl font-semibold text-sm hover:scale-105 transition-all flex items-center space-x-2 border font-grotesk" style={{ backgroundColor: '#E5E5DF', borderColor: '#39444D20', color: '#39444D' }} title="Download TXT"><Download size={16} /><span>TXT</span></button>
              <button onClick={() => setShowPreview(false)} className="p-2.5 rounded-xl hover:scale-110 transition-all" style={{ backgroundColor: '#AE2C1110', color: '#AE2C11' }} title="Close"><X size={18} /></button>
            </div>
          </div>
          <div className="p-6 max-h-[600px] overflow-y-auto">
            <pre className="text-sm text-[#39444D] leading-relaxed font-mono whitespace-pre-wrap">
              {typeof selectedReport.content === 'string' ? selectedReport.content : selectedReport.content?.text}
            </pre>
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-white" style={{ borderColor: '#39444D20' }}>
        <div className="p-6 border-b" style={{ borderColor: '#39444D10' }}>
          <h3 className="text-xl font-bold text-[#07111D] font-display">Report History</h3>
          <p className="text-sm text-[#5D5D5D] mt-1 font-grotesk">{reports.length} reports generated</p>
        </div>
        {reports.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto mb-4 text-[#5D5D5D]/30" />
            <h4 className="text-lg font-bold text-[#07111D] mb-2 font-display">No Reports Yet</h4>
            <p className="text-[#5D5D5D] font-grotesk">Generate your first report to see it here</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#39444D10' }}>
            {reports.map((report, index) => (
              <div key={report.id || index} className="p-6 hover:bg-[#E5E5DF]/50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedReport({ title: report.title, content: report.content?.text || report.content, type: report.type, generatedAt: report.created_at });
                  setShowPreview(true);
                }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#39444D10' }}>
                      <FileText size={20} style={{ color: '#39444D' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-[#07111D] font-grotesk">{report.title}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs text-[#5D5D5D] font-mono">{new Date(report.created_at).toLocaleDateString()}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold font-grotesk" style={{ backgroundColor: report.type === 'client' ? '#AE2C1120' : '#DB994120', color: report.type === 'client' ? '#AE2C11' : '#DB9941' }}>{report.type}</span>
                      </div>
                    </div>
                  </div>
                  <Eye size={16} className="text-[#5D5D5D]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}