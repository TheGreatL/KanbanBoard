import {createBrowserClient} from '@supabase/ssr';

function getSupabaseBrowserClient() {
  if (typeof window !== 'undefined') {
    // Reuse the existing instance during HMR to prevent lock timeouts
    if (!(window as any).__supabase) {
      const options: any = {};
      if (process.env.NODE_ENV === 'development') {
        options.auth = {
          lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => fn(),
        };
      }
      
      (window as any).__supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        options
      );
    }
    return (window as any).__supabase;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const supabase = getSupabaseBrowserClient();
