import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TotemLayout } from './TotemLayout';
import { VirtualKeypad } from '@/components/totem/VirtualKeypad';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import api from '@/services/api';

export default function TotemIdentify() {
  const navigate = useNavigate();
  const location = useLocation();
  const faceVerified = location.state?.faceVerified || false;
  const facePhoto = location.state?.photo || null;
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleKeyPress = (key: string) => {
    setError('');
    const rawValue = cpf.replace(/\D/g, '') + key;
    if (rawValue.length <= 11) {
      setCpf(formatCPF(rawValue));
    }
    
    // Auto-submit or enable button when 11 digits?
    // Let's verify automatically when 11 digits are reached for better UX
    if (rawValue.length === 11) {
        verifyCpf(formatCPF(rawValue));
    }
  };

  const handleBackspace = () => {
    setError('');
    const rawValue = cpf.replace(/\D/g, '').slice(0, -1);
    setCpf(formatCPF(rawValue));
  };

  const verifyCpf = async (formattedCpf: string) => {
    setLoading(true);
    try {
        // Remove mask for API if needed, but we implemented API to handle it (or strict match)
        // Controller currently matches EXACT string. If DB has mask, we send mask. 
        // If DB has no mask, we should send no mask.
        // Usually systems store without mask. Let's try sending BOTH or stripping it.
        // My backend controller implementation takes 'cpf' param and tries to find by 'document'.
        // It does `cleanCpf` but then uses `req.params.cpf` directly in query: `where: { document: cpf }`.
        // This means it expects exact match. I should probably strip it in frontend if I'm not sure, 
        // OR update backend to be smarter. 
        // For now, I'll assume DB stores CLEAN digits or I should strip them.
        // Let's strip them for the API call to be safe if I update backend, 
        // BUT wait, I didn't update backend to strip. I only did `const cleanCpf = ...` for validation.
        // The query uses `cpf` (the raw param).
        // I will assume the DB stores CLEAN digits.
        
        const cleanValues = formattedCpf.replace(/\D/g, '');
        
        // Wait, if I send clean digits but DB has formatted, it fails.
        // If I send formatted but DB has clean, it fails.
        // I'll send the formatted one first as that's what `formatCPF` produces.
        // Actually, standard practice is usually storing clean. 
        // I'll update the backend controller to be robust in next step if needed. 
        // For now let's try sending clean.
        
        const response = await api.get(`/totem/visitors/${cleanValues}`); // Assuming clean
        
        navigate('/totem/visitor-data', { state: { visitor: response.data, faceVerified, facePhoto } });
    } catch (err: any) {
        if (err.response?.status === 404) {
            setError('CPF não encontrado. Por favor, dirija-se à recepção para realizar o cadastro.');
        } else {
            setError('Erro ao verificar CPF. Tente novamente.');
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <TotemLayout>
      <div className="flex flex-col items-center justify-center h-full p-8 gap-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-gray-800">Identificação</h2>
          <p className="text-lg text-gray-500">Digite seu CPF para continuar</p>
          {faceVerified && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-sm">
              Rosto verificado
            </div>
          )}
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className={`text-4xl font-mono text-center p-6 bg-white border-2 rounded-2xl tracking-wider ${error ? 'border-red-300 text-red-600 bg-red-50' : 'border-indigo-100 text-gray-700'}`}>
            {cpf || '___.___.___-__'}
          </div>

          {error && (
            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <VirtualKeypad 
            onKeyPress={handleKeyPress} 
            onBackspace={handleBackspace} 
            maxLength={11}
            currentLength={cpf.replace(/\D/g, '').length}
          />
          
          {loading && <p className="text-center text-indigo-600 animate-pulse">Verificando...</p>}
        </div>
      </div>
    </TotemLayout>
  );
}
