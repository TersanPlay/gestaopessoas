import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TotemLayout } from './TotemLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import api from '@/services/api';

interface Department {
    id: string;
    name: string;
}

export default function TotemVisitorData() {
  const navigate = useNavigate();
  const location = useLocation();
  const visitor = location.state?.visitor;
  const facePhoto = location.state?.facePhoto || null;
  const faceVerified = location.state?.faceVerified || false;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [motive, setMotive] = useState('');

  const motives = ['Reunião', 'Entrevista', 'Entrega', 'Visita Pessoal', 'Prestador de Serviço', 'Outros'];

  useEffect(() => {
    if (!visitor) {
        navigate('/totem/identify');
        return;
    }

    const fetchDepartments = async () => {
        try {
            const response = await api.get('/totem/departments');
            setDepartments(response.data);
        } catch (error) {
            console.error('Error fetching departments', error);
        }
    };

    fetchDepartments();
  }, [visitor, navigate]);

  const handleContinue = () => {
    if (!selectedDepartment || !motive) return;

    const departmentName = departments.find(d => d.id === selectedDepartment)?.name;

    navigate('/totem/confirm', { 
        state: { 
            visitor, 
            visitData: { 
                departmentId: selectedDepartment, 
                departmentName,
                motive 
            } 
        } 
    });
  };

  if (!visitor) return null;

  return (
    <TotemLayout>
      <div className="flex flex-col h-full max-w-4xl mx-auto p-6 w-full">
        <div className="flex-1 flex flex-col justify-center gap-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-gray-800">Confirme seus dados</h2>
                <p className="text-lg text-gray-500">Selecione o departamento e o motivo da visita</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <Label className="text-gray-500">Nome</Label>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border-2 border-indigo-100">
                                <AvatarImage src={facePhoto || visitor.photo} alt={visitor.name} className="object-cover" />
                                <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xl font-bold">
                                    <User className="h-8 w-8" />
                                </AvatarFallback>
                            </Avatar>
                            <p className="text-xl font-semibold text-gray-800">{visitor.name}</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-gray-500">CPF</Label>
                        <p className="text-xl font-semibold text-gray-800">
                            {visitor.document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')} 
                            {/* Simple mask assuming cleaned CPF */}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    {faceVerified && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200">
                            Rosto verificado com câmera do totem
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label className="text-lg">Departamento</Label>
                        <Select onValueChange={setSelectedDepartment} value={selectedDepartment}>
                            <SelectTrigger className="h-14 text-lg">
                                <SelectValue placeholder="Selecione o departamento" />
                            </SelectTrigger>
                            <SelectContent>
                                {departments.map(dept => (
                                    <SelectItem key={dept.id} value={dept.id} className="text-lg py-3">
                                        {dept.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-lg">Motivo</Label>
                        <Select onValueChange={setMotive} value={motive}>
                            <SelectTrigger className="h-14 text-lg">
                                <SelectValue placeholder="Qual o motivo da visita?" />
                            </SelectTrigger>
                            <SelectContent>
                                {motives.map(m => (
                                    <SelectItem key={m} value={m} className="text-lg py-3">
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex gap-4 pt-6">
            <Button 
                variant="outline" 
                size="lg" 
                className="flex-1 h-16 text-xl"
                onClick={() => navigate('/totem/identify')}
            >
                Voltar
            </Button>
            <Button 
                size="lg" 
                className="flex-1 h-16 text-xl bg-indigo-600 hover:bg-indigo-700"
                disabled={!selectedDepartment || !motive}
                onClick={handleContinue}
            >
                Continuar
            </Button>
        </div>
      </div>
    </TotemLayout>
  );
}
