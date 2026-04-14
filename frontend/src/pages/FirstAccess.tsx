import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Fingerprint,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { FirstAccessProfile } from '../types/user';
import { formatCpf, formatCpfInput } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Step = 'identify' | 'password';

type LocationState = {
  matricula?: string;
  cpf?: string;
  email?: string;
};

const detailValue = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '-' : String(value);

export default function FirstAccess() {
  const { completeFirstAccess, validateFirstAccess } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as LocationState | null) ?? null;

  const [step, setStep] = useState<Step>('identify');
  const [matricula, setMatricula] = useState(routeState?.matricula || '');
  const [cpf, setCpf] = useState(routeState?.cpf || '');
  const [email, setEmail] = useState(routeState?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profile, setProfile] = useState<FirstAccessProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (routeState?.matricula) {
      setMatricula(routeState.matricula);
    }

    if (routeState?.cpf) {
      setCpf(routeState.cpf);
    }

    if (routeState?.email) {
      setEmail(routeState.email);
    }
  }, [routeState?.cpf, routeState?.email, routeState?.matricula]);

  const handleCheckIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const validatedProfile = await validateFirstAccess({
        matricula,
        cpf,
      });

      setProfile(validatedProfile);
      setStep('password');
    } catch (checkError) {
      if (isAxiosError<{ message?: string }>(checkError)) {
        setError(
          checkError.response?.data?.message ||
            'Não foi possível validar matrícula e CPF.',
        );
      } else {
        console.error(checkError);
        setError('Não foi possível validar matrícula e CPF.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith('@parauapebas.pa.leg.br')) {
      setError('Use seu e-mail institucional no domínio @parauapebas.pa.leg.br.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      await completeFirstAccess({
        servidorId: profile?.servidorId || '',
        matricula,
        cpf,
        email: normalizedEmail,
        password,
      });
      setSuccess('Primeiro acesso concluído com sucesso. Redirecionando...');
      navigate('/dashboard');
    } catch (completeError) {
      if (isAxiosError<{ message?: string }>(completeError)) {
        setError(
          completeError.response?.data?.message ||
            'Não foi possível concluir o primeiro acesso.',
        );
      } else {
        console.error(completeError);
        setError('Não foi possível concluir o primeiro acesso.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="corporate-gradient flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_45%),linear-gradient(135deg,rgba(148,163,184,0.14),transparent_40%)]" />
      <div className="relative z-10 grid w-full max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-300" />
          <CardHeader className="space-y-4 pb-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              {step === 'identify' ? <Fingerprint className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
            </div>
            <div className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold text-foreground">Primeiro acesso</CardTitle>
              <CardDescription className="text-muted-foreground">
                {step === 'identify'
                  ? 'Valide sua matrícula e CPF para localizar seu cadastro institucional.'
                  : 'Informe seu e-mail institucional e defina a senha do SSO sem sair desta interface.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {step === 'identify' ? (
              <form onSubmit={handleCheckIdentity} className="space-y-4">
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
                {error && <p className="text-sm text-red-500">{error}</p>}
                {success && <p className="text-sm text-emerald-600">{success}</p>}
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Validar identidade
                </Button>
              </form>
            ) : (
              <form onSubmit={handleCompleteFirstAccess} className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  Matrícula e CPF validados. Agora conclua o seu cadastro institucional diretamente pelo sistema.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail institucional</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario.teste@parauapebas.pa.leg.br"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {success && <p className="text-sm text-emerald-600">{success}</p>}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep('identify');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    disabled={loading}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Concluir primeiro acesso
                  </Button>
                </div>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-between gap-3 text-xs text-slate-500">
            <Button asChild variant="ghost" className="px-0 text-slate-600 hover:text-primary">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao login
              </Link>
            </Button>
            <span>Cadastro institucional concluído sem redirecionamento externo.</span>
          </CardFooter>
        </Card>

        <Card className="relative overflow-hidden border-slate-200/80 bg-white/95 text-foreground shadow-2xl backdrop-blur">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-700 via-primary to-slate-300" />
          <CardHeader className="border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl text-foreground">Como funciona</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Fluxo direto com a API institucional, do login ao primeiro acesso.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
                  1
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-primary/70">Etapa 1</p>
                  <p className="mt-2 text-sm text-slate-700">Validamos matrícula e CPF para identificar o servidor na base institucional.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
                  2
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-primary/70">Etapa 2</p>
                  <p className="mt-2 text-sm text-slate-700">Você informa o e-mail institucional e define a senha diretamente pela API SSO.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
                  3
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-primary/70">Etapa 3</p>
                  <p className="mt-2 text-sm text-slate-700">Após registrar, o sistema autentica e abre a sessão sem qualquer redirecionamento externo.</p>
                </div>
              </div>
            </div>

            {profile ? (
              <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                    <BadgeCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">Cadastro encontrado na API externa</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Matrícula</p>
                    <p className="mt-2 text-sm text-slate-800">{detailValue(profile.matricula)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">CPF</p>
                    <p className="mt-2 text-sm text-slate-800">{formatCpf(profile.cpf)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Sistema</p>
                    <p className="mt-2 text-sm text-slate-800">{detailValue(profile.systemName)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">E-mail cadastrado</p>
                    <p className="mt-2 text-sm text-slate-800">{detailValue(profile.emailCadastrado)}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
