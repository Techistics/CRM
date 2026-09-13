import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

export async function broadcastNotification(channelName: string, payload: any) {
  return new Promise<void>((resolve, reject) => {
    const channel = supabaseServer.channel(channelName)
    
    // Set a timeout in case it hangs
    const timeout = setTimeout(() => {
      supabaseServer.removeChannel(channel)
      resolve()
    }, 5000)

    channel.subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout)
        try {
          await channel.send({
            type: 'broadcast',
            event: 'new_notification',
            payload,
          })
        } catch (e) {
          console.error('[Supabase Broadcast Error]', e)
        } finally {
          supabaseServer.removeChannel(channel)
          resolve()
        }
      } else if (status === 'CHANNEL_ERROR') {
        clearTimeout(timeout)
        supabaseServer.removeChannel(channel)
        resolve()
      }
    })
  })
}
