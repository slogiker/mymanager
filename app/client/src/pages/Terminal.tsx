import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Eye, EyeOff, Wifi, WifiOff, Loader2, X, Unplug, ShieldAlert, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/layout/Navbar';
import '@xterm/xterm/css/xterm.css';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'disabled';

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; dot: string; badge: string }> = {
  disconnected: { label: 'Disconnected',        dot: 'bg-slate-600',   badge: 'text-slate-400 bg-slate-800/60 border-slate-700/50' },
  connecting:   { label: 'Connecting…',         dot: 'bg-yellow-400 animate-pulse', badge: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  connected:    { label: 'Connected',           dot: 'bg-emerald-400', badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  error:        { label: 'Error',               dot: 'bg-red-500',     badge: 'text-red-400 bg-red-500/10 border-red-500/30' },
  disabled:     { label: 'Disabled (Security)', dot: 'bg-amber-400',   badge: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
};

export default function TerminalPage() {
  const { user } = useAuth();
  const termRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [host, setHost] = useState<string>('');
  const [port, setPort] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(true);
  const [connectedHost, setConnectedHost] = useState<string>('');

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      termInstance.current?.dispose();
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
      }
    };
  }, []);

  function connect() {
    const resolvedHost = host || 'ssh.slogiker.si';
    setConnectedHost(resolvedHost);
    setShowPrompt(false);
    setStatus('connecting');

    setTimeout(() => {
      if (!termRef.current) return;

      const term = new Terminal({
        theme: {
          background:          '#0a0b0f',
          foreground:          '#c9d1d9',
          cursor:              '#ef4444',
          cursorAccent:        '#0a0b0f',
          selectionBackground: '#ef444430',
          black:               '#0d1117', brightBlack:   '#484f58',
          red:                 '#ff7b72', brightRed:     '#ffa198',
          green:               '#3fb950', brightGreen:   '#56d364',
          yellow:              '#d29922', brightYellow:  '#e3b341',
          blue:                '#58a6ff', brightBlue:    '#79c0ff',
          magenta:             '#bc8cff', brightMagenta: '#d2a8ff',
          cyan:                '#39c5cf', brightCyan:    '#56d4dd',
          white:               '#b1bac4', brightWhite:   '#f0f6fc',
        },
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        fontSize: 14,
        lineHeight: 1.5,
        letterSpacing: 0.5,
        cursorBlink: true,
        cursorStyle: 'bar',
        allowTransparency: true,
        scrollback: 10000,
        fastScrollModifier: 'alt',
      });

      const fit = new FitAddon();
      fitAddon.current = fit;
      term.loadAddon(fit);
      term.open(termRef.current);
      fit.fit();
      termInstance.current = term;

      const token = document.cookie.split('; ').find(r => r.startsWith('token='))?.split('=')[1];

      const socket = io('/', {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setStatus('connecting');
        socket.emit('ssh-connect', { host, port, username, password });
      });

      socket.on('data', (data: string | ArrayBuffer) => {
        term.write(typeof data === 'string' ? data : new Uint8Array(data as ArrayBuffer));
      });

      socket.on('disabled', () => {
        setStatus('disabled');
      });

      socket.on('disconnect', () => setStatus('disconnected'));
      socket.on('connect_error', () => setStatus('error'));

      term.onData(d => {
        // Block input if shell access is disabled for security
        socket.emit('data', d);
      });

      const handleResize = () => {
        fit.fit();
        socket.emit('resize', { rows: term.rows, cols: term.cols });
      };

      window.addEventListener('resize', handleResize);
      resizeHandlerRef.current = handleResize;
      term.onResize(({ rows, cols }) => socket.emit('resize', { rows, cols }));
    }, 100);
  }

  function disconnect() {
    socketRef.current?.disconnect();
    termInstance.current?.dispose();
    termInstance.current = null;
    if (resizeHandlerRef.current) {
      window.removeEventListener('resize', resizeHandlerRef.current);
      resizeHandlerRef.current = null;
    }
    setStatus('disconnected');
    setShowPrompt(true);
    setPassword('');
    setConnectedHost('');
  }

  const sc = STATUS_CONFIG[status];

  return (
    <div className="h-screen flex flex-col bg-[#0a0b0f] overflow-hidden">
      <Navbar />

      <div className="flex flex-col flex-1 min-h-0 pt-16">
        {/* Connection prompt */}
        {showPrompt && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex w-14 h-14 rounded-2xl bg-[#111318] border border-slate-700/50 items-center justify-center mb-4 shadow-lg shadow-black/50">
                  <svg className="w-7 h-7 text-red-500/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-100 tracking-tight">SSH Terminal</h1>
                <p className="text-sm text-slate-500 mt-1">Connect to a remote server</p>
              </div>

              {/* Form card */}
              <div className="bg-[#111318] border border-slate-800/60 rounded-2xl p-6 shadow-2xl shadow-black/60">
                {/* Security Advisory Notice */}
                <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-left">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200/90 leading-relaxed">
                    <p className="font-semibold text-amber-300">Remote Shell Execution Disabled</p>
                    <p className="mt-0.5 text-amber-300/70">
                      Direct shell execution is temporarily disabled for security reasons while authentication and sandboxing models are being finalized.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Host</label>
                    <input
                      type="text"
                      value={host}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHost(e.target.value)}
                      className="w-full bg-[#0a0b0f] border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                      placeholder="ssh.slogiker.si"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Port</label>
                    <input
                      type="text"
                      value={port}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPort(e.target.value)}
                      className="w-full bg-[#0a0b0f] border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                      placeholder="2222"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                    className="w-full bg-[#0a0b0f] border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    placeholder="slogiker"
                  />
                </div>
                <div className="mb-5">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && connect()}
                      className="w-full bg-[#0a0b0f] border border-slate-700/60 rounded-lg px-3 py-2 pr-10 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                      placeholder="SSH password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={connect}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600/90 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-amber-600/20"
                >
                  <ShieldAlert size={15} />
                  Connect (Disabled for Security)
                </button>

                <p className="text-center text-[11px] text-slate-600 mt-3">
                  Leave fields blank to use server-configured defaults
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Terminal chrome - top status bar */}
        {!showPrompt && (
          <div
            className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-slate-800/60 bg-[#0d0e13]"
          >
            {/* Traffic-light dots + host label */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57] hover:opacity-80 transition-opacity cursor-pointer" onClick={disconnect} title="Disconnect" />
                <span className="w-3 h-3 rounded-full bg-[#ffbc2e]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="text-[11px] font-mono text-slate-400 select-none">
                {username || 'slogiker'}@{connectedHost || 'ssh.slogiker.si'}
                {port && `:${port}`}
              </span>
            </div>

            {/* Status badge + disconnect */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${sc.badge}`}>
                {status === 'connecting' ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                )}
                {status === 'connected' ? connectedHost : sc.label}
              </span>
              <button
                onClick={disconnect}
                title="Disconnect"
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
              >
                <Unplug size={12} /> Disconnect
              </button>
            </div>
          </div>
        )}

        {/* xterm.js canvas - fills remaining space */}
        <div
          ref={termRef}
          className={`flex-1 min-h-0 ${showPrompt ? 'hidden' : 'block'}`}
          style={{ backgroundColor: '#0a0b0f' }}
        />
      </div>
    </div>
  );
}
