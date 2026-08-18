import { useState, useEffect } from 'react';
import { LogOut, Clock } from 'lucide-react';
import { logout } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ user }) {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h2 className="text-base font-medium text-gray-600">
          Welcome, <span className="text-text-primary font-bold">{user?.full_name || 'User'}</span>
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Live Clock & Date */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-slate-50 px-3.5 py-1.5 rounded-[20px] border border-gray-200">
          <Clock className="w-3.5 h-3.5 text-surface-strong" />
          <span className="text-gray-500 font-medium hidden md:inline">
            {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="w-1 h-1 rounded-full bg-gray-300 hidden md:inline"></span>
          <span className="font-mono text-gray-800 font-bold tabular-nums tracking-wide">
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':')}
          </span>
          <span className="text-[10px] text-gray-400 font-bold uppercase">WIB</span>
        </div>

        {/* Department Info */}
        {user?.department_name && (
          <div className="text-xs text-gray-600 bg-white px-3 py-1.5 rounded-[20px] border border-gray-200 flex items-center gap-1 shrink-0">
            <span className="text-gray-400 font-medium">Dept:</span>
            <span className="text-text-primary font-bold">{user.department_name}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-px h-6 bg-gray-300"></div>

        <button 
          onClick={handleLogout}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-200 rounded-[20px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-strong"
          title="Keluar"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

