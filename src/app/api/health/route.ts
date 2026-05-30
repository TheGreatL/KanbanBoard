import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Perform a lightweight query to ensure the database stays active.
    // Querying a table (even if it doesn't exist) is enough to hit the 
    // Postgres instance and reset the inactivity timer.
    await supabase.from('_health_check').select('*').limit(1);

    return NextResponse.json({ 
      status: 'ok', 
      message: 'Health check completed successfully',
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to perform health check' 
    }, { status: 500 });
  }
}
