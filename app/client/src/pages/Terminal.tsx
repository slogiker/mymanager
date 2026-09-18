import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/layout/Navbar';
import '@xterm/xterm/css/xterm.css';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

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
    setShowPrompt(false);
    setStatus('connecting');

    // Small delay to ensure terminal wrapper container is visible in DOM
    setTimeout(() => {
      if (!termRef.current) return;

      const term = new Terminal({
        theme: {
          background: '#020617',
          foreground: '#e2e8f0',
          cursor: '#38bdf8',
          selectionBackground: '#38bdf820',
          black: '#1e293b', brightBlack: '#475569',
          red: '#f87171', brightRed: '#ef4444',
          green: '#4ade80', brightGreen: '#22c55e',
          yellow: '#fbbf24', brightYellow: '#f59e0b',
          blue: '#60a5fa', brightBlue: '#3b82f6',
          magenta: '#c084fc', brightMagenta: '#a855f7',
          cyan: '#38bdf8', brightCyan: '#0ea5e9',
          white: '#e2e8f0', brightWhite: '#f8fafc',
        },
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 14,
        cursorBlink: true,
        allowTransparency: true,
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
        if (status !== 'connected') setStatus('connected');
      });

      socket.on('disconnect', () => setStatus('disconnected'));
      socket.on('connect_error', () => setStatus('error'));

      term.onData(d => socket.emit('data', d));

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
  }

  const statusColor: Record<ConnectionStatus, string> = { connected: 'text-emerald-400', connecting: 'text-yellow-400', disconnected: 'text-slate-500', error: 'text-red-400' };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">SSH Terminal</h1>
            <p className={`text-sm mt-1 ${statusColor[status] || 'text-slate-500'}`}>
              {status === 'connected' ? `Connected to ${host || import.meta.env.VITE_SSH_HOST || 'ssh.slogiker.si'}` : status}
            </p>
          </div>
          {!showPrompt && (
            <button onClick={disconnect} className="btn-danger text-sm py-2 px-4">Disconnect</button>
          )}
        </div>

        {showPrompt && (
          <div className="card p-8 max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Connect to SSH</h2>
            <p className="text-slate-400 text-sm mb-6">
              Connect to any remote node or localhost terminal. Leave blanks to use server environment defaults.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">SSH Host</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHost(e.target.value)}
                  className="input-field w-full"
                  placeholder="ssh.slogiker.si"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Port</label>
                <input
                  type="text"
                  value={port}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPort(e.target.value)}
                  className="input-field w-full"
                  placeholder="2222"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                className="input-field w-full"
                placeholder="slogiker"
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && connect()}
                  className="input-field w-full pr-10"
                  placeholder="SSH password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button onClick={connect} className="btn-primary w-full py-2.5">Connect</button>
          </div>
        )}

        <div
          ref={termRef}
          className={`rounded-sm overflow-hidden border border-slate-700/50 ${showPrompt ? 'hidden' : 'block'}`}
          style={{ height: 'calc(100vh - 280px)', minHeight: '400px', backgroundColor: '#020617' }}
        />
      </main>
    </div>
  );
}
