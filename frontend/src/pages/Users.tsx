import { useEffect, useState } from 'react';
import api from '../services/api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Shield, User as UserIcon, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COLABORADOR' | 'RECEPCIONISTA';
  departmentId?: string | null;
  department?: {
    name: string;
  };
}

interface Department {
  id: string;
  name: string;
}

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User> & { password?: string }>({});
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesDept = deptFilter === 'ALL' || (u.departmentId === deptFilter);
    return matchesSearch && matchesRole && matchesDept;
  });

  // Redirect if not admin
  if (user?.role !== 'ADMIN') {
    return <div className="p-4 text-center text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/users'),
        api.get('/departments')
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (currentUser.id) {
        await api.put(`/users/${currentUser.id}`, currentUser);
      } else {
        await api.post('/users', currentUser);
      }
      await fetchData();
      setIsDialogOpen(false);
      setCurrentUser({});
    } catch (error) {
      console.error('Failed to save user', error);
      alert('Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await api.delete(`/users/${id}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete user', error);
      alert('Erro ao excluir usuário');
    }
  };

  const openNewDialog = () => {
    setCurrentUser({ role: 'COLABORADOR' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { department, ...userData } = user;
    setCurrentUser(userData);
    setIsDialogOpen(true);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'RECEPCIONISTA': return 'Recepcionista';
      case 'COLABORADOR': return 'Colaborador';
      default: return role;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Gestão de Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerencie os acessos e permissões do sistema.</p>
        </div>
        <Button onClick={openNewDialog} className="btn-hero">
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filtrar por função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as funções</SelectItem>
            <SelectItem value="ADMIN">Administrador</SelectItem>
            <SelectItem value="COLABORADOR">Colaborador</SelectItem>
            <SelectItem value="RECEPCIONISTA">Recepcionista</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filtrar por departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os departamentos</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((u) => (
            <Card key={u.id} className="card-corporate overflow-hidden group hover:shadow-lg transition-all duration-300">
              <CardHeader className="p-4 pb-2 bg-muted/30">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-primary" />
                    {u.name}
                  </CardTitle>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                    u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                    u.role === 'RECEPCIONISTA' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    'bg-gray-100 text-gray-700 border-gray-200'
                  }`}>
                    {getRoleLabel(u.role)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="text-muted-foreground break-all">
                  {u.email}
                </div>
                {u.department && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>{u.department.name}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/30 p-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => openEditDialog(u)}>
                  <Pencil className="h-4 w-4 text-blue-600" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentUser.id ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>Preencha os dados do usuário.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={currentUser.name || ''}
                onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={currentUser.email || ''}
                onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha {currentUser.id && '(Deixe em branco para não alterar)'}</Label>
              <Input
                id="password"
                type="password"
                value={currentUser.password || ''}
                onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
                required={!currentUser.id}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select
                value={currentUser.role}
                onValueChange={(value) => setCurrentUser({ ...currentUser, role: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                  <SelectItem value="RECEPCIONISTA">Recepcionista</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Select
                value={currentUser.departmentId || 'undefined'}
                onValueChange={(value) => setCurrentUser({ ...currentUser, departmentId: value === 'undefined' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="undefined">Nenhum</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
