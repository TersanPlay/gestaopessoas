import { useNavigate } from 'react-router-dom';
import { CalendarCheck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TotemLayout } from './TotemLayout';

export default function TotemWelcome() {
  const navigate = useNavigate();

  return (
    <TotemLayout showHomeButton={false}>
      <div className="flex flex-col items-center justify-center h-full p-8 gap-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-gray-800">Bem-vindo!</h2>
          <p className="text-xl text-gray-500">Escolha uma opção para continuar</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <Button
            className="h-64 flex flex-col gap-6 text-2xl hover:scale-105 transition-transform bg-white hover:bg-indigo-50 border-2 border-indigo-100 shadow-xl rounded-3xl group"
            variant="ghost"
            onClick={() => navigate('/totem/face')}
          >
            <div className="p-6 bg-indigo-100 rounded-full group-hover:bg-indigo-600 transition-colors">
              <CalendarCheck className="h-16 w-16 text-indigo-600 group-hover:text-white" />
            </div>
            <span className="font-semibold text-gray-700 group-hover:text-indigo-700">Agendar Visita</span>
          </Button>

          <Button
            className="h-64 flex flex-col gap-6 text-2xl hover:scale-105 transition-transform bg-white hover:bg-orange-50 border-2 border-orange-100 shadow-xl rounded-3xl group"
            variant="ghost"
            onClick={() => navigate('/totem/finish')}
          >
            <div className="p-6 bg-orange-100 rounded-full group-hover:bg-orange-600 transition-colors">
              <LogOut className="h-16 w-16 text-orange-600 group-hover:text-white" />
            </div>
            <span className="font-semibold text-gray-700 group-hover:text-orange-700">Finalizar Visita</span>
          </Button>
        </div>
      </div>
    </TotemLayout>
  );
}
