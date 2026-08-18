import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { request } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Force clear inputs on mount to combat browser autofill
  useEffect(() => {
    const timer = setTimeout(() => {
      setUsername('');
      setPassword('');
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await request('/auth/login', {
        method: 'POST',
        body: { username, password }
      });

      // Save credentials & menus
      localStorage.setItem('access_token', res.data.access_token);
      localStorage.setItem('refresh_token', res.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('menus', JSON.stringify(res.data.menus));
      localStorage.setItem('permissions', JSON.stringify(res.data.permissions));

      // Dispatch event to re-render App state
      window.dispatchEvent(new Event('auth-change'));
      
      // Redirect
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Username atau password salah.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white relative px-4 select-none">
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-[20px] p-8 shadow-md border border-gray-200">
          
          {/* Logo / Title */}
          <div className="flex flex-col items-center mb-8">
            <img src="/logo-full.png" alt="Multikarya Sinardinamika" className="h-14 object-contain mb-4 select-none" />
            <h1 className="text-base font-black text-slate-800 tracking-widest text-center m-0 leading-none uppercase">HR Daily Monitoring</h1>
            <p className="text-xs text-blue-600 mt-1 tracking-widest uppercase font-semibold">Administration System</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-[20px]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* Fake fields to prevent browser auto-fill */}
            <input type="text" name="fakeusernameremembered" className="hidden" aria-hidden="true" />
            <input type="password" name="fakepasswordremembered" className="hidden" aria-hidden="true" />

            {/* Username Input */}
            <div className="space-y-2">
               <label className="text-xs font-medium text-gray-700 tracking-wider">Username</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-surface-strong transition-colors">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-300 rounded-[20px] text-text-primary placeholder-gray-400 focus:outline-none focus:border-surface-strong focus:ring-1 focus:ring-surface-strong/30 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 tracking-wider">Password</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-surface-strong transition-colors">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-300 rounded-[20px] text-text-primary placeholder-gray-400 focus:outline-none focus:border-surface-strong focus:ring-1 focus:ring-surface-strong/30 transition-all duration-200"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3.5 bg-surface-strong text-white font-medium rounded-[20px] hover:bg-[#0c2a8c] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-surface-strong/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-surface-strong"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sedang Masuk...</span>
                </>
              ) : (
                <span>Masuk</span>
              )}
            </button>
          </form>

          {/* Seed accounts notice */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="text-[10px] text-gray-500 space-y-1 bg-surface-muted p-4 rounded-[20px] border border-gray-200 text-center font-medium">
              <p className="text-gray-700 font-bold mb-1 uppercase tracking-wider">Akun Demo (MySQL Seeded)</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-left text-gray-500 text-[9.5px]">
                <p>Admin: <span className="text-gray-800 font-mono">admin / admin123</span></p>
                <p>HRD: <span className="text-gray-800 font-mono">hrd_user / password123</span></p>
                <p>Admin Dept: <span className="text-gray-800 font-mono">admin_dept / password123</span></p>
                <p>Security: <span className="text-gray-800 font-mono">security_user / password123</span></p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
