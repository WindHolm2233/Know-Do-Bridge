const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  postsTable: import.meta.env.VITE_SUPABASE_POSTS_TABLE || 'posts',
  commentsTable: import.meta.env.VITE_SUPABASE_COMMENTS_TABLE || 'comments',
  profilesTable: import.meta.env.VITE_SUPABASE_PROFILES_TABLE || 'profiles',
  directMessagesTable: import.meta.env.VITE_SUPABASE_DIRECT_MESSAGES_TABLE || 'direct_messages',
  directMessageReadsTable:
    import.meta.env.VITE_SUPABASE_DIRECT_MESSAGE_READS_TABLE || 'direct_message_reads',
  realtimeChannel: import.meta.env.VITE_SUPABASE_CHANNEL || 'realtime:campus-connect',
  directMessagesChannel: import.meta.env.VITE_SUPABASE_DM_CHANNEL || 'realtime:campus-direct-messages'
}

let supabaseClient = null

export const getSupabaseConfig = () => ({ ...supabaseConfig })

export const registerSupabaseClient = (client) => {
  supabaseClient = client
  return supabaseClient
}

export const getSupabaseClient = () => supabaseClient

export const canUseSupabase = () =>
  Boolean(supabaseClient && supabaseConfig.url && supabaseConfig.anonKey)
