import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
	return (
		<div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'>
			<div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20'>
				{/* Navigation Bar */}
				<div className='flex justify-between items-center mb-16'>
					<Link href='/' className='text-2xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition'>
						Kanban Board
					</Link>
					<Link
						href='/auth'
						className='px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200 ease-in-out transform hover:scale-105'>
						Sign In / Register
					</Link>
				</div>

				{/* Header */}
				<div className='text-center mb-16'>
					<h1 className='text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-6'>
						About Kanban Board
					</h1>
					<p className='text-xl sm:text-2xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed'>
						A modern, collaborative project management tool designed to help teams organize, prioritize, and execute work efficiently.
					</p>
				</div>

				{/* What is Kanban Section */}
				<section className='mb-16'>
					<h2 className='text-4xl font-bold text-slate-900 dark:text-white mb-8'>What is a Kanban Board?</h2>
					<div className='bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border border-blue-100 dark:border-blue-900'>
						<p className='text-slate-700 dark:text-slate-300 mb-4 leading-relaxed text-lg'>
							Kanban is a visual project management methodology that originated in Japan. The word "Kanban" means "visual signal" or "card,"
							and the system is built around the principle of visualizing work in progress.
						</p>
						<p className='text-slate-700 dark:text-slate-300 mb-4 leading-relaxed text-lg'>
							A Kanban board organizes tasks into columns that represent different stages of your workflow. As you progress through your
							work, you move tasks from one column to the next, providing a clear visual representation of your project's status.
						</p>
						<p className='text-slate-700 dark:text-slate-300 leading-relaxed text-lg'>
							The beauty of Kanban lies in its simplicity and flexibility. It works for any type of workflow and helps teams identify
							bottlenecks, maintain focus, and continuously improve their processes.
						</p>
					</div>
				</section>

				{/* Key Benefits Section */}
				<section className='mb-16'>
					<h2 className='text-4xl font-bold text-slate-900 dark:text-white mb-8'>Key Benefits</h2>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
						<div className='bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border border-blue-100 dark:border-blue-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-200'>
							<div className='flex items-center mb-4'>
								<div className='w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-lg flex items-center justify-center mr-4'>
									<span className='text-2xl'>👁️</span>
								</div>
								<h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Visualization</h3>
							</div>
							<p className='text-slate-600 dark:text-slate-400 leading-relaxed'>
								See the entire project workflow at a glance and understand what everyone is working on.
							</p>
						</div>

						<div className='bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border border-indigo-100 dark:border-indigo-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-200'>
							<div className='flex items-center mb-4'>
								<div className='w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 rounded-lg flex items-center justify-center mr-4'>
									<span className='text-2xl'>⚡</span>
								</div>
								<h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Efficiency</h3>
							</div>
							<p className='text-slate-600 dark:text-slate-400 leading-relaxed'>
								Reduce context switching and focus on one task at a time with work-in-progress limits.
							</p>
						</div>

						<div className='bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border border-blue-100 dark:border-blue-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-200'>
							<div className='flex items-center mb-4'>
								<div className='w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-lg flex items-center justify-center mr-4'>
									<span className='text-2xl'>🔄</span>
								</div>
								<h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Continuous Improvement</h3>
							</div>
							<p className='text-slate-600 dark:text-slate-400 leading-relaxed'>
								Identify bottlenecks and optimize your process based on real workflow data.
							</p>
						</div>

						<div className='bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border border-indigo-100 dark:border-indigo-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-200'>
							<div className='flex items-center mb-4'>
								<div className='w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 rounded-lg flex items-center justify-center mr-4'>
									<span className='text-2xl'>👥</span>
								</div>
								<h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Team Collaboration</h3>
							</div>
							<p className='text-slate-600 dark:text-slate-400 leading-relaxed'>Share projects with your team and work together seamlessly in real-time.</p>
						</div>
					</div>
				</section>

				{/* Our App Section */}
				<section className='mb-16'>
					<h2 className='text-4xl font-bold text-slate-900 dark:text-white mb-8'>Our Kanban Board App</h2>
					<div className='bg-white dark:bg-slate-800 rounded-xl shadow-lg p-10 border border-blue-100 dark:border-blue-900'>
						<p className='text-slate-700 dark:text-slate-300 mb-8 leading-relaxed text-lg'>
							This application provides a streamlined, modern Kanban board experience. Designed with both individual users and teams in
							mind, it combines the proven Kanban methodology with an intuitive interface.
						</p>
						<div className='space-y-6'>
							<div className='flex items-start p-4 rounded-lg bg-blue-50 dark:bg-slate-700'>
								<span className='text-3xl mr-5 mt-1'>🎯</span>
								<div>
									<h4 className='font-semibold text-slate-900 dark:text-white mb-2 text-lg'>Create Custom Workflows</h4>
									<p className='text-slate-600 dark:text-slate-400 leading-relaxed'>
										Create columns that match your specific workflow and organize tasks exactly how you need them.
									</p>
								</div>
							</div>
							<div className='flex items-start p-4 rounded-lg bg-indigo-50 dark:bg-slate-700'>
								<span className='text-3xl mr-5 mt-1'>🔐</span>
								<div>
									<h4 className='font-semibold text-slate-900 dark:text-white mb-2 text-lg'>Secure & Collaborative</h4>
									<p className='text-slate-600 dark:text-slate-400 leading-relaxed'>
										Built with enterprise-grade security and real-time collaboration features for seamless teamwork.
									</p>
								</div>
							</div>
							<div className='flex items-start p-4 rounded-lg bg-blue-50 dark:bg-slate-700'>
								<span className='text-3xl mr-5 mt-1'>📱</span>
								<div>
									<h4 className='font-semibold text-slate-900 dark:text-white mb-2 text-lg'>Responsive Design</h4>
									<p className='text-slate-600 dark:text-slate-400 leading-relaxed'>
										Access your boards from any device—desktop, tablet, or mobile—with full functionality.
									</p>
								</div>
							</div>
							<div className='flex items-start p-4 rounded-lg bg-indigo-50 dark:bg-slate-700'>
								<span className='text-3xl mr-5 mt-1'>⚙️</span>
								<div>
									<h4 className='font-semibold text-slate-900 dark:text-white mb-2 text-lg'>Easy to Use</h4>
									<p className='text-slate-600 dark:text-slate-400 leading-relaxed'>
										Intuitive drag-and-drop interface that requires no training—start organizing immediately.
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Getting Started Section */}
				<section className='text-center bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 rounded-xl shadow-lg p-12'>
					<h2 className='text-4xl font-bold text-white mb-4'>Ready to Get Started?</h2>
					<p className='text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed'>
						Start organizing your projects and boosting your team's productivity with our Kanban board today.
					</p>
					<div className='flex flex-col sm:flex-row gap-4 justify-center'>
						<a
							href='/auth'
							className='inline-block bg-white hover:bg-gray-100 text-blue-600 font-semibold py-3 px-8 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 shadow-md'>
							Sign In / Register
						</a>
						<a
							href='/'
							className='inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-8 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 border border-blue-500'>
							Go to Dashboard
						</a>
					</div>
				</section>
			</div>
		</div>
	);
}
