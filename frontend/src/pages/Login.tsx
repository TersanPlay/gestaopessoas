import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Fingerprint, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCpfInput } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';

type LoginMode = 'colaborador' | 'admin';

export default function Login() {
  const { login, loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>('colaborador');
  const [matricula, setMatricula] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsFirstAccess, setNeedsFirstAccess] = useState(false);

  const resetFeedback = () => {
    setError('');
    setNeedsFirstAccess(false);
  };

  const handleModeChange = (nextMode: LoginMode) => {
    setMode(nextMode);
    resetFeedback();
  };

  const handleCollaboratorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    try {
      await login({ matricula, cpf, password });
      navigate('/dashboard');
    } catch (loginError) {
      console.error(loginError);

      if (isAxiosError<{ message?: string; code?: string }>(loginError)) {
        setNeedsFirstAccess(
          loginError.response?.data?.code === 'FIRST_ACCESS_REQUIRED',
        );
        setError(
          loginError.response?.data?.message ||
            'Falha no login. Confira matrícula, CPF e senha.',
        );
      } else {
        setError('Falha no login. Confira matrícula, CPF e senha.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    try {
      await loginAdmin({ email: adminEmail, password: adminPassword });
      navigate('/dashboard');
    } catch (loginError) {
      console.error(loginError);

      if (isAxiosError<{ message?: string }>(loginError)) {
        setError(
          loginError.response?.data?.message ||
            'Falha no login administrativo. Confira e-mail e senha.',
        );
      } else {
        setError('Falha no login administrativo. Confira e-mail e senha.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="corporate-gradient flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_45%),linear-gradient(135deg,rgba(148,163,184,0.14),transparent_40%)]" />
      <Card className="relative w-full max-w-md overflow-hidden border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-300" />
        <CardHeader className="space-y-4 pb-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-slate-900">Acesso ao sistema</CardTitle>
            <CardDescription className="text-slate-600">
              Escolha o tipo de acesso para entrar com as credenciais corretas.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <Button
              type="button"
              variant={mode === 'colaborador' ? 'default' : 'ghost'}
              className={mode === 'colaborador' ? 'bg-slate-900 hover:bg-slate-800' : 'text-slate-600'}
              onClick={() => handleModeChange('colaborador')}
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              Colaborador
            </Button>
            <Button
              type="button"
              variant={mode === 'admin' ? 'default' : 'ghost'}
              className={mode === 'admin' ? 'bg-slate-900 hover:bg-slate-800' : 'text-slate-600'}
              onClick={() => handleModeChange('admin')}
            >
              <Mail className="mr-2 h-4 w-4" />
              Admin local
            </Button>
          </div>

          {mode === 'colaborador' ? (
            <form onSubmit={handleCollaboratorLogin} className="space-y-4">
              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <p className="font-medium text-slate-900">Acesso via API externa</p>
                <p>Entre com matrícula, CPF e senha local. Se ainda não tiver senha, use o primeiro acesso.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula</Label>
                <Input
                  id="matricula"
                  placeholder="Informe sua matrícula"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-center text-sm text-red-500">{error}</p>}
              {needsFirstAccess && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-slate-300"
                  onClick={() =>
                    navigate('/first-access', {
                      state: { matricula, cpf },
                    })
                  }
                >
                  Configurar primeiro acesso
                </Button>
              )}
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Entrar como colaborador
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium text-amber-950">Acesso administrativo local</p>
                <p>Administradores locais entram com e-mail e senha, sem depender da autenticação da API.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">E-mail</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@gestao.com"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && <p className="text-center text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Entrar como administrador
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-center text-xs text-slate-500">
          {mode === 'colaborador' ? (
            <>
              <span>Administradores locais continuam gerenciando perfis e permissões do sistema.</span>
              <Link to="/first-access" className="font-medium text-slate-700 hover:text-slate-900">
                Primeiro acesso? Configure sua senha aqui
              </Link>
            </>
          ) : (
            <span>O admin local padrão do seed continua vinculado ao e-mail configurado no ambiente.</span>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
