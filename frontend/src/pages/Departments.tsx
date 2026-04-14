import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Search, RefreshCcw } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description?: string;
  responsible?: string;
  location?: string;
  employeeCount?: number | null;
  lastSyncedAt?: string | null;
}

const Departments = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDept, setCurrentDept] = useState<Partial<Department>>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const lastSyncedAt = departments.reduce<string | null>((latest, department) => {
    if (!department.lastSyncedAt) {
      return latest;
    }

    if (!latest) {
      return department.lastSyncedAt;
    }

    return new Date(department.lastSyncedAt) > new Date(latest)
      ? department.lastSyncedAt
      : latest;
  }, null);

  const filteredDepartments = departments.filter(dept => 
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.description ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.responsible && dept.responsible.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (dept.location && dept.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDepartments = async () => {
    setSyncing(true);
    try {
      const response = await api.post('/departments/sync');
      setDepartments(response.data.departments);
      alert('Lotações sincronizadas com sucesso.');
    } catch (error) {
      console.error('Failed to sync departments', error);
      alert('Erro ao sincronizar lotações.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (currentDept.id) {
        await api.put(`/departments/${currentDept.id}`, currentDept);
      } else {
        await api.post('/departments', currentDept);
      }
      await fetchDepartments();
      setIsDialogOpen(false);
      setCurrentDept({});
    } catch (error) {
      console.error('Failed to save department', error);
      alert('Erro ao salvar departamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este departamento?')) return;
    try {
      await api.delete(`/departments/${id}`);
      await fetchDepartments();
    } catch (error) {
      console.error('Failed to delete department', error);
      alert('Erro ao excluir departamento');
    }
  };

  const openNewDialog = () => {
    setCurrentDept({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (dept: Department) => {
    setCurrentDept(dept);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Departamentos</h1>
          {lastSyncedAt && (
            <p className="text-sm text-muted-foreground">
              Ultima sincronizacao: {new Date(lastSyncedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSyncDepartments}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              Sincronizar Lotacoes
            </Button>
            <Button onClick={openNewDialog} className="btn-hero">
              <Plus className="mr-2 h-4 w-4" /> Novo Departamento
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, descrição, responsável ou local..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDepartments.map((dept) => (
            <Card key={dept.id} className="relative group hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary">
              <CardHeader>
                <CardTitle className="text-xl text-primary">{dept.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {typeof dept.employeeCount === 'number' && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">Servidores ativos:</span> {dept.employeeCount}
                  </p>
                )}
                {dept.description && <p className="text-muted-foreground">{dept.description}</p>}
                {dept.responsible && (
                  <p className="text-sm text-muted-foreground"><span className="font-semibold">Responsável:</span> {dept.responsible}</p>
                )}
                {dept.location && (
                  <p className="text-sm text-muted-foreground"><span className="font-semibold">Local:</span> {dept.location}</p>
                )}
              </CardContent>
              {isAdmin && (
                <CardFooter className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(dept)}>
                    <Pencil className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(dept.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
          {filteredDepartments.length === 0 && (
             <div className="col-span-full text-center py-12 text-muted-foreground bg-white rounded-lg border border-dashed">
                <p>Nenhum departamento encontrado.</p>
                {isAdmin && (
                  <div className="flex justify-center gap-2">
                    <Button variant="link" onClick={handleSyncDepartments}>Sincronizar lotacoes</Button>
                    <Button variant="link" onClick={openNewDialog}>Criar manualmente</Button>
                  </div>
                )}
             </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentDept.id ? 'Editar Departamento' : 'Novo Departamento'}</DialogTitle>
            <DialogDescription>
              Preencha as informações do departamento abaixo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="name"
                  value={currentDept.name || ''}
                  onChange={(e) => setCurrentDept({ ...currentDept, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="responsible" className="text-right">
                  Responsável
                </Label>
                <Input
                  id="responsible"
                  value={currentDept.responsible || ''}
                  onChange={(e) => setCurrentDept({ ...currentDept, responsible: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  Localização
                </Label>
                <Input
                  id="location"
                  value={currentDept.location || ''}
                  onChange={(e) => setCurrentDept({ ...currentDept, location: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Departments;
