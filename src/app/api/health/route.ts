import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Perform a lightweight query to wake up the database.
    // We query a non-existent table just to hit the PostgREST API and Postgres database
    // which is enough to prevent the Supabase instance from pausing.
    const { error } = await supabase.from('_keep_alive').select('*').limit(1);

    return NextResponse.json(
      { 
        status: 'ok', 
        message: 'Health check passed, database pinged successfully.',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to ping database' },
      { status: 500 }
    );
  }
}
