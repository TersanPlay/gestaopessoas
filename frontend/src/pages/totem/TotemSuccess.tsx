import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TotemLayout } from './TotemLayout';
import { CheckCircle2, Printer } from 'lucide-react';
import { PrinterService } from '@/services/printerService';

export default function TotemSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const visit = location.state?.visit;
  const [countdown, setCountdown] = useState(10);
  const printedRef = useRef(false);

  // Auto-print effect
  useEffect(() => {
    const printReceipt = async () => {
      if (visit && !printedRef.current) {
        printedRef.current = true;
        try {
          const blobUrl = await PrinterService.generateTicket({
            type: 'scheduling',
            visitorName: visit.visitor?.name || 'Visitante',
            department: visit.department?.name,
            motive: visit.motive,
            date: visit.date,
            accessCode: visit.accessCode
          });
          PrinterService.printBlob(blobUrl);
        } catch (error) {
          console.error('Failed to generate receipt:', error);
        }
      }
    };

    printReceipt();
  }, [visit]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
        setCountdown(prev => {
            if (prev <= 1) {
                clearInterval(timer);
                navigate('/totem');
                return 0;
            }
            return prev - 1;
        });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  if (!visit) return null;

  return (
    <TotemLayout showHomeButton={false}>
      <div className="flex flex-col items-center justify-center h-full p-8 gap-8 animate-in zoom-in-95 duration-500">
        <div className="h-32 w-32 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-20 w-20 text-green-600" />
        </div>
        
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-gray-800">Visita Confirmada!</h2>
          <p className="text-xl text-gray-500">Por favor, retire seu comprovante.</p>
        </div>

        {visit.accessCode && (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-8 rounded-xl text-center space-y-2">
                <p className="text-sm font-medium text-gray-500 uppercase">Seu Código de Acesso</p>
                <p className="text-5xl font-mono font-bold text-indigo-600 tracking-widest">{visit.accessCode}</p>
            </div>
        )}

        <div className="flex items-center gap-2 text-gray-400 mt-8">
            <Printer className="h-5 w-5 animate-bounce" />
            <span>Imprimindo comprovante...</span>
        </div>

        <p className="text-gray-400 text-sm absolute bottom-8">
            Voltando ao início em {countdown}s
        </p>
      </div>
    </TotemLayout>
  );
}
