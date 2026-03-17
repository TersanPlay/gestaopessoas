import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Eye, Plus, Pencil, Trash2, Shield, User as UserIcon, Search, BadgeCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AppUser, UserRole } from '../types/user';
import { formatCpf, formatCpfInput } from '@/lib/formatters';

interface Department {
  id: string;
  name: string;
}

type EditableUser = Partial<AppUser> & {
  password?: string;
};

const Users = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<EditableUser>({});
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const filteredUsers = users.filter((listedUser) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      listedUser.name.toLowerCase().includes(normalizedSearch) ||
      (listedUser.email || '').toLowerCase().includes(normalizedSearch) ||
      (listedUser.matricula || '').toLowerCase().includes(normalizedSearch) ||
      (listedUser.cpf || '').includes(searchTerm.replace(/\D/g, ''));
    const matchesRole = roleFilter === 'ALL' || listedUser.role === roleFilter;
    const matchesDept = deptFilter === 'ALL' || listedUser.departmentId === deptFilter;

    return matchesSearch && matchesRole && matchesDept;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.get<AppUser[]>('/users'),
        api.get<Department[]>('/departments'),
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      void fetchData();
      return;
    }

    setLoading(false);
  }, [fetchData, user?.role]);

  if (user?.role !== 'ADMIN') {
    return <div className="p-4 text-center text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: currentUser.name,
      matricula: currentUser.matricula,
      cpf: currentUser.cpf,
      email: currentUser.email || null,
      password: currentUser.password,
      role: currentUser.role,
      departmentId: currentUser.departmentId || null,
    };

    try {
      if (currentUser.id) {
        await api.put(`/users/${currentUser.id}`, payload);
      } else {
        await api.post('/users', payload);
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
    setCurrentUser({ role: 'COLABORADOR', authProvider: 'LOCAL', email: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (selectedUser: AppUser) => {
    setCurrentUser({ ...selectedUser, email: selectedUser.email || '', password: '' });
    setIsDialogOpen(true);
  };

  const getRoleLabel = (role: UserRole) => {
    if (role === 'ADMIN') return 'Administrador';
    if (role === 'RECEPCIONISTA') return 'Recepcionista';
    return 'Colaborador';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Gestão de Usuários</h1>
          <p className="mt-1 text-muted-foreground">
            Administre acessos locais e acompanhe colaboradores provisionados via integração JIT.
          </p>
        </div>
        <Button onClick={openNewDialog} className="btn-hero">
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário Local
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, matrícula, CPF ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filtrar por perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os perfis</SelectItem>
            <SelectItem value="ADMIN">Administrador</SelectItem>
            <SelectItem value="COLABORADOR">Colaborador</SelectItem>
            <SelectItem value="RECEPCIONISTA">Recepcionista</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full md:w-[220px]">
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
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-56 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((listedUser) => (
            <Card key={listedUser.id} className="card-corporate group overflow-hidden">
              <CardHeader className="bg-muted/30 p-4 pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <UserIcon className="h-4 w-4 text-primary" />
                    <span className="line-clamp-1">{listedUser.name}</span>
                  </CardTitle>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {getRoleLabel(listedUser.role)}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      listedUser.authProvider === 'EXTERNAL'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {listedUser.authProvider === 'EXTERNAL' ? 'JIT Externo' : 'Local'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-sm">
                <div className="grid gap-2 rounded-xl bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Matrícula</span>
                    <span className="font-medium">{listedUser.matricula || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">CPF</span>
                    <span className="font-medium">{formatCpf(listedUser.cpf)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="break-all text-muted-foreground">
                    {listedUser.email || 'Sem e-mail cadastrado'}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>{listedUser.department?.name || 'Sem departamento'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BadgeCheck className="h-4 w-4" />
                    <span>{listedUser.cargo || listedUser.lotacao || 'Dados profissionais visíveis nos detalhes'}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-3 flex justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/users/${listedUser.id}`)}>
                  <Eye className="h-4 w-4 text-slate-700" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEditDialog(listedUser)}>
                  <Pencil className="h-4 w-4 text-blue-600" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(listedUser.id)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredUsers.length === 0 && (
        <div className="rounded-xl border border-dashed bg-muted/30 py-12 text-center text-muted-foreground">
          Nenhum usuário encontrado com os filtros atuais.
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentUser.id ? 'Editar Usuário' : 'Novo Usuário Local'}</DialogTitle>
            <DialogDescription>
              Matrícula, CPF e senha são obrigatórios. Usuários sincronizados via API continuam com perfil ajustável apenas por admin.
            </DialogDescription>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula</Label>
                <Input
                  id="matricula"
                  value={currentUser.matricula || ''}
                  onChange={(e) => setCurrentUser({ ...currentUser, matricula: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  inputMode="numeric"
                  value={currentUser.cpf || ''}
                  onChange={(e) => setCurrentUser({ ...currentUser, cpf: formatCpfInput(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail opcional</Label>
              <Input
                id="email"
                type="email"
                value={currentUser.email || ''}
                onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha {currentUser.id && '(deixe em branco para não alterar)'}</Label>
              <Input
                id="password"
                type="password"
                value={currentUser.password || ''}
                onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
                required={!currentUser.id}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Perfil</Label>
              <Select
                value={currentUser.role}
                onValueChange={(value: UserRole) => setCurrentUser({ ...currentUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um perfil" />
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
                onValueChange={(value) =>
                  setCurrentUser({ ...currentUser, departmentId: value === 'undefined' ? null : value })
                }
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
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
