import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to prevent edge/CDN response caching
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Query a real table with a head request to perform a lightweight, valid DB activity check
    const { error } = await supabase.from('projects').select('id', { count: 'exact', head: true });

    if (error) {
      console.error('Supabase health ping failed:', error.message);
      return NextResponse.json(
        { status: 'error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        status: 'ok', 
        message: 'Health check passed, database pinged successfully.',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check exception:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to ping database' },
      { status: 500 }
    );
  }
}

