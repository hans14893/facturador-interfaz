import { useEffect, useState } from 'react';
import { WifiOff, Clock } from 'lucide-react';
import { http } from '../api/http';
import { getAuth } from '../auth/authStore';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [tokenExpiresSoon, setTokenExpiresSoon] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Verificar conexión cada 10 segundos (más frecuente para detectar reconexión)
    const checkConnection = async () => {
      try {
        await http.get('/api/v1/health', { timeout: 3000 });
        if (mounted) {
          setIsConnected(true);
        }
      } catch {
        if (mounted) {
          setIsConnected(false);
        }
      }
    };

    // Verificar expiración del token
    const checkTokenExpiration = () => {
      const auth = getAuth();
      if (!auth?.token) {
        if (mounted) setTokenExpiresSoon(false);
        return;
      }

      try {
        // Decodificar JWT payload (segunda parte del token)
        const payload = JSON.parse(atob(auth.token.split('.')[1]));
        const exp = payload.exp * 1000; // Convertir a milisegundos
        const now = Date.now();
        const timeLeft = exp - now;

        // Avisar si quedan menos de 5 minutos
        if (mounted) {
          setTokenExpiresSoon(timeLeft > 0 && timeLeft < 5 * 60 * 1000);
        }
      } catch {
        // Token inválido
        if (mounted) {
          setTokenExpiresSoon(false);
        }
      }
    };

    // Ejecutar inmediatamente
    checkConnection();
    checkTokenExpiration();

    // Intervalos
    const intervalConnection = setInterval(checkConnection, 10000); // Cada 10 segundos
    const intervalToken = setInterval(checkTokenExpiration, 60000); // Cada minuto

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
        <div className="bg-red-600 text-white px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-lg">
          <WifiOff className="w-4 h-4 animate-pulse" />
          Sin conexión con el servidor
        </div>
      )}
      
      {isConnected && tokenExpiresSoon && (
        <div className="bg-yellow-600 text-white px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-lg">
          <Clock className="w-4 h-4 animate-pulse" />
          Tu sesión expirará pronto
        </div>
      )}
    </div>
  );
}
