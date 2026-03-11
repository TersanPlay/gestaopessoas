import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, Phone, FileText, Pencil, Clock } from "lucide-react";
import { VisitorFormDialog } from "@/components/VisitorFormDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { maskDocument } from "@/lib/formatters";

interface VisitHistory {
  id: string;
  date: string;
  motive: string;
  status: 'PENDING' | 'CHECKIN' | 'CHECKOUT' | 'CANCELLED';
  accessCode?: string;
  department: { name: string };
  host?: { name: string };
}

interface VisitorDetails {
  id: string;
  name: string;
  document: string;
  phone?: string;
  photo?: string;
  consentGiven?: boolean;
  visits: VisitHistory[];
}

const VisitorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState<VisitorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchVisitorDetails();
  }, [id]);

  const fetchVisitorDetails = async () => {
    try {
      const response = await api.get(`/visitors/${id}`);
      setVisitor(response.data);
    } catch (error) {
      console.error('Failed to fetch visitor details', error);
      // Optional: navigate back or show error
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = (updatedVisitor: any) => {
    // Update local state with new details, preserving visits history
    if (visitor) {
      setVisitor({
        ...visitor,
        ...updatedVisitor,
        visits: visitor.visits // Keep existing visits
      });
    }
    setIsEditDialogOpen(false);
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

  if (loading) {
    return <div className="p-8 text-center">Carregando perfil...</div>;
  }

  if (!visitor) {
    return <div className="p-8 text-center">Visitante não encontrado.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/visitors')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-gradient">Perfil do Visitante</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        {/* Profile Card */}
        <Card className="h-fit">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 relative">
                <Avatar className="h-32 w-32 mx-auto border-4 border-muted">
                    <AvatarImage src={visitor.photo || undefined} alt={visitor.name} className="object-cover" />
                    <AvatarFallback className="text-4xl bg-muted">
                        {visitor.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            </div>
            <CardTitle className="text-xl">{visitor.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                    <span className="truncate">{maskDocument(visitor.document)}</span>
                </div>
                {visitor.phone && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0 text-green-500" />
                        <span>{visitor.phone}</span>
                    </div>
                )}
                 <div className="flex items-center gap-3 text-muted-foreground">
                    <User className="h-4 w-4 shrink-0 text-primary" />
                    <span>{visitor.visits.length} visitas totais</span>
                </div>
            </div>

            <Button className="w-full mt-4" variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar Dados
            </Button>
          </CardContent>
        </Card>

        {/* History Section */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Histórico de Visitas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {visitor.visits.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Departamento</TableHead>
                                        <TableHead>Motivo</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visitor.visits.map((visit) => (
                                        <TableRow key={visit.id}>
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {new Date(visit.date).toLocaleDateString()}
                                                <span className="text-xs text-muted-foreground block">
                                                    {new Date(visit.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono font-medium tracking-wider text-sm">
                                                    {visit.accessCode || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span>{visit.department?.name || '-'}</span>
                                                    {visit.host && <span className="text-xs text-muted-foreground">Anfitrião: {visit.host.name}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[150px]">{visit.motive}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap
                                                    ${visit.status === 'CHECKIN' ? 'bg-green-100 text-green-700' : 
                                                      visit.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                      visit.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                      'bg-gray-100 text-gray-700'}`}>
                                                    {getStatusLabel(visit.status)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhuma visita registrada para este visitante.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>

      <VisitorFormDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen}
        visitorToEdit={visitor}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default VisitorDetails;
