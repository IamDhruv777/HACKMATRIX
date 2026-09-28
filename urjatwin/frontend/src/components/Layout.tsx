import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Network, TrendingUp, Play, GitCompare, History, Database, Settings, Zap, Menu, X } from 'lucide-react';
import SimBadge from './SimBadge';
import DataBadge from './DataBadge';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Network', path: '/network', icon: Network },
    { name: 'Forecast', path: '/forecast', icon: TrendingUp },
    { name: 'Simulator', path: '/scenario', icon: Play },
    { name: 'Actions', path: '/actions', icon: GitCompare },
    { name: 'History', path: '/history', icon: History },
    { name: 'Data', path: '/data-sources', icon: Database },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-100">
      
      {/* Floating Top Navigation (Desktop & Tablet) */}
      <header className="relative z-50 pt-4 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-teal-500/20 shadow-[0_0_20px_rgba(20,184,166,0.05)] rounded-2xl px-4 py-3 flex items-center justify-between">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.4)]">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-white tracking-wide leading-tight">URJATWIN</h1>
              <p className="text-[9px] text-teal-200/70 uppercase tracking-widest font-semibold leading-tight">Digital Twin</p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 text-sm font-medium ${
                    isActive 
                      ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30 shadow-[0_0_10px_rgba(20,184,166,0.1)]' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700/50'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Badges & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <DataBadge />
              <SimBadge />
            </div>
            
            <button 
              className="lg:hidden p-2 text-slate-300 hover:text-white bg-slate-800/50 rounded-lg border border-slate-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-20 left-4 right-4 z-40 bg-slate-900/90 backdrop-blur-2xl border border-teal-500/20 rounded-2xl p-4 shadow-2xl">
          <nav className="flex flex-col space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive 
                      ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 mt-2 scroll-smooth relative z-10">
        <div className="max-w-[1400px] mx-auto pb-12">
          {children}
        </div>
      </main>
      
      {/* Decorative Background Tower / Elements (Optional extra layer) */}
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-[url('https://www.svgrepo.com/show/440590/transmission-tower.svg')] bg-no-repeat bg-right-bottom opacity-[0.03] pointer-events-none z-0 mix-blend-screen" style={{ backgroundSize: 'contain' }}></div>
    </div>
  );
};

export default Layout;
