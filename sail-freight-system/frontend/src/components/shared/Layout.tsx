// ─────────────────────────────────────────────────────────────
// components/shared/Layout.tsx
// Mature Commercial Maritime Enterprise Top Navigation Bar
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { Search, Sun, Moon, Settings, Menu, X, Compass, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { CommandPalette } from './CommandPalette';
import { SettingsModal } from './SettingsModal';

const NAV_LINKS = [
  { name: 'Overview', path: '/overview' },
  { name: 'Carrier Intelligence', path: '/carrier' },
  { name: 'Freight Market', path: '/market' },
  { name: 'Vessel Explorer', path: '/vessels' },
  { name: 'Route Intelligence', path: '/routes' },
  { name: 'Decision Center', path: '/decision' },
  { name: 'NIRNAY', path: '/nirnayn' },
];

export default function Layout() {
  const { resolvedTheme, setTheme } = useTheme();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-ink selection:bg-primary/30">
      {/* Top Enterprise Navigation Bar */}
      <header className="h-12 border-b border-border bg-surface flex items-center justify-between px-3 sm:px-5 sticky top-0 z-40 select-none">
        {/* Left Side: Brand Mark & Horizontal Nav */}
        <div className="flex items-center gap-6 h-full min-w-0">
          {/* NAVIC Brand Mark */}
          <Link
            to="/overview"
            className="flex items-center gap-2 group py-1.5 focus:outline-hidden"
          >
            <div className="w-6 h-6 rounded bg-primary/15 border border-primary/40 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-wider text-ink text-xs font-mono leading-none">
                NAVIC
              </span>
              <span className="text-[8.5px] tracking-widest text-ink-muted font-mono leading-none mt-0.5 hidden sm:inline">
                MARITIME INTELLIGENCE
              </span>
            </div>
          </Link>

          {/* Mature Horizontal Enterprise Navigation Tabs */}
          <nav className="hidden lg:flex items-center h-full gap-0.5">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) =>
                  `relative h-full flex items-center px-3 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-ink font-semibold'
                      : 'text-ink-secondary hover:text-ink hover:bg-surface-elevated/40'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{link.name}</span>
                    {/* Restrained 2px bottom active indicator */}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Side: Professional Utility Area */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Data Status Indicator */}
          <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-ink-secondary border-r border-border pr-3">
            <span className="w-1.5 h-1.5 rounded-full bg-status-green" />
            <span className="text-[10px] text-ink-muted uppercase">DATA STATUS:</span>
            <span className="text-[10px] text-ink font-semibold">DEMO DATASET · 18 SEP 2026</span>
          </div>

          {/* Quick Search Trigger (Ctrl/Cmd + K) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded border border-border bg-background-secondary text-ink-secondary hover:text-ink hover:border-border-hover transition-colors text-xs font-mono"
            title="Search corridors, ports, vessels (Ctrl/Cmd + K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">Search...</span>
            <kbd className="hidden md:inline text-[9px] px-1 py-0.2 rounded bg-surface border border-border text-ink-muted">
              ⌘K
            </kbd>
          </button>

          {/* Dedicated Theme Toggle Control */}
          <button
            onClick={toggleTheme}
            className="p-1 sm:px-2 sm:py-1.5 rounded border border-border bg-background-secondary text-ink-secondary hover:text-ink hover:border-border-hover flex items-center gap-1.5 text-xs font-mono transition-colors"
            title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Theme`}
            aria-label="Toggle Theme"
          >
            {resolvedTheme === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-accent" />
                <span className="hidden sm:inline text-[11px]">Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-status-amber" />
                <span className="hidden sm:inline text-[11px]">Light</span>
              </>
            )}
          </button>

          {/* Settings Trigger */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded border border-border bg-background-secondary text-ink-secondary hover:text-ink hover:border-border-hover transition-colors"
            title="System Settings & Hydrographic Parameters"
            aria-label="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Mobile Navigation Drawer Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded border border-border bg-background-secondary text-ink-secondary hover:text-ink transition-colors"
            title="Toggle Navigation Menu"
            aria-label="Open Navigation"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Responsive Mobile / Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-12 z-30 bg-black/50 backdrop-blur-xs flex flex-col animate-fadeIn">
          <div className="bg-surface border-b border-border shadow-xl p-3 space-y-1">
            <div className="text-[10px] font-mono text-ink-muted uppercase px-3 py-1 font-bold">
              Navigation Modules
            </div>
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                    isActive
                      ? 'bg-surface-elevated text-primary font-semibold border-l-2 border-primary'
                      : 'text-ink-secondary hover:text-ink hover:bg-background-secondary'
                  }`
                }
              >
                <span>{link.name}</span>
                <span className="text-[10px] font-mono text-ink-muted">→</span>
              </NavLink>
            ))}

            <div className="pt-2 mt-2 border-t border-border flex items-center justify-between px-3 text-[11px] font-mono text-ink-secondary">
              <span>● DEMO DATASET · 18 SEP 2026</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Outlet />
      </main>

      {/* Quick Search & Command Palette Modal */}
      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* System Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
