import { useEffect, useState, useCallback } from 'react';
import { WifiOff, Clock, RefreshCw } from 'lucide-react';
import { http } from '../api/http';
import { getAuth } from '../auth/authStore';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [tokenExpiresSoon, setTokenExpiresSoon] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      await http.get('/api/v1/health', { timeout: 3000 });
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }, []);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    await checkConnection();
    setRetrying(false);
  }, [checkConnection]);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        await http.get('/api/v1/health', { timeout: 3000 });
        if (mounted) setIsConnected(true);
      } catch {
        if (mounted) setIsConnected(false);
      }
    };

    const checkTokenExpiration = () => {
      const auth = getAuth();
      if (!auth?.token) {
        if (mounted) setTokenExpiresSoon(false);
        return;
      }

      try {
        const payload = JSON.parse(atob(auth.token.split('.')[1]));
        const exp = payload.exp * 1000;
        const now = Date.now();
        const timeLeft = exp - now;

        if (mounted) {
          setTokenExpiresSoon(timeLeft > 0 && timeLeft < 5 * 60 * 1000);
        }
      } catch {
        if (mounted) setTokenExpiresSoon(false);
      }
    };

    check();
    checkTokenExpiration();

    const intervalConnection = setInterval(check, 10000);
    const intervalToken = setInterval(checkTokenExpiration, 60000);

    return () => {
      mounted = false;
      clearInterval(intervalConnection);
      clearInterval(intervalToken);
    };
  }, []);

  if (isConnected && !tokenExpiresSoon) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center">
      {!isConnected && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-lg rounded-b-lg">
          <WifiOff className="w-4 h-4 animate-pulse" />
          Sin conexión con el servidor
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="ml-2 inline-flex items-center gap-1 rounded-md bg-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/30 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Reintentando...' : 'Reintentar'}
          </button>
        </div>
      )}
      
      {isConnected && tokenExpiresSoon && (
        <div className="bg-yellow-600 text-white px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-lg rounded-b-lg">
          <Clock className="w-4 h-4 animate-pulse" />
          Tu sesión expirará pronto
          <a
            href="/login"
            className="ml-2 inline-flex items-center gap-1 rounded-md bg-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/30 transition"
          >
            Renovar sesión
          </a>
        </div>
      )}
    </div>
  );
}
