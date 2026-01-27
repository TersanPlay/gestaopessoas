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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description: string;
}

const Departments = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDept, setCurrentDept] = useState<Partial<Department>>({});
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

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
        <h1 className="text-3xl font-bold tracking-tight">Departamentos</h1>
        {isAdmin && (
          <Button onClick={openNewDialog} className="btn-hero">
            <Plus className="mr-2 h-4 w-4" /> Novo Departamento
          </Button>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center p-8">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Card key={dept.id} className="relative group hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary">
              <CardHeader>
                <CardTitle className="text-xl text-primary">{dept.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{dept.description}</p>
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
          {departments.length === 0 && (
             <div className="col-span-full text-center py-12 text-muted-foreground bg-white rounded-lg border border-dashed">
                <p>Nenhum departamento encontrado.</p>
                {isAdmin && <Button variant="link" onClick={openNewDialog}>Criar o primeiro</Button>}
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
                <Label htmlFor="description" className="text-right">
                  Descrição
                </Label>
                <Input
                  id="description"
                  value={currentDept.description || ''}
                  onChange={(e) => setCurrentDept({ ...currentDept, description: e.target.value })}
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
