import { supabase } from './supabase';

export async function confirmAllUsers() {
  try {
    // This requires admin privileges
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Cannot list users:', error.message);
      console.log('Run this SQL in Supabase SQL Editor instead:');
      console.log(`
        UPDATE auth.users 
        SET email_confirmed_at = NOW(), confirmed_at = NOW()
        WHERE email_confirmed_at IS NULL;
      `);
      return;
    }
    
    for (const user of users.users) {
      if (!user.email_confirmed_at) {
        await supabase.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );
        console.log(`Confirmed: ${user.email}`);
      }
    }
  } catch (error) {
    console.error('Error confirming users:', error);
  }
}