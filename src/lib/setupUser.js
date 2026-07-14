import { supabase } from './supabase';

export async function setupNewUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if user already has an organization
    const { data: existingMembership } = await supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMembership) {
      // User already has org, but make sure they're in all public channels
      await addUserToPublicChannels(existingMembership.organization_id, user.id);
      return existingMembership;
    }

    // Create a default organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: `${user.user_metadata?.full_name || 'My'}'s Workspace`,
        slug: `org-${user.id.slice(0, 8)}-${Date.now()}`,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Add user as owner
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner'
      })
      .select()
      .single();

    if (memberError) throw memberError;

    // Create default channels
    const defaultChannels = ['general', 'random', 'announcements'];
    for (const channelName of defaultChannels) {
      const { data: channel } = await supabase
        .from('channels')
        .insert({
          organization_id: org.id,
          name: channelName,
          type: 'public',
          created_by: user.id
        })
        .select()
        .single();

      if (channel) {
        await supabase.from('channel_members').insert({
          channel_id: channel.id,
          user_id: user.id
        });
      }
    }

    return membership;
  } catch (error) {
    console.error('Setup error:', error);
    return null;
  }
}

// Helper function to add user to all public channels
async function addUserToPublicChannels(organizationId, userId) {
  try {
    // Get all public channels in the organization
    const { data: channels } = await supabase
      .from('channels')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('type', 'public');

    if (!channels || channels.length === 0) return;

    // Check which channels the user is already a member of
    const { data: existingMemberships } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', userId);

    const existingChannelIds = existingMemberships?.map(m => m.channel_id) || [];

    // Add user to channels they're not already in
    for (const channel of channels) {
      if (!existingChannelIds.includes(channel.id)) {
        await supabase.from('channel_members').insert({
          channel_id: channel.id,
          user_id: userId
        });
        console.log(`Added user to channel: ${channel.id}`);
      }
    }
  } catch (error) {
    console.error('Error adding user to channels:', error);
  }
}