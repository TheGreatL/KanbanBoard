import React from 'react';

export default function AboutPage() {
	return (
		<div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'>
			<div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20'>
				{/* Header */}
				<div className='text-center mb-12'>
					<h1 className='text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4'>About Kanban Board</h1>
					<p className='text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto'>
						A modern, collaborative project management tool designed to help teams organize, prioritize, and execute work efficiently.
					</p>
				</div>

				{/* What is Kanban Section */}
				<section className='mb-12'>
					<h2 className='text-3xl font-bold text-slate-900 dark:text-white mb-6'>What is a Kanban Board?</h2>
					<div className='bg-white dark:bg-slate-800 rounded-lg shadow-md p-8'>
						<p className='text-slate-700 dark:text-slate-300 mb-4 leading-relaxed'>
							Kanban is a visual project management methodology that originated in Japan. The word "Kanban" means "visual signal" or "card,"
							and the system is built around the principle of visualizing work in progress.
						</p>
						<p className='text-slate-700 dark:text-slate-300 mb-4 leading-relaxed'>
							A Kanban board organizes tasks into columns that represent different stages of your workflow. As you progress through your
							work, you move tasks from one column to the next, providing a clear visual representation of your project's status.
						</p>
						<p className='text-slate-700 dark:text-slate-300 leading-relaxed'>
							The beauty of Kanban lies in its simplicity and flexibility. It works for any type of workflow and helps teams identify
							bottlenecks, maintain focus, and continuously improve their processes.
						</p>
					</div>
				</section>

				{/* Key Benefits Section */}
				<section className='mb-12'>
					<h2 className='text-3xl font-bold text-slate-900 dark:text-white mb-6'>Key Benefits</h2>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
						<div className='bg-white dark:bg-slate-800 rounded-lg shadow-md p-6'>
							<div className='flex items-center mb-4'>
								<div className='w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4'>
									<span className='text-blue-600 dark:text-blue-300 font-bold text-lg'>👁️</span>
								</div>
								<h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Visualization</h3>
							</div>
							<p className='text-slate-600 dark:text-slate-400'>
								See the entire project workflow at a glance and understand what everyone is working on.
							</p>
						</div>

						<div className='bg-white dark:bg-slate-800 rounded-lg shadow-md p-6'>
							<div className='flex items-center mb-4'>
								<div className='w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-4'>
									<span className='text-green-600 dark:text-green-300 font-bold text-lg'>⚡</span>
								</div>
								<h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Efficiency</h3>
							</div>
							<p className='text-slate-600 dark:text-slate-400'>
								Reduce context switching and focus on one task at a time with work-in-progress limits.
							</p>
						</div>

						<div className='bg-white dark:bg-slate-800 rounded-lg shadow-md p-6'>
							<div className='flex items-center mb-4'>
								<div className='w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mr-4'>
									<span className='text-purple-600 dark:text-purple-300 font-bold text-lg'>🔄</span>
								</div>
								<h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Continuous Improvement</h3>
							</div>
							<p className='text-slate-600 dark:text-slate-400'>
								Identify bottlenecks and optimize your process based on real workflow data.
							</p>
						</div>

						<div className='bg-white dark:bg-slate-800 rounded-lg shadow-md p-6'>
							<div className='flex items-center mb-4'>
								<div className='w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mr-4'>
									<span className='text-orange-600 dark:text-orange-300 font-bold text-lg'>👥</span>
								</div>
								<h3 className='text-xl font-semibold text-slate-900 dark:text-white'>Team Collaboration</h3>
							</div>
							<p className='text-slate-600 dark:text-slate-400'>Share projects with your team and work together seamlessly in real-time.</p>
						</div>
					</div>
				</section>

				{/* Our App Section */}
				<section className='mb-12'>
					<h2 className='text-3xl font-bold text-slate-900 dark:text-white mb-6'>Our Kanban Board App</h2>
					<div className='bg-white dark:bg-slate-800 rounded-lg shadow-md p-8'>
						<p className='text-slate-700 dark:text-slate-300 mb-4 leading-relaxed'>
							This application provides a streamlined, modern Kanban board experience. Designed with both individual users and teams in
							mind, it combines the proven Kanban methodology with an intuitive interface.
						</p>
						<div className='mt-6 space-y-4'>
							<div className='flex items-start'>
								<span className='text-2xl mr-4'>🎯</span>
								<div>
									<h4 className='font-semibold text-slate-900 dark:text-white mb-1'>Create Custom Workflows</h4>
									<p className='text-slate-600 dark:text-slate-400'>
										Create columns that match your specific workflow and organize tasks exactly how you need them.
									</p>
								</div>
							</div>
							<div className='flex items-start'>
								<span className='text-2xl mr-4'>🔐</span>
								<div>
									<h4 className='font-semibold text-slate-900 dark:text-white mb-1'>Secure & Collaborative</h4>
									<p className='text-slate-600 dark:text-slate-400'>
										Built with enterprise-grade security and real-time collaboration features for seamless teamwork.
									</p>
								</div>
							</div>
							<div className='flex items-start'>
								<span className='text-2xl mr-4'>📱</span>
								<div>
									<h4 className='font-semibold text-slate-900 dark:text-white mb-1'>Responsive Design</h4>
									<p className='text-slate-600 dark:text-slate-400'>
										Access your boards from any device—desktop, tablet, or mobile—with full functionality.
									</p>
								</div>
							</div>
							<div className='flex items-start'>
								<span className='text-2xl mr-4'>⚙️</span>
								<div>
									<h4 className='font-semibold text-slate-900 dark:text-white mb-1'>Easy to Use</h4>
									<p className='text-slate-600 dark:text-slate-400'>
										Intuitive drag-and-drop interface that requires no training—start organizing immediately.
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Getting Started Section */}
				<section className='text-center'>
					<h2 className='text-3xl font-bold text-slate-900 dark:text-white mb-6'>Ready to Get Started?</h2>
					<p className='text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto'>
						Start organizing your projects and boosting your team's productivity with our Kanban board today.
					</p>
					<a
						href='/'
						className='inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200 ease-in-out transform hover:scale-105'>
						Go to Dashboard
					</a>
				</section>
			</div>
		</div>
	);
}
