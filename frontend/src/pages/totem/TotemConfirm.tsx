import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TotemLayout } from './TotemLayout';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import api from '@/services/api';

export default function TotemConfirm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { visitor, visitData } = location.state || {};
  const [loading, setLoading] = useState(false);

  if (!visitor || !visitData) {
      navigate('/totem');
      return null;
  }

  const handleConfirm = async () => {
    setLoading(true);
    try {
        const response = await api.post('/totem/visits', {
            visitorId: visitor.id,
            departmentId: visitData.departmentId,
            motive: visitData.motive
        });
        
        navigate('/totem/success', { state: { visit: response.data } });
    } catch (error) {
        console.error('Error creating visit', error);
        alert('Erro ao confirmar visita. Tente novamente.');
        setLoading(false);
    }
  };

  return (
    <TotemLayout>
      <div className="flex flex-col h-full max-w-4xl mx-auto p-6 w-full">
        <div className="flex-1 flex flex-col justify-center gap-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-gray-800">Confirmação</h2>
                <p className="text-lg text-gray-500">Verifique os dados antes de confirmar</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Visitante</h3>
                        <p className="text-2xl font-bold text-gray-800">{visitor.name}</p>
                    </div>
                    
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Data e Hora</h3>
                        <p className="text-2xl font-bold text-gray-800">
                            {new Date().toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-gray-500">
                            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Departamento</h3>
                        <p className="text-2xl font-bold text-indigo-600">{visitData.departmentName}</p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Motivo</h3>
                        <p className="text-2xl font-bold text-indigo-600">{visitData.motive}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex gap-4 pt-6">
            <Button 
                variant="outline" 
                size="lg" 
                className="flex-1 h-16 text-xl"
                onClick={() => navigate(-1)}
                disabled={loading}
            >
                Voltar
            </Button>
            <Button 
                size="lg" 
                className="flex-1 h-16 text-xl bg-green-600 hover:bg-green-700"
                onClick={handleConfirm}
                disabled={loading}
            >
                {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Confirmar Visita'}
            </Button>
        </div>
      </div>
    </TotemLayout>
  );
}
