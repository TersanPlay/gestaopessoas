import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TotemLayout } from './TotemLayout';
import { VirtualKeypad } from '@/components/totem/VirtualKeypad';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Search, LogOut, Check } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import api from '@/services/api';
import { PrinterService } from '@/services/printerService';

interface Visit {
    id: string;
    visitor: {
        name: string;
        document: string;
        photo?: string;
    };
    department?: {
        name: string;
    };
    date: string;
    status: string;
    motive?: string;
    accessCode?: string;
    checkOutTime?: string;
}

export default function TotemFinish() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [finishedVisit, setFinishedVisit] = useState<Visit | null>(null);
  const printedRef = useRef(false);

  useEffect(() => {
    const processFinish = async () => {
        if (success && finishedVisit && !printedRef.current) {
            printedRef.current = true;
            try {
                const blobUrl = await PrinterService.generateTicket({
                    type: 'finish',
                    visitorName: finishedVisit.visitor?.name || 'Visitante',
                    department: finishedVisit.department?.name,
                    motive: finishedVisit.motive,
                    date: finishedVisit.date,
                    checkoutTime: finishedVisit.checkOutTime
                });
                PrinterService.printBlob(blobUrl);
                
                // Navigate back after a delay
                setTimeout(() => navigate('/totem'), 5000);
            } catch (error) {
                console.error('Failed to generate receipt:', error);
                // Even if print fails, navigate back
                setTimeout(() => navigate('/totem'), 5000);
            }
        }
    };
    processFinish();
  }, [success, finishedVisit, navigate]);

  const handleKeyPress = (key: string) => {
    setError('');
    // Limit to reasonable length (CPF 11, Access Code 6) - let's say 14 for mask safety
    if (input.length < 14) {
        setInput(prev => prev + key);
    }
  };

  const handleBackspace = () => {
    setError('');
    setInput(prev => prev.slice(0, -1));
  };

  const handleSearch = async () => {
    if (!input) return;
    setLoading(true);
    setError('');
    setActiveVisits([]);

    try {
        const response = await api.get(`/totem/visits/active/${input}`);
        if (response.data.length === 0) {
            setError('Nenhuma visita ativa encontrada para este identificador.');
        } else {
            setActiveVisits(response.data);
        }
    } catch (error) {
         console.error('Erro ao buscar visitas ativas', error);
         setError('Erro ao buscar visitas. Tente novamente.');
    } finally {
        setLoading(false);
    }
  };

  const handleFinishVisit = async (visitId: string) => {
    setLoading(true);
    try {
        const response = await api.post('/totem/visits/finish', { id: visitId });
        setFinishedVisit(response.data);
        setSuccess(true);
    } catch (error) {
        console.error('Erro ao finalizar visita', error);
        setError('Erro ao finalizar visita. Tente novamente.');
    } finally {
        setLoading(false);
    }
  };

  if (success) {
      return (
        <TotemLayout showHomeButton={false}>
          <div className="flex flex-col items-center justify-center h-full p-8 gap-8 animate-in zoom-in-95">
            <div className="h-32 w-32 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-20 w-20 text-green-600" />
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-gray-800">Visita Finalizada!</h2>
              <p className="text-xl text-gray-500">Obrigado pela visita.</p>
              <p className="text-sm text-gray-400">Imprimindo comprovante...</p>
            </div>
          </div>
        </TotemLayout>
      );
  }

  return (
    <TotemLayout>
      <div className="flex flex-col items-center justify-center h-full p-8 gap-8">
        
        {!activeVisits.length ? (
            <>
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-gray-800">Finalizar Visita</h2>
                  <p className="text-lg text-gray-500">Digite seu CPF ou Código de Acesso</p>
                </div>

                <div className="w-full max-w-md space-y-8">
                  <div className="flex gap-2">
                      <div className={`flex-1 text-4xl font-mono text-center p-6 bg-white border-2 rounded-2xl tracking-wider ${error ? 'border-red-300 text-red-600 bg-red-50' : 'border-orange-100 text-gray-700'}`}>
                        {input || <span className="text-gray-300">Digite aqui</span>}
                      </div>
                      <Button onClick={handleSearch} disabled={!input || loading} className="h-auto w-24 rounded-2xl bg-indigo-600 hover:bg-indigo-700">
                          {loading ? <span className="animate-spin">⌛</span> : <Search className="h-8 w-8" />}
                      </Button>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Erro</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <VirtualKeypad 
                    onKeyPress={handleKeyPress} 
                    onBackspace={handleBackspace}
                    maxLength={14}
                    currentLength={input.length}
                  />
                </div>
            </>
        ) : (
            <div className="w-full max-w-2xl space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
                <div className="text-center space-y-2 mb-8">
                  <h2 className="text-3xl font-bold text-gray-800">Visitas Encontradas</h2>
                  <p className="text-lg text-gray-500">Selecione a visita para finalizar</p>
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto p-2">
                    {activeVisits.map((visit) => (
                        <Card key={visit.id} className="border-2 hover:border-indigo-200 transition-colors">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-xl text-gray-800">{visit.visitor.name}</h3>
                                    <p className="text-gray-500">{visit.department?.name || 'Sem departamento'}</p>
                                    <p className="text-sm text-gray-400">Entrada: {new Date(visit.date).toLocaleTimeString()}</p>
                                </div>
                                <Button 
                                    onClick={() => handleFinishVisit(visit.id)} 
                                    size="lg"
                                    className="bg-green-600 hover:bg-green-700 text-white gap-2 h-14 px-6 text-lg rounded-xl"
                                >
                                    <Check className="h-6 w-6" />
                                    Finalizar
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-center pt-8">
                    <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={() => {
                            setActiveVisits([]);
                            setInput('');
                        }}
                        className="border-2 text-gray-500 gap-2 h-14 px-8 text-lg rounded-xl hover:bg-gray-100"
                    >
                        <LogOut className="h-6 w-6" />
                        Sair / Voltar
                    </Button>
                </div>
            </div>
        )}
      </div>
    </TotemLayout>
  );
}

