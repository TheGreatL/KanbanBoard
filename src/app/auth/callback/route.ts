import {NextResponse} from 'next/server';
// The client you created in Step 7.1
import {createClient} from '@/lib/supabase/server';

export async function GET(request: Request) {
	const {searchParams, origin} = new URL(request.url);
	const code = searchParams.get('code');
	// if "next" is in search params, use it as the redirection URL after successful exchange
	const next = searchParams.get('next') ?? '/';

	if (code) {
		const supabase = await createClient();
		const {error} = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			const forwardedHost = request.headers.get('x-forwarded-host');
			const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
			const isLocalEnv = process.env.NODE_ENV === 'development';
			
			if (isLocalEnv && !forwardedHost) {
				return NextResponse.redirect(`${origin}${next}`);
			} else if (forwardedHost) {
				return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`);
			} else {
				// Fallback to the origin from the request URL
				return NextResponse.redirect(`${origin}${next}`);
			}
		}

		// Handle error during code exchange
		return NextResponse.redirect(
			`${origin}/auth/auth-code-error?error=${error.name}&error_description=${encodeURIComponent(error.message)}`,
		);
	}

	// Handle case where Supabase redirects back with errors in the URL (e.g. access_denied, otp_expired)
	const error = searchParams.get('error');
	const errorDescription = searchParams.get('error_description');

	if (error) {
		return NextResponse.redirect(
			`${origin}/auth/auth-code-error?error=${error}&error_description=${encodeURIComponent(errorDescription || '')}`,
		);
	}

	// Default fallback for missing code
	return NextResponse.redirect(`${origin}/auth/auth-code-error?error=invalid_request&error_description=No+authentication+code+provided`);
}
