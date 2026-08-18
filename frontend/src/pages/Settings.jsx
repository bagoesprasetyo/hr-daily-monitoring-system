import { useState } from 'react';
import { request } from '../services/api';
import { 
  Settings as SettingsIcon, Shield, User, Key, Camera, 
  CheckCircle, AlertCircle, Loader2 
} from 'lucide-react';

export default function Settings({ user }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Profile info state initialized from props
  const [profilePhoto, setProfilePhoto] = useState(localStorage.getItem('profile_photo') || null);
  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi password baru tidak sesuai.');
      return;
    }

    setLoading(true);
    try {
      await request('/users/change-password', {
        method: 'PUT',
        body: {
          current_password: oldPassword,
          new_password: newPassword
        }
      });
      setSuccessMsg('Password berhasil diperbarui.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengubah password.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await request('/users/profile', {
        method: 'PUT',
        body: {
          email,
          full_name: fullName
        }
      });
      
      // Update local storage user information
      const updatedUser = { ...user, email: res.data.email, full_name: res.data.full_name };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Dispatch event to notify layout/navbar
      window.dispatchEvent(new Event('auth-change'));
      
      setSuccessMsg('Informasi profil berhasil diperbarui.');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memperbarui profil.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result);
        localStorage.setItem('profile_photo', reader.result);
        setSuccessMsg('Foto profil berhasil diubah.');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-4xl mx-auto w-full">
      {/* Title */}
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-black text-text-primary m-0 tracking-wide font-sans">PENGATURAN AKUN</h1>
        <p className="text-xs text-gray-500 mt-1">Ubah kata sandi, foto profil, dan informasi data diri Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Card: Profile & Photo */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-[20px] p-6 border border-gray-200 bg-white text-center flex flex-col items-center">
            
            {/* Photo Upload Container */}
            <div className="relative group mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-surface-muted flex items-center justify-center text-gray-500 font-bold text-3xl">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  user?.full_name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-surface-strong hover:bg-[#0c2a8c] text-white flex items-center justify-center cursor-pointer shadow-lg transition-transform group-hover:scale-105">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>

            <h3 className="text-base font-bold text-text-primary truncate max-w-full">{fullName}</h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{user?.role?.replace(/_/g, ' ')}</span>

            <div className="w-full border-t border-gray-200/80 my-4"></div>

            <div className="w-full space-y-3 text-left">
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Username</span>
                <p className="text-xs text-text-primary font-mono mt-0.5">{user?.username || 'user'}</p>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Departemen</span>
                <p className="text-xs text-text-primary mt-0.5">{user?.department_name || '-'}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Cards: Password & Info Form */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Status Message */}
          {successMsg && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-600 text-sm rounded-[20px]">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-[20px]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Password */}
          <div className="bg-white rounded-[20px] p-6 border border-gray-200 bg-white space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200/80 pb-3">
              <Key className="w-5 h-5 text-surface-strong" />
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Ubah Password</h3>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold">Password Lama</label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan password saat ini"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-muted/60 border border-gray-200 rounded-[20px] text-text-primary placeholder-gray-400ate-600 focus:outline-none focus:border-surface-strong transition text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-semibold">Password Baru</label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan password baru"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-muted/60 border border-gray-200 rounded-[20px] text-text-primary placeholder-gray-400ate-600 focus:outline-none focus:border-surface-strong transition text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-semibold">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    required
                    placeholder="Ulangi password baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-muted/60 border border-gray-200 rounded-[20px] text-text-primary placeholder-gray-400ate-600 focus:outline-none focus:border-surface-strong transition text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-surface-strong hover:bg-[#0c2a8c] active:scale-[0.98] text-white font-bold rounded-[20px] transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 cursor-pointer disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Password</span>
                )}
              </button>
            </form>
          </div>

          {/* Profile Info Form */}
          <div className="bg-white rounded-[20px] p-6 border border-gray-200 bg-white space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200/80 pb-3">
              <User className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Informasi Profil</h3>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-semibold">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-muted/60 border border-gray-200 rounded-[20px] text-text-primary focus:outline-none focus:border-surface-strong transition text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-semibold">Alamat Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-muted/60 border border-gray-200 rounded-[20px] text-text-primary focus:outline-none focus:border-surface-strong transition text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-surface-strong hover:bg-[#0c2a8c] active:scale-[0.98] text-white font-bold rounded-[20px] transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 cursor-pointer disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Perubahan</span>
                )}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
