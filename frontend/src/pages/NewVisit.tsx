import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { VisitorFormDialog } from "@/components/VisitorFormDialog";
import { useAuth } from '../context/AuthContext';
import { cn } from "@/lib/utils";

interface Visitor {
  id: string;
  name: string;
  document: string;
  phone?: string;
}

interface Department {
  id: string;
  name: string;
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const NewVisit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isVisitorDialogOpen, setIsVisitorDialogOpen] = useState(false);
  const [isVisitorPopoverOpen, setIsVisitorPopoverOpen] = useState(false);
  const [visitorSearch, setVisitorSearch] = useState('');

  // Form states
  const [newVisit, setNewVisit] = useState({
    visitorId: '',
    departmentId: '',
    date: '',
    motive: ''
  });
  
  const handleDepartmentChange = (value: string) => {
    if (user?.role === 'COLABORADOR') return;
    setNewVisit(prev => ({ ...prev, departmentId: value }));
  };

  useEffect(() => {
    fetchData();
    if (user?.role === 'COLABORADOR' && user.departmentId) {
        setNewVisit(prev => ({ ...prev, departmentId: user.departmentId! }));
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [visitorsRes, departmentsRes] = await Promise.all([
        api.get('/visitors'),
        api.get('/departments')
      ]);
      setVisitors(visitorsRes.data);
      setDepartments(departmentsRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newVisit.visitorId) {
      alert('Selecione um visitante');
      return;
    }

    try {
      await api.post('/visits', newVisit);
      navigate('/visits');
    } catch (error) {
      console.error('Failed to create visit', error);
      alert('Erro ao criar visita');
    }
  };

  const handleCreateVisitorSuccess = async (createdVisitor: Visitor) => {
      // Refresh visitors list to include the new one
      const visitorsRes = await api.get('/visitors');
      setVisitors(visitorsRes.data);
      
      // Auto-select the new visitor
      setNewVisit(prev => ({ ...prev, visitorId: createdVisitor.id }));
      
      setIsVisitorDialogOpen(false);
  };

  const selectedVisitor = visitors.find((v) => v.id === newVisit.visitorId);
  const visitorSearchTerm = normalizeText(visitorSearch.trim());
  const visitorSearchDigits = onlyDigits(visitorSearch);
  const filteredVisitors = visitors.filter((v) =>
    normalizeText(v.name).includes(visitorSearchTerm) ||
    (visitorSearchDigits.length > 0 && onlyDigits(v.document).includes(visitorSearchDigits))
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/visits')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Nova Visita</h1>
          <p className="text-muted-foreground mt-1">Agende uma nova visita.</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        <form onSubmit={handleCreateVisit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
                <Label htmlFor="visitor">Visitante</Label>
                <Button 
                    type="button" 
                    variant="link" 
                    className="h-auto p-0 text-xs" 
                    onClick={() => setIsVisitorDialogOpen(true)}
                >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Novo Visitante
                </Button>
            </div>
            <Popover
              open={isVisitorPopoverOpen}
              onOpenChange={(open) => {
                setIsVisitorPopoverOpen(open);
                if (!open) setVisitorSearch('');
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  id="visitor"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isVisitorPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate text-left">
                    {selectedVisitor
                      ? `${selectedVisitor.name} - ${selectedVisitor.document}`
                      : 'Selecione um visitante'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="border-b p-2">
                  <Input
                    value={visitorSearch}
                    onChange={(e) => setVisitorSearch(e.target.value)}
                    placeholder="Pesquisar visitante por nome ou CPF..."
                  />
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  {filteredVisitors.length === 0 ? (
                    <p className="px-2 py-4 text-sm text-muted-foreground">
                      Nenhum visitante encontrado.
                    </p>
                  ) : (
                    filteredVisitors.map((v) => (
                      <Button
                        key={v.id}
                        type="button"
                        variant="ghost"
                        className={cn(
                          "h-auto w-full justify-start px-2 py-2 text-left font-normal",
                          newVisit.visitorId === v.id && "bg-accent"
                        )}
                        onClick={() => {
                          setNewVisit((prev) => ({ ...prev, visitorId: v.id }));
                          setVisitorSearch('');
                          setIsVisitorPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            newVisit.visitorId === v.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{v.name}</span>
                      </Button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Select
              value={newVisit.departmentId}
              onValueChange={handleDepartmentChange}
              required
            >
              <SelectTrigger 
                id="department" 
                disabled={user?.role === 'COLABORADOR'}
              >
                <SelectValue placeholder="Selecione um departamento" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motive">Motivo</Label>
            <Select
              value={newVisit.motive}
              onValueChange={(value) => setNewVisit({ ...newVisit, motive: value })}
              required
            >
              <SelectTrigger id="motive">
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asistencia social">Asistencia social</SelectItem>
                <SelectItem value="Participar de audiências">Participar de audiências</SelectItem>
                <SelectItem value="Protocolar pedidos">Protocolar pedidos</SelectItem>
                <SelectItem value="Reclamações e denúncias">Reclamações e denúncias</SelectItem>
                <SelectItem value="Reunião">Reunião</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data e Hora</Label>
            <DateTimePicker 
              value={newVisit.date ? new Date(newVisit.date) : undefined}
              onChange={(date) => setNewVisit({ ...newVisit, date: date.toISOString() })}
              className="border rounded-md w-full max-w-full"
            />
            <input 
              type="hidden" 
              required 
              value={newVisit.date} 
              onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Por favor, selecione data e hora.')}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/visits')}>Cancelar</Button>
            <Button type="submit" className="btn-hero">Agendar Visita</Button>
          </div>
        </form>
      </div>

      {/* New Visitor Dialog */}
      <VisitorFormDialog 
        open={isVisitorDialogOpen} 
        onOpenChange={setIsVisitorDialogOpen}
        onSuccess={handleCreateVisitorSuccess}
      />
    </div>
  );
};

export default NewVisit;
