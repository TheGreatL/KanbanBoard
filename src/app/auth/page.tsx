export const dynamic = 'force-dynamic';
import AuthForm from '@/components/AuthForm';

export default function AuthPage() {
	return (
		<div className='min-h-screen  grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-zinc-950'>
			<div className='flex items-center relative justify-center'>
				<AuthForm />
			</div>
			{/* gradient black and white mix background */}
			<div className='bg-amber-200/50 lg:block hidden'></div>
		</div>
	);
}
