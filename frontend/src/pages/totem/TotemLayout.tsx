import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Maximize, Minimize } from 'lucide-react';

interface TotemLayoutProps {
  children: ReactNode;
  showHomeButton?: boolean;
}

export const TotemLayout = ({ children, showHomeButton = true }: TotemLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const TIMEOUT_MS = 300000; // 300s = 5 minutes

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (location.pathname !== '/totem') {
        timeoutId = setTimeout(() => {
          navigate('/totem');
        }, TIMEOUT_MS);
      }
    };

    // Events to detect activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer(); // Start timer

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [navigate, location.pathname]);

  return (
    <div 
      className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 to-violet-600" />
      
      {/* Header */}
      <header className="bg-white border-b px-8 py-6 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
            {/* Logo placeholder - replace with actual logo if available */}
            <div 
              className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xl cursor-pointer"
              onClick={toggleFullscreen}
              title="Alternar Modo Kiosk"
            >
                G
            </div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Gestão de Visitas</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-indigo-600 border-gray-200"
          >
            Dashboard
          </Button>
          {!isFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-gray-400 hover:text-indigo-600"
              title="Entrar em Tela Cheia"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          )}
          
          {showHomeButton && location.pathname !== '/totem' && (
            <Button 
              variant="ghost" 
              size="lg" 
              onClick={() => navigate('/totem')}
              className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 gap-2"
            >
              <Home className="h-6 w-6" />
              <span className="text-lg">Início</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-0">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t p-4 flex justify-between items-center text-gray-400 text-sm">
        <div className="flex-1 text-center">Toque na tela para interagir</div>
        {isFullscreen && (
           <Button
             variant="ghost"
             size="sm"
             onClick={toggleFullscreen}
             className="text-gray-300 hover:text-gray-500 h-6 px-2 text-xs absolute right-2"
           >
             <Minimize className="h-3 w-3 mr-1" /> Sair
           </Button>
        )}
      </footer>
    </div>
  );
};
