import React, { Component, ErrorInfo, ReactNode } from 'react';
import { APP_LOGO_SRC } from '../data/initialData';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Error inesperado',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
  }

  private handleReset = () => {
    // Clear only temporary state or reload cleanly
    window.location.reload();
  };

  private handleFullReset = () => {
    try {
      localStorage.removeItem('shaddai_app_data_v3');
    } catch (e) {
      // ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-rose-50/40 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-pink-100 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden border-2 border-pink-200 shadow-sm bg-white">
              <img src={APP_LOGO_SRC} alt="SHADDAI" className="w-full h-full object-cover" />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Modo de Recuperación Activo</span>
              </div>
              <h2 className="font-serif-brand text-2xl font-bold text-stone-900 pt-2">
                Shaddai Papelería
              </h2>
              <p className="text-xs text-stone-500">
                Ocurrió un detalle al procesar la vista. Tus datos en el servidor están protegidos.
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-left">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                Detalle técnico:
              </span>
              <p className="text-xs font-mono text-stone-700 break-words line-clamp-3">
                {this.state.errorMessage}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-pink-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recargar Aplicación</span>
              </button>

              <button
                type="button"
                onClick={this.handleFullReset}
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                title="Limpia caché local y vuelve a sincronizar con la nube"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Restaurar Datos</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
