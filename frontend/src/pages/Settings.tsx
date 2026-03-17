import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Save, Shield, Server, Download, RotateCw, Trash2, LockKeyhole } from 'lucide-react';
import { formatCpf } from '@/lib/formatters';

const Settings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'ADMIN';
  const isExternalUser = user?.authProvider === 'EXTERNAL';
  const [tab, setTab] = useState<'profile' | 'backup'>('profile');

  const [backups, setBackups] = useState<{ file: string; size: number; modified: string }[]>([]);
  const [backupScope, setBackupScope] = useState('full');
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [backupMsg, setBackupMsg] = useState('');
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    contactEmail: user?.email || '',
    newPassword: '',
    confirmNewPassword: ''
  });

  type ProfileUpdatePayload = {
    name: string;
    email: string | null;
    password?: string;
  };

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

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      contactEmail: user?.email || '',
      newPassword: '',
      confirmNewPassword: ''
    });
  }, [user?.id, user?.name, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    if (
      formData.newPassword &&
      formData.newPassword !== formData.confirmNewPassword
    ) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const data: ProfileUpdatePayload = {
        name: formData.name,
        email: formData.contactEmail || null
      };

      if (formData.newPassword) {
        data.password = formData.newPassword;
      }

      const response = await api.put(`/users/${user?.id}`, data);
      setUser(response.data);

      setSuccess('Perfil atualizado com sucesso!');
      setFormData((prev) => ({
        ...prev,
        newPassword: '',
        confirmNewPassword: ''
      }));
    } catch (err) {
      console.error(err);
      setError('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await api.get('/backup/list');
      setBackups(response.data || []);
    } catch (err) {
      console.error(err);
      setBackupMsg('Erro ao listar backups');
    }
  }, [isAdmin]);

  useEffect(() => {
    void fetchBackups();
  }, [fetchBackups]);

  const humanSize = (size: number) => {
    if (size > 1_000_000) return `${(size / 1_000_000).toFixed(1)} MB`;
    if (size > 1_000) return `${(size / 1_000).toFixed(1)} KB`;
    return `${size} B`;
  };

  const handleBackup = async () => {
    setBackupMsg('');
    setBackupLoading(true);
    try {
      await api.post('/backup', { scope: backupScope });
      setBackupMsg('Backup gerado com sucesso');
      void fetchBackups();
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

  const handleDelete = (file: string) => {
    setConfirmDeleteFile(file);
    setConfirmDeleteText('');
  };

  const confirmDelete = async () => {
    if (!confirmDeleteFile) return;
    setDeleteLoading(confirmDeleteFile);
    setBackupMsg('');
    try {
      await api.delete(`/backup/${encodeURIComponent(confirmDeleteFile)}`);
      setBackupMsg(`Backup "${confirmDeleteFile}" removido com sucesso`);
      void fetchBackups();
    } catch (err) {
      console.error(err);
      setBackupMsg('Erro ao remover backup');
    } finally {
      setDeleteLoading(null);
      setConfirmDeleteFile(null);
      setConfirmDeleteText('');
    }
  };

  const canDeleteBackup = !!confirmDeleteFile && confirmDeleteText === confirmDeleteFile;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie senha, identidade local e rotinas administrativas do ambiente.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1">
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
            <CardDescription>
              Senhas e e-mail continuam locais. Dados funcionais de contas JIT são sincronizados em cada login.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} autoComplete="off">
            <CardContent className="space-y-4">
              {success && (
                <div className="rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
                  {success}
                </div>
              )}
              {error && (
                <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                  {error}
                </div>
              )}

              {isExternalUser && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <LockKeyhole className="h-4 w-4" />
                    Conta sincronizada pela API externa
                  </div>
                  <p className="mt-2">
                    Nome, matrícula, CPF e campos funcionais vêm da integração JIT. Aqui você gerencia apenas e-mail local e senha.
                  </p>
                </div>
              )}

              <div className="mb-6 flex flex-col items-center justify-center gap-2">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-lg font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isExternalUser}
                />
                {isExternalUser && (
                  <p className="text-xs text-muted-foreground">
                    O nome é atualizado automaticamente a partir da API externa.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="matricula">Matrícula</Label>
                  <Input id="matricula" value={user?.matricula || ''} readOnly disabled />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" value={formatCpf(user?.cpf)} readOnly disabled />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  autoComplete="off"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="password">Nova Senha (opcional)</Label>
                  <Input
                    id="password"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Deixe em branco para manter"
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmNewPassword"
                    type="password"
                    value={formData.confirmNewPassword}
                    onChange={handleChange}
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
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
              <div className="rounded border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
                {backupMsg}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Label className="text-sm">Tipo de backup</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { key: 'full', label: 'Completo', icon: Shield, color: 'text-indigo-600', hover: 'hover:bg-indigo-50 hover:border-indigo-200' },
                  { key: 'visits', label: 'Visitas', icon: RotateCw, color: 'text-emerald-600', hover: 'hover:bg-emerald-50 hover:border-emerald-200' },
                  { key: 'visitors', label: 'Visitantes', icon: Server, color: 'text-blue-600', hover: 'hover:bg-blue-50 hover:border-blue-200' },
                  { key: 'departments', label: 'Departamentos', icon: Download, color: 'text-amber-600', hover: 'hover:bg-amber-50 hover:border-amber-200' },
                  { key: 'users', label: 'Usuários', icon: Save, color: 'text-rose-600', hover: 'hover:bg-rose-50 hover:border-rose-200' },
                  { key: 'totem', label: 'Totem', icon: Server, color: 'text-slate-600', hover: 'hover:bg-slate-50 hover:border-slate-200' },
                ].map((opt) => (
                  <Button
                    key={opt.key}
                    type="button"
                    variant="outline"
                    className={`h-10 w-full justify-start border ${opt.hover} ${backupScope === opt.key ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => setBackupScope(opt.key)}
                  >
                    <opt.icon className={`mr-2 h-4 w-4 ${opt.color}`} />
                    {opt.label}
                  </Button>
                ))}
              </div>

              <div className="flex items-center justify-start">
                <Button onClick={handleBackup} disabled={backupLoading} className="w-full sm:w-auto">
                  {backupLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
                  Gerar backup ({backupScope})
                </Button>
              </div>
            </div>

            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-semibold text-muted-foreground">
                <span>Backups existentes</span>
                <Button variant="ghost" size="sm" onClick={() => void fetchBackups()}>
                  <RotateCw className="mr-1 h-4 w-4" /> Atualizar
                </Button>
              </div>
              <div className="max-h-72 divide-y overflow-auto">
                {backups.length === 0 && (
                  <div className="p-3 text-sm text-muted-foreground">Nenhum backup encontrado.</div>
                )}
                {backups.map((backup) => (
                  <div key={backup.file} className="flex items-center justify-between gap-2 p-3 text-sm">
                    <div className="flex flex-col">
                      <span className="break-all font-medium text-foreground">{backup.file}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(backup.modified).toLocaleString()} • {humanSize(backup.size)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRestore(backup.file)}
                        disabled={!!restoreLoading}
                      >
                        {restoreLoading === backup.file ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCw className="mr-1 h-4 w-4" />
                        )}
                        Restaurar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/db/backups/${backup.file}`, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(backup.file)}
                        disabled={!!deleteLoading}
                      >
                        {deleteLoading === backup.file ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!confirmDeleteFile}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteFile(null);
            setConfirmDeleteText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir backup</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o backup <strong>{confirmDeleteFile}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-delete-backup-name">
              Digite o nome do backup para confirmar
            </Label>
            <Input
              id="confirm-delete-backup-name"
              value={confirmDeleteText}
              onChange={(e) => setConfirmDeleteText(e.target.value)}
              placeholder={confirmDeleteFile || ''}
              autoComplete="off"
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDeleteFile(null);
                setConfirmDeleteText('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={!!deleteLoading || !canDeleteBackup}
            >
              {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
