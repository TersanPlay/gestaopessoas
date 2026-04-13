import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Check, X as XIcon, LogOut, UserPlus, Calendar as CalendarIcon, User as UserIcon, Building, Hash, Search, Filter, FileDown, MessageCircle } from "lucide-react";
import { jsPDF } from "jspdf";
import { useAuth } from '../context/AuthContext';
import { VisitorFormDialog } from "@/components/VisitorFormDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateWhatsAppLink } from '../lib/formatters';

interface Visitor {
  id: string;
  name: string;
  document: string;
  phone?: string;
}

interface User {
  id: string;
  name: string;
  email: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface Visit {
  id: string;
  date: string;
  status: 'PENDING' | 'CHECKIN' | 'CHECKOUT' | 'CANCELLED';
  accessCode?: string;
  motive: string;
  visitor: Visitor;
  host?: User;
  department?: Department;
}

const Visits = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Dialog states
  const [isVisitorDialogOpen, setIsVisitorDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    type: 'CANCEL' | 'CHECKIN' | 'CHECKOUT' | null;
    visitId: string | null;
    visitName: string | null;
  }>({ isOpen: false, type: null, visitId: null, visitName: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const visitsRes = await api.get('/visits');
      console.log('Visits data:', visitsRes.data);
      if (Array.isArray(visitsRes.data)) {
        setVisits(visitsRes.data);
      } else {
        setVisits([]);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVisitorSuccess = () => {
    alert('Visitante cadastrado com sucesso!');
    setIsVisitorDialogOpen(false);
  };

  const handleStatusChange = async (id: string, status: Visit['status']) => {
    try {
      await api.patch(`/visits/${id}/status`, { status });
      // Optimistic update
      setVisits(visits.map(v => v.id === id ? { ...v, status } : v));
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Erro ao atualizar status');
    }
  };

  const handleGeneratePdf = (visit: Visit) => {
    try {
      const doc = new jsPDF();
      // Header institucional
      doc.setFillColor(36, 64, 98);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('Gestão de Visitas - Relatório', 14, 18);
      doc.setFontSize(10);
      doc.text(new Date().toLocaleString(), 170, 18, { align: 'right' });

      // Corpo
      doc.setTextColor(33, 33, 33);
      doc.setFontSize(12);
      const maskedDoc = maskDoc(visit.visitor?.document || 'N/A');
      const lines = [
        `Visitante: ${visit.visitor?.name ?? 'N/A'}`,
        `Documento: ${maskedDoc}`,
        `Departamento: ${visit.department?.name ?? 'N/A'}`,
        `Status: ${getStatusLabel(visit.status)}`,
        `Data/Hora: ${visit.date ? new Date(visit.date).toLocaleString() : 'N/A'}`,
        `Código de Acesso: ${visit.accessCode ?? 'N/A'}`,
        `Motivo: ${visit.motive ?? 'N/A'}`,
        `Responsável: ${visit.host?.name ?? 'N/A'}`
      ];

      let y = 42;
      lines.forEach((line) => {
        doc.text(line, 14, y);
        y += 9;
      });

      // Rodapé
      doc.setDrawColor(200);
      doc.line(14, 280, 196, 280);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text('Documento gerado automaticamente pelo sistema de Gestão de Visitas.', 14, 287);

      doc.save(`visita-${visit.id}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF', error);
      alert('Erro ao gerar PDF da visita');
    }
  };

  const maskDoc = (docValue: string) => {
    const digits = docValue.replace(/\D/g, '');
    if (digits.length >= 7) {
      return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
    }
    return `${docValue.substring(0, 2)}***`;
  };

  const requestConfirmation = (type: 'CANCEL' | 'CHECKIN' | 'CHECKOUT', visitId: string, visitName: string) => {
    setConfirmation({ isOpen: true, type, visitId, visitName });
  };

  const handleConfirmAction = async () => {
    if (confirmation.visitId && confirmation.type) {
      let status: Visit['status'] | null = null;
      if (confirmation.type === 'CANCEL') status = 'CANCELLED';
      else if (confirmation.type === 'CHECKIN') status = 'CHECKIN';
      else if (confirmation.type === 'CHECKOUT') status = 'CHECKOUT';
      
      if (status) await handleStatusChange(confirmation.visitId, status);
    }
    setConfirmation({ isOpen: false, type: null, visitId: null, visitName: null });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'CHECKIN': return 'text-green-600 bg-green-50 border-green-200';
      case 'CHECKOUT': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'CANCELLED': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
     switch (status) {
      case 'PENDING': return 'Pendente';
      case 'CHECKIN': return 'Em andamento';
      case 'CHECKOUT': return 'Finalizada';
      case 'CANCELLED': return 'Cancelada';
      default: return status;
    }
  };

  const canManageVisits = user?.role === 'ADMIN' || user?.role === 'RECEPCIONISTA' || user?.role === 'COLABORADOR';

  const filteredVisits = visits.filter(visit => {
    if (!visit || !visit.visitor) return false;
    
    const visitorName = visit.visitor.name || '';
    const visitorDoc = visit.visitor.document || '';
    
    const matchesSearch = 
        visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitorDoc.includes(searchTerm) ||
        (visit.accessCode && visit.accessCode.includes(searchTerm));
    
    const matchesStatus = statusFilter === 'ALL' || visit.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Gestão de Visitas</h1>
          <p className="text-muted-foreground mt-1">Gerencie o fluxo de visitantes da empresa.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => setIsVisitorDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Visitante
          </Button>
          <Button className="btn-hero" onClick={() => navigate('/visits/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Visita
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Buscar por visitante, documento ou código..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="w-full sm:w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Status" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="CHECKIN">Em andamento</SelectItem>
                    <SelectItem value="CHECKOUT">Finalizada</SelectItem>
                    <SelectItem value="CANCELLED">Cancelada</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {[1,2,3].map(i => (
                 <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
             ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVisits.map((visit) => (
            <Card key={visit.id} className="card-corporate overflow-hidden">
              <CardHeader className="pb-3 bg-muted/30">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-primary" />
                        {visit.visitor?.name || 'Visitante Desconhecido'}
                    </CardTitle>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${getStatusColor(visit.status)}`}>
                        {getStatusLabel(visit.status)}
                    </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span>Local: <span className="text-foreground font-medium">{visit.department?.name || 'N/A'}</span></span>
                </div>
                {visit.host && (
                    <div className="ml-6 text-xs text-muted-foreground">
                        Responsável: {visit.host.name}
                    </div>
                )}
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{visit.date ? new Date(visit.date).toLocaleString() : 'Data inválida'}</span>
                </div>
                {visit.accessCode && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="h-4 w-4" />
                        <span>Acesso: <span className="font-mono font-bold text-foreground tracking-wider bg-muted px-2 py-0.5 rounded">{visit.accessCode}</span></span>
                    </div>
                )}
                <div className="p-3 bg-muted/50 rounded-lg text-xs italic">
                    "{visit.motive}"
                </div>
              </CardContent>
              {canManageVisits && (
                  <CardFooter className="bg-muted/30 p-3 flex flex-wrap justify-end gap-2">
                    {visit.status !== 'CANCELLED' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                          onClick={() => {
                            const link = generateWhatsAppLink(visit.visitor.phone, {
                              visitorName: visit.visitor.name,
                              departmentName: visit.department?.name || 'Não informado',
                              date: visit.date,
                              accessCode: visit.accessCode || '',
                              motive: visit.motive
                            });
                            if (link) {
                              window.open(link, '_blank');
                            } else {
                              alert('Visitante sem número de telefone cadastrado.');
                            }
                          }}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                          onClick={() => handleGeneratePdf(visit)}
                        >
                          <FileDown className="h-3 w-3 mr-1" /> Gerar PDF
                        </Button>
                      </>
                    )}
                    {visit.status === 'PENDING' && (
                        <>
                            <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => requestConfirmation('CANCEL', visit.id, visit.visitor.name)}>
                                <XIcon className="h-3 w-3 mr-1" /> Cancelar
                            </Button>
                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white" onClick={() => requestConfirmation('CHECKIN', visit.id, visit.visitor.name)}>
                                <Check className="h-3 w-3 mr-1" /> Check-in
                            </Button>
                        </>
                    )}
                    {visit.status === 'CHECKIN' && (
                        <Button size="sm" variant="outline" className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800" onClick={() => requestConfirmation('CHECKOUT', visit.id, visit.visitor.name)}>
                            <LogOut className="h-3 w-3 mr-1" /> Check-out
                        </Button>
                    )}
                  </CardFooter>
              )}
            </Card>
          ))}
          {filteredVisits.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                <UserIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhuma visita encontrada.</p>
                {visits.length === 0 && (
                    <Button variant="link" onClick={() => navigate('/visits/new')}>Criar primeira visita</Button>
                )}
            </div>
          )}
        </div>
      )}

      {/* New Visitor Dialog */}
      <VisitorFormDialog 
        open={isVisitorDialogOpen} 
        onOpenChange={setIsVisitorDialogOpen}
        onSuccess={handleCreateVisitorSuccess}
      />

      {/* Confirmation Dialog */}
      <Dialog open={confirmation.isOpen} onOpenChange={(open) => !open && setConfirmation(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmation.type === 'CANCEL' ? 'Cancelar Visita' : 
               confirmation.type === 'CHECKIN' ? 'Confirmar Check-in' : 'Confirmar Check-out'}
            </DialogTitle>
            <DialogDescription>
              {confirmation.type === 'CANCEL' 
                ? `Tem certeza que deseja cancelar a visita de ${confirmation.visitName}?`
                : confirmation.type === 'CHECKIN'
                ? `Confirma a entrada de ${confirmation.visitName}?`
                : `Confirma a saída de ${confirmation.visitName}?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}>
              Voltar
            </Button>
            <Button 
              variant={confirmation.type === 'CANCEL' ? 'destructive' : 'default'}
              className={
                confirmation.type === 'CHECKIN' ? 'bg-green-600 hover:bg-green-700 text-white' : 
                confirmation.type === 'CHECKOUT' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
              }
              onClick={handleConfirmAction}
            >
              {confirmation.type === 'CANCEL' ? 'Confirmar Cancelamento' : 
               confirmation.type === 'CHECKIN' ? 'Confirmar Entrada' : 'Confirmar Saída'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Visits;

