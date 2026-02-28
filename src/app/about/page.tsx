import React from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  Zap, 
  RotateCw, 
  Users, 
  Target, 
  Lock, 
  Smartphone, 
  Settings2,
  ArrowRight
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/30">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex justify-between items-center py-4">
          <Link
            href="/"
            className="group flex items-center gap-2 font-bold text-2xl tracking-tight text-zinc-900 dark:text-white"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              📊
            </div>
            <span>Kanban</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/auth"
              className="px-5 py-2.5 rounded-full font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-zinc-900/10 dark:shadow-white/10"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-16 sm:py-24 lg:py-32">
        {/* Hero Section */}
        <div className="relative text-center mb-24 lg:mb-32">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            A Personal Side Project
          </div>
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-500 dark:from-white dark:via-white dark:to-zinc-500">
            Organize work, <br />
            <span className="text-blue-600">effortlessly.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            I built this simple, collaborative Kanban board to manage my personal projects and share tasks with friends. Fast, clean, and visual.
          </p>
          <div className="mt-12 flex justify-center gap-4">
             <Link href="/auth" className="group flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25">
               Try it out
               <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
             </Link>
          </div>
        </div>

        {/* Philosophy Section */}
        <section className="mb-32 relative">
          <div className="absolute inset-0 bg-blue-600/5 dark:bg-blue-600/10 blur-3xl -z-10 rounded-full scale-90" />
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-8">
                The inspiration <br />
                <span className="text-blue-600 italic">behind the board.</span>
              </h2>
              <div className="space-y-6 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <p>
                  I was looking for a straightforward way to manage my hobbies, side projects, and day-to-day tasks. Most enterprise tools felt too heavy, and basic to-do lists lacked visual context.
                </p>
                <p>
                  So, I decided to build my own Kanban board. It's designed specifically for what a small group of friends or an individual needs to stay organized.
                </p>
                <p>
                  Whether we're planning a weekend trip, iterating on a hobby project, or just tracking chores, this tool keeps everyone on the same page.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-sm">
                <blockquote className="text-2xl font-medium leading-tight">
                  "Sometimes the best tool is the one you build yourself to solve your own exact problem."
                </blockquote>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 bg-blue-600 p-8 rounded-3xl text-white">
                  <div className="text-3xl font-bold mb-1">100%</div>
                  <div className="text-sm opacity-80 uppercase tracking-wider font-semibold">Free Forever</div>
                </div>
                <div className="flex-1 bg-zinc-200 dark:bg-zinc-800 p-8 rounded-3xl">
                  <div className="text-3xl font-bold mb-1">∞</div>
                  <div className="text-sm text-zinc-500 uppercase tracking-wider font-semibold">Tinkering Potential</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Benefits */}
        <section className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What is it used for?</h2>
            <p className="text-zinc-600 dark:text-zinc-400">From grocery lists to building apps, it handles it all.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4 h-full md:h-[600px]">
             {/* Large Feature */}
             <div className="md:col-span-2 md:row-span-2 group relative overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-10 hover:shadow-2xl transition-all duration-500">
                <div className="absolute top-0 right-0 p-8">
                   <Target className="w-16 h-16 text-blue-600/20 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="relative h-full flex flex-col justify-end">
                   <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-6">
                      <Zap className="w-6 h-6" />
                   </div>
                   <h3 className="text-3xl font-bold mb-4">Personal Projects</h3>
                   <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed">
                     Keep track of your side hustles, learning goals, or home improvement projects. See exactly what needs to be done next, at a glance.
                   </p>
                </div>
             </div>

             {/* Small Feature 1 */}
             <div className="group relative overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 hover:shadow-2xl transition-all duration-500">
                <div className="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                   <RotateCw className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-2">Event Planning</h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Planning a trip or a party? Easily share the board with friends and assign tasks.
                </p>
             </div>

             {/* Small Feature 2 */}
             <div className="group relative overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 hover:shadow-2xl transition-all duration-500">
                <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                   <Users className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-2">Daily Life</h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Use it as an interactive, drag-and-drop to-do list for your daily routines and chores.
                </p>
             </div>
          </div>
        </section>

        {/* Feature List Section */}
        <section className="mb-32">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: BarChart3, title: "Custom Columns", desc: "Create lists that match your exact workflow or needs." },
              { icon: Lock, title: "Role Management", desc: "Assign viewers or editors to keep projects organized." },
              { icon: Smartphone, title: "Live Collaboration", desc: "Invite friends and work together in real-time." },
              { icon: Settings2, title: "Visual Drag-n-Drop", desc: "Move tasks around effortlessly with a smooth interface." }
            ].map((f, i) => (
              <div key={i} className="group p-2">
                <div className="mb-6 w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <f.icon className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold mb-2">{f.title}</h4>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden bg-zinc-900 dark:bg-white rounded-[3rem] p-12 sm:p-20 text-center text-white dark:text-zinc-900 border-4 border-blue-600/20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent pointer-events-none" />
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-8 relative z-10">
            Want to give it a spin?
          </h2>
          <p className="text-lg sm:text-xl opacity-80 mb-12 max-w-xl mx-auto relative z-10">
            It's just a free, personal tool. Feel free to create an account and start dragging some cards around with your friends!
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center relative z-10">
            <Link
              href="/auth"
              className="w-full sm:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-500/50"
            >
              Sign Up / Log In
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-10 py-5 bg-white/10 dark:bg-zinc-900/10 backdrop-blur-md rounded-2xl font-bold text-xl hover:bg-white/20 dark:hover:bg-zinc-900/20 transition-all border border-white/20 dark:border-zinc-900/20"
            >
              Return to Home
            </Link>
          </div>
        </section>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-6 lg:px-16 py-12 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">
          Build with ❤️ by Me • © 2026
        </p>
      </footer>
    </div>
  );
}
