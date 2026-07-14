import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  organization: null,
  role: null,
  loading: true,

  // Initialize auth state
  initialize: async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        set({ loading: false });
        return;
      }

      if (session) {
        console.log('✅ Session found, user is logged in');
        set({ 
          user: session.user, 
          session,
        });
        
        // Load organization immediately
        await get().loadOrganization();
        
        set({ loading: false });
      } else {
        console.log('No session found');
        set({ loading: false });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
          set({ user: session.user, session });
          await get().loadOrganization();
        } else if (event === 'SIGNED_OUT') {
          const user = get().user;
          if (user) {
            localStorage.removeItem(`org_${user.id}`);
          }
          set({ user: null, session: null, organization: null, role: null });
        } else if (event === 'USER_UPDATED' && session) {
          set({ user: session.user, session });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          set({ user: session.user, session });
          await get().loadOrganization();
        }
      });

    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false });
    }
  },

  // Sign In
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      set({ user: data.user, session: data.session });
      await get().loadOrganization();
      
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  // Sign Up
  signUp: async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/login`,
        }
      });
      
      if (error) throw error;
      
      if (data.session) {
        set({ user: data.user, session: data.session });
      } else if (data.user) {
        set({ user: data.user, session: null });
      }
      
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  },

  // Sign Out
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      const user = get().user;
      if (user) {
        localStorage.removeItem(`org_${user.id}`);
      }
      
      set({ 
        user: null, 
        session: null, 
        organization: null, 
        role: null 
      });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  // Load Organization - FIXED
  loadOrganization: async () => {
    const user = get().user;
    
    if (!user) {
      console.log('No user, skipping organization load');
      set({ organization: null, role: null });
      return;
    }

    try {
      // Check localStorage cache first
      const cachedOrg = localStorage.getItem(`org_${user.id}`);
      
      // Get membership from database
      const { data: memberships, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .limit(1);

      if (memberError) {
        console.log('Membership query error:', memberError.message);
        
        // Try cached org if DB fails
        if (cachedOrg) {
          try {
            const parsed = JSON.parse(cachedOrg);
            if (parsed.org && parsed.role) {
              console.log('Using cached organization:', parsed.org.name);
              set({ organization: parsed.org, role: parsed.role });
              return;
            }
          } catch (e) {
            localStorage.removeItem(`org_${user.id}`);
          }
        }
        
        set({ organization: null, role: null });
        return;
      }

      if (!memberships || memberships.length === 0) {
        console.log('No organization membership found for user');
        localStorage.removeItem(`org_${user.id}`);
        set({ organization: null, role: null });
        return;
      }

      const membership = memberships[0];

      // Get organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', membership.organization_id)
        .single();

      if (orgError) {
        console.error('Error loading organization:', orgError);
        
        // Try cached org
        if (cachedOrg) {
          try {
            const parsed = JSON.parse(cachedOrg);
            set({ organization: parsed.org, role: parsed.role });
            return;
          } catch (e) {}
        }
        
        set({ organization: null, role: null });
        return;
      }

      if (org) {
        console.log('✅ Organization loaded:', org.name, 'Role:', membership.role);
        
        // Cache organization in localStorage
        localStorage.setItem(`org_${user.id}`, JSON.stringify({
          org: org,
          role: membership.role,
          timestamp: Date.now()
        }));
        
        set({ 
          organization: org, 
          role: membership.role 
        });
      }

    } catch (error) {
      console.error('Error in loadOrganization:', error);
      set({ organization: null, role: null });
    }
  },

  // Set Organization manually
  setOrganization: (org, role) => {
    const user = get().user;
    if (user && org) {
      localStorage.setItem(`org_${user.id}`, JSON.stringify({
        org: org,
        role: role,
        timestamp: Date.now()
      }));
    }
    set({ organization: org, role: role });
  },

  // Refresh session
  refreshSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      if (session) {
        set({ user: session.user, session });
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  },

  // Update profile
  updateProfile: async (updates) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      });
      
      if (error) throw error;
      
      if (data.user) {
        set({ user: data.user });
      }
      
      return data;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  },

  // Reset password
  resetPassword: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  },
}));