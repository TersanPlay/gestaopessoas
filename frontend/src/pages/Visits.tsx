import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Check, X as XIcon, LogOut, UserPlus, Calendar, User as UserIcon, Building } from "lucide-react";
import { useAuth } from '../context/AuthContext';

interface Visitor {
  id: string;
  name: string;
  document: string;
  phone?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Visit {
  id: string;
  date: string;
  status: 'PENDING' | 'CHECKIN' | 'CHECKOUT' | 'CANCELLED';
  motive: string;
  visitor: Visitor;
  host: User;
  department?: {
    name: string;
  };
}

const Visits = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false);
  const [isVisitorDialogOpen, setIsVisitorDialogOpen] = useState(false);

  // Form states
  const [newVisit, setNewVisit] = useState({
    visitorId: '',
    hostId: '',
    date: '',
    motive: ''
  });

  const [newVisitor, setNewVisitor] = useState({
    name: '',
    document: '',
    phone: '',
    photo: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitsRes, visitorsRes, usersRes] = await Promise.all([
        api.get('/visits'),
        api.get('/visitors'),
        api.get('/users')
      ]);
      setVisits(visitsRes.data);
      setVisitors(visitorsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/visits', newVisit);
      await fetchData();
      setIsVisitDialogOpen(false);
      setNewVisit({ visitorId: '', hostId: '', date: '', motive: '' });
    } catch (error) {
      console.error('Failed to create visit', error);
      alert('Erro ao criar visita');
    }
  };

  const handleCreateVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/visitors', newVisitor);
      const visitorsRes = await api.get('/visitors');
      setVisitors(visitorsRes.data);
      setIsVisitorDialogOpen(false);
      setNewVisitor({ name: '', document: '', phone: '', photo: '' });
      // Optionally auto-select the new visitor
      // setNewVisit(prev => ({ ...prev, visitorId: createdVisitor.id }));
    } catch (error) {
      console.error('Failed to create visitor', error);
      alert('Erro ao criar visitante. Verifique se o documento já existe.');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.patch(`/visits/${id}/status`, { status });
      // Optimistic update or refetch
      setVisits(visits.map(v => v.id === id ? { ...v, status: status as any } : v));
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Erro ao atualizar status');
    }
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

  const canManageVisits = user?.role === 'ADMIN' || user?.role === 'RECEPCIONISTA';

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
          <Button className="btn-hero" onClick={() => setIsVisitDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Visita
          </Button>
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
          {visits.map((visit) => (
            <Card key={visit.id} className="card-corporate overflow-hidden">
              <CardHeader className="pb-3 bg-muted/30">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-primary" />
                        {visit.visitor.name}
                    </CardTitle>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${getStatusColor(visit.status)}`}>
                        {getStatusLabel(visit.status)}
                    </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span>Host: <span className="text-foreground font-medium">{visit.host.name}</span></span>
                </div>
                {visit.department && (
                    <div className="ml-6 text-xs text-muted-foreground">
                        Depto: {visit.department.name}
                    </div>
                )}
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(visit.date).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-xs italic">
                    "{visit.motive}"
                </div>
              </CardContent>
              {canManageVisits && (
                  <CardFooter className="bg-muted/30 p-3 flex justify-end gap-2">
                    {visit.status === 'PENDING' && (
                        <>
                            <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => handleStatusChange(visit.id, 'CANCELLED')}>
                                <XIcon className="h-3 w-3 mr-1" /> Cancelar
                            </Button>
                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusChange(visit.id, 'CHECKIN')}>
                                <Check className="h-3 w-3 mr-1" /> Check-in
                            </Button>
                        </>
                    )}
                    {visit.status === 'CHECKIN' && (
                        <Button size="sm" variant="outline" className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800" onClick={() => handleStatusChange(visit.id, 'CHECKOUT')}>
                            <LogOut className="h-3 w-3 mr-1" /> Check-out
                        </Button>
                    )}
                  </CardFooter>
              )}
            </Card>
          ))}
          {visits.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                <UserIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhuma visita encontrada.</p>
                <Button variant="link" onClick={() => setIsVisitDialogOpen(true)}>Criar primeira visita</Button>
            </div>
          )}
        </div>
      )}

      {/* New Visit Dialog */}
      <Dialog open={isVisitDialogOpen} onOpenChange={setIsVisitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Visita</DialogTitle>
            <DialogDescription>Agende uma nova visita.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateVisit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visitor">Visitante</Label>
              <select
                id="visitor"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newVisit.visitorId}
                onChange={(e) => setNewVisit({ ...newVisit, visitorId: e.target.value })}
                required
              >
                <option value="">Selecione um visitante</option>
                {visitors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} - {v.document}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="host">Anfitrião (Host)</Label>
              <select
                id="host"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newVisit.hostId}
                onChange={(e) => setNewVisit({ ...newVisit, hostId: e.target.value })}
                required
              >
                <option value="">Selecione um anfitrião</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data e Hora</Label>
              <Input
                id="date"
                type="datetime-local"
                value={newVisit.date}
                onChange={(e) => setNewVisit({ ...newVisit, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motive">Motivo</Label>
              <Input
                id="motive"
                value={newVisit.motive}
                onChange={(e) => setNewVisit({ ...newVisit, motive: e.target.value })}
                required
                placeholder="Ex: Reunião de projeto"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsVisitDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Agendar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Visitor Dialog */}
      <Dialog open={isVisitorDialogOpen} onOpenChange={setIsVisitorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Visitante</DialogTitle>
            <DialogDescription>Cadastre um novo visitante no sistema.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateVisitor} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="v-name">Nome Completo</Label>
              <Input
                id="v-name"
                value={newVisitor.name}
                onChange={(e) => setNewVisitor({ ...newVisitor, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="v-document">Documento (CPF/RG)</Label>
              <Input
                id="v-document"
                value={newVisitor.document}
                onChange={(e) => setNewVisitor({ ...newVisitor, document: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="v-phone">Telefone</Label>
              <Input
                id="v-phone"
                value={newVisitor.phone}
                onChange={(e) => setNewVisitor({ ...newVisitor, phone: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsVisitorDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Cadastrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Visits;
