import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, User, Phone, FileText, Search, Eye, Download } from 'lucide-react';
import { VisitorFormDialog } from "@/components/VisitorFormDialog";
import { maskDocument } from "@/lib/formatters";
import { toCsv } from "@/lib/csv";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Visitor {
  id: string;
  name: string;
  document: string;
  phone?: string;
  photo?: string;
  consentGiven?: boolean;
}

const initials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Visitors = () => {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentVisitor, setCurrentVisitor] = useState<Partial<Visitor>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('ALL');
  const [consentFilter, setConsentFilter] = useState('ALL');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/visitors');
      setVisitors(response.data);
    } catch (error) {
      console.error('Failed to fetch visitors', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este visitante?')) return;
    try {
      await api.delete(`/visitors/${id}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete visitor', error);
      alert('Erro ao excluir visitante. Verifique se não há visitas vinculadas.');
    }
  };

  const openNewDialog = () => {
    setCurrentVisitor({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (visitor: Visitor) => {
    setCurrentVisitor(visitor);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchData();
    setIsDialogOpen(false); // redundant as dialog closes itself but good for safety if needed
  };

  const filteredVisitors = visitors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.document.includes(searchTerm);
    const matchesPhone = phoneFilter === 'ALL' || 
                         (phoneFilter === 'WITH_PHONE' && v.phone) || 
                         (phoneFilter === 'NO_PHONE' && !v.phone);
    const matchesConsent = consentFilter === 'ALL' ||
                           (consentFilter === 'GIVEN' && v.consentGiven) ||
                           (consentFilter === 'NOT_GIVEN' && !v.consentGiven);
    
    return matchesSearch && matchesPhone && matchesConsent;
  });

  const handleExportCsv = () => {
    setExporting(true);
    try {
      const headers = ['name', 'document', 'phone', 'consentGiven'];
      const csv = toCsv(visitors, headers);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'visitantes.csv';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Visitantes</h1>
          <p className="text-muted-foreground mt-1">Gerencie o cadastro de visitantes frequentes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exportar CSV
          </Button>
          <Button onClick={openNewDialog} className="btn-hero">
            <Plus className="mr-2 h-4 w-4" /> Novo Visitante
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou documento..."
            className="pl-9 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={phoneFilter} onValueChange={setPhoneFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filtrar por telefone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os telefones</SelectItem>
            <SelectItem value="WITH_PHONE">Com telefone</SelectItem>
            <SelectItem value="NO_PHONE">Sem telefone</SelectItem>
          </SelectContent>
        </Select>
        <Select value={consentFilter} onValueChange={setConsentFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Consentimento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="GIVEN">Consentimento Aceito</SelectItem>
            <SelectItem value="NOT_GIVEN">Não Aceito/Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVisitors.map((v) => (
            <Card key={v.id} className="card-corporate overflow-hidden group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2 bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16 border rounded-md overflow-hidden">
                    <AvatarImage src={v.photo} alt={v.name} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold rounded-md">
                      {initials(v.name)}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    {v.name}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>CPF/RG: {maskDocument(v.document)}</span>
                </div>
                {v.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{v.phone}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/30 p-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/visitors/${v.id}`)}>
                  <Eye className="h-4 w-4 text-green-600" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEditDialog(v)}>
                  <Pencil className="h-4 w-4 text-blue-600" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(v.id)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </CardFooter>
            </Card>
          ))}
          
          {filteredVisitors.length === 0 && !loading && (
            <div className="col-span-full text-center py-10 text-muted-foreground">
              Nenhum visitante encontrado.
            </div>
          )}
        </div>
      )}

      <VisitorFormDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        visitorToEdit={currentVisitor}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default Visitors;
