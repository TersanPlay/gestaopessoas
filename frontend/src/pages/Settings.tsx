import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Save, Shield, Server, Download, RotateCw } from 'lucide-react';

const Settings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState<'profile' | 'backup'>('profile');

  // Backup state
  const [backups, setBackups] = useState<{ file: string; size: number; modified: string }[]>([]);
  const [backupScope, setBackupScope] = useState('full');
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null);
  const [backupMsg, setBackupMsg] = useState('');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    confirmPassword: ''
  });

  const userInitials = useMemo(() => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }, [user?.name]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        name: formData.name,
        email: formData.email
      };

      if (formData.password) {
        data.password = formData.password;
      }

      const response = await api.put(`/users/${user?.id}`, data);
      if (setUser) {
        setUser({ ...user!, name: response.data.name, email: response.data.email });
      }

      setSuccess('Perfil atualizado com sucesso!');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      console.error(err);
      setError('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    if (!isAdmin) return;
    try {
      const response = await api.get('/backup/list');
      setBackups(response.data || []);
    } catch (err) {
      console.error(err);
      setBackupMsg('Erro ao listar backups');
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [isAdmin]);

  const humanSize = (size: number) => {
    if (size > 1_000_000) return (size / 1_000_000).toFixed(1) + ' MB';
    if (size > 1_000) return (size / 1_000).toFixed(1) + ' KB';
    return size + ' B';
  };

  const handleBackup = async () => {
    setBackupMsg('');
    setBackupLoading(true);
    try {
      await api.post('/backup', { scope: backupScope });
      setBackupMsg('Backup gerado com sucesso');
      fetchBackups();
    } catch (err) {
      console.error(err);
      setBackupMsg('Erro ao gerar backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (file: string) => {
    setRestoreLoading(file);
    setBackupMsg('');
    try {
      await api.post('/backup/restore', { file });
      setBackupMsg('Restauração concluída');
    } catch (err) {
      console.error(err);
      setBackupMsg('Erro ao restaurar backup');
    } finally {
      setRestoreLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e segurança.</p>
        </div>
        <div className="inline-flex items-center rounded-lg border bg-card p-1 gap-1">
          <Button variant={tab === 'profile' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('profile')}>
            Perfil
          </Button>
          {isAdmin && (
            <Button variant={tab === 'backup' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('backup')}>
              Backup
            </Button>
          )}
        </div>
      </div>

      {tab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Atualize suas informações de contato e senha.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                  {success}
                </div>
              )}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                  {error}
                </div>
              )}

              <div className="flex flex-col items-center justify-center mb-6 gap-2">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="font-medium text-lg">{user?.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">Nova Senha (opcional)</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Deixe em branco para manter"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repita a nova senha"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {tab === 'backup' && isAdmin && (
        <Card className="border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Backup & Restauração
            </CardTitle>
            <CardDescription>Disponível apenas para administradores.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {backupMsg && (
              <div className="text-sm text-primary font-medium bg-primary/5 border border-primary/20 px-3 py-2 rounded">
                {backupMsg}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex-1 w-full">
                <Label className="text-sm">Tipo de backup</Label>
                <select
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={backupScope}
                  onChange={(e) => setBackupScope(e.target.value)}
                >
                  <option value="full">Completo</option>
                  <option value="visits">Visitas (visits, visitors, departments, users)</option>
                  <option value="visitors">Visitantes</option>
                  <option value="departments">Departamentos</option>
                  <option value="users">Usuários</option>
                  <option value="totem">Totem (visitors + visits)</option>
                </select>
              </div>
              <Button onClick={handleBackup} disabled={backupLoading} className="w-full sm:w-auto">
                {backupLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Server className="h-4 w-4 mr-2" />}
                Gerar backup
              </Button>
            </div>

            <div className="border rounded-lg">
              <div className="px-3 py-2 border-b text-sm font-semibold text-muted-foreground flex justify-between items-center">
                <span>Backups existentes</span>
                <Button variant="ghost" size="sm" onClick={fetchBackups}>
                  <RotateCw className="h-4 w-4 mr-1" /> Atualizar
                </Button>
              </div>
              <div className="divide-y max-h-72 overflow-auto">
                {backups.length === 0 && (
                  <div className="p-3 text-sm text-muted-foreground">Nenhum backup encontrado.</div>
                )}
                {backups.map((b) => (
                  <div key={b.file} className="p-3 text-sm flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground break-all">{b.file}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(b.modified).toLocaleString()} • {humanSize(b.size)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(b.file)}
                        disabled={!!restoreLoading}
                      >
                        {restoreLoading === b.file ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RotateCw className="h-4 w-4 mr-1" />
                        )}
                        Restaurar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/db/backups/${b.file}`, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Settings;
