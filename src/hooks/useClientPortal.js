import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function useClientPortal() {
  const [projects, setProjects] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    pendingDeliverables: 0,
    approvedDeliverables: 0,
    openFeedbacks: 0,
    overallProgress: 0,
  });
  
  const organization = useAuthStore((state) => state.organization);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);

  useEffect(() => {
    if (organization) {
      loadAllData();
    }
  }, [organization]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load projects (all for team, only visible for clients)
      let projectQuery = supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      // If client, only show visible projects or assigned projects
      if (role === 'client') {
        projectQuery = projectQuery.or(`client_id.eq.${user.id},is_client_visible.eq.true`);
      }

      const { data: projectsData } = await projectQuery;
      
      if (projectsData) {
        setProjects(projectsData);
        
        // Load deliverables for all projects
        if (projectsData.length > 0) {
          const projectIds = projectsData.map(p => p.id);
          
          const { data: deliverablesData } = await supabase
            .from('deliverables')
            .select('*')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false });
          
          if (deliverablesData) setDeliverables(deliverablesData);

          // Load feedback
          const { data: feedbackData } = await supabase
            .from('client_feedback')
            .select('*')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false });
          
          if (feedbackData) setFeedbacks(feedbackData);

          // Calculate stats
          const pending = deliverablesData?.filter(d => d.status === 'pending' || d.status === 'in_review').length || 0;
          const approved = deliverablesData?.filter(d => d.status === 'approved').length || 0;
          const openFb = feedbackData?.filter(f => f.status === 'open').length || 0;
          const totalDeliverables = deliverablesData?.length || 0;
          const progress = totalDeliverables > 0 ? Math.round((approved / totalDeliverables) * 100) : 0;

          setStats({
            totalProjects: projectsData.length,
            pendingDeliverables: pending,
            approvedDeliverables: approved,
            openFeedbacks: openFb,
            overallProgress: progress,
          });
        }
      }
    } catch (error) {
      console.error('Error loading client portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addDeliverable = async (deliverableData) => {
    try {
      const { data, error } = await supabase
        .from('deliverables')
        .insert({
          organization_id: organization.id,
          project_id: deliverableData.project_id,
          title: deliverableData.title,
          description: deliverableData.description,
          file_url: deliverableData.file_url || null,
          status: 'pending',
          due_date: deliverableData.due_date || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setDeliverables(prev => [data, ...prev]);
        await loadAllData(); // Refresh stats
        return data;
      }
    } catch (error) {
      console.error('Error adding deliverable:', error);
      throw error;
    }
  };

  const updateDeliverableStatus = async (deliverableId, status) => {
    try {
      const updates = { status };
      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = user.id;
      }

      const { error } = await supabase
        .from('deliverables')
        .update(updates)
        .eq('id', deliverableId);

      if (error) throw error;

      setDeliverables(prev => prev.map(d => 
        d.id === deliverableId ? { ...d, ...updates } : d
      ));
      await loadAllData();
    } catch (error) {
      console.error('Error updating deliverable:', error);
      throw error;
    }
  };

  const submitFeedback = async (feedbackData) => {
    try {
      const { data, error } = await supabase
        .from('client_feedback')
        .insert({
          organization_id: organization.id,
          project_id: feedbackData.project_id,
          user_id: user.id,
          feedback: feedbackData.feedback,
          rating: feedbackData.rating || null,
          category: feedbackData.category || 'general',
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setFeedbacks(prev => [data, ...prev]);
        await loadAllData();
        return data;
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  };

  const updateFeedbackStatus = async (feedbackId, status) => {
    try {
      const { error } = await supabase
        .from('client_feedback')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', feedbackId);

      if (error) throw error;

      setFeedbacks(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, status } : f
      ));
      await loadAllData();
    } catch (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
  };

  const toggleClientVisibility = async (projectId, isVisible) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_client_visible: isVisible })
        .eq('id', projectId);

      if (error) throw error;

      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, is_client_visible: isVisible } : p
      ));
    } catch (error) {
      console.error('Error toggling visibility:', error);
      throw error;
    }
  };

  const assignClientToProject = async (projectId, clientId) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ client_id: clientId, is_client_visible: true })
        .eq('id', projectId);

      if (error) throw error;

      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, client_id: clientId, is_client_visible: true } : p
      ));
    } catch (error) {
      console.error('Error assigning client:', error);
      throw error;
    }
  };

  return {
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
    assignClientToProject,
    refresh: loadAllData,
  };
}