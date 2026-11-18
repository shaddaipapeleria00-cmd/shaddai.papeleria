import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { APP_LOGO_SRC } from '../data/initialData';
import { Lock, Mail, KeyRound, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AdminLoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen, loginAsAdmin, setCurrentTab } = useApp();
  
  // Clean empty inputs so the owner fills them in privately
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const result = await loginAsAdmin(email, password);
      if (result.success) {
        setSuccess('¡Identificación correcta! Abriendo panel de administración...');
        setTimeout(() => {
          setIsLoginModalOpen(false);
          setCurrentTab('pedidos');
        }, 600);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError('Error de conexión al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-pink-100 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            setError(null);
            setIsLoginModalOpen(false);
          }}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 text-center bg-gradient-to-b from-pink-50/80 to-white border-b border-pink-100">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl overflow-hidden border-2 border-pink-200 shadow-md bg-white flex items-center justify-center">
            <img src={APP_LOGO_SRC} alt="SHADDAI" className="w-full h-full object-cover" />
          </div>
          <h2 className="font-serif-brand text-2xl font-bold text-stone-800">
            Acceso Administrativo
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Ingresá tus credenciales de administración de SHADDAI Papelería
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingresá tu correo..."
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-800 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-hidden transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresá tu clave..."
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-800 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-hidden transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:opacity-60 text-white rounded-xl font-semibold shadow-md shadow-pink-200 active:scale-[0.98] transition-all text-sm"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'Verificando credenciales...' : 'Ingresar al Administrador'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
