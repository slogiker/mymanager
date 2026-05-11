import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
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
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [password, setPassword] = useState<string>('');
  const [showPrompt, setShowPrompt] = useState<boolean>(true);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      termInstance.current?.dispose();
    };
  }, []);

  function connect() {
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
      socket.emit('ssh-connect', { password });
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
    term.onResize(({ rows, cols }) => socket.emit('resize', { rows, cols }));

    setShowPrompt(false);
    setStatus('connecting');

    return () => window.removeEventListener('resize', handleResize);
  }

  function disconnect() {
    socketRef.current?.disconnect();
    termInstance.current?.dispose();
    termInstance.current = null;
    setStatus('disconnected');
    setShowPrompt(true);
    setPassword('');
  }

  const statusColor: Record<ConnectionStatus, string> = { connected: 'text-emerald-400', connecting: 'text-yellow-400', disconnected: 'text-slate-500', error: 'text-red-400' };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">SSH Terminal</h1>
            <p className={`text-sm mt-1 ${statusColor[status] || 'text-slate-500'}`}>
              {status === 'connected' ? `Connected to ${import.meta.env.VITE_SSH_HOST || 'ssh.slogiker.si'}` : status}
            </p>
          </div>
          {!showPrompt && (
            <button onClick={disconnect} className="btn-danger text-sm">Disconnect</button>
          )}
        </div>

        {showPrompt && (
          <div className="card p-8 max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Connect to SSH</h2>
            <p className="text-slate-400 text-sm mb-4">
              Connecting as <span className="text-slate-200 font-mono">{user?.username}</span> to <span className="font-mono text-cyan-400">ssh.slogiker.si</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Password (optional — uses env default if blank)</label>
              <input
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && connect()}
                className="input-field w-full"
                placeholder="SSH password"
                autoFocus
              />
            </div>
            <button onClick={connect} className="btn-primary w-full">Connect</button>
          </div>
        )}

        <div
          ref={termRef}
          className={`rounded-xl overflow-hidden border border-slate-700/50 ${showPrompt ? 'hidden' : 'block'}`}
          style={{ height: 'calc(100vh - 280px)', minHeight: '400px', backgroundColor: '#020617' }}
        />
      </main>
    </div>
  );
}
