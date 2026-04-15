import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Download, FileText, Loader2, Phone, Plus, Search, User } from 'lucide-react';
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
  faceEmbedding?: number[] | null;
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

  const openNewDialog = () => {
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchData();
    setIsDialogOpen(false);
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
            <SelectItem value="NOT_GIVEN">Nao Aceito/Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse md:h-auto md:aspect-square" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filteredVisitors.map((v) => (
            <Card
              key={v.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/visitors/${v.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/visitors/${v.id}`);
                }
              }}
              className="card-corporate overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col md:aspect-square cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <CardHeader className="bg-muted/30">
                <div className="flex justify-center">
                  <Avatar className="h-24 w-24 shrink-0 border rounded-md overflow-hidden">
                    <AvatarImage src={v.photo} alt={v.name} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold rounded-md">
                      {initials(v.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm flex-1">
                {Boolean(v.photo) && Array.isArray(v.faceEmbedding) && v.faceEmbedding.length > 0 ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Facial valido
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Precisa recadastro
                  </div>
                )}
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <User className="h-4 w-4 text-primary" />
                  <span className="truncate">{v.name}</span>
                </div>
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
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default Visitors;
