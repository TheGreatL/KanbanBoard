export const dynamic = 'force-dynamic';
import AuthForm from '@/components/AuthForm';

export default function AuthPage() {
	return (
		<div className='min-h-screen  grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-zinc-950'>
			<div className='flex items-center relative justify-center'>
				<div className='absolute top-10 left-1/2 transform -translate-x-1/2'>
					<h1 className='text-4xl font-bold text-zinc-900 dark:text-zinc-100'>Kanban Board</h1>
				</div>

				<AuthForm />
			</div>
			{/* gradient black and white mix background */}
			<div className='bg-amber-200/50 lg:block hidden'></div>
		</div>
	);
}
