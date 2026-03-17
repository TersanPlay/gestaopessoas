import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Fingerprint,
  IdCard,
  Mail,
  Shield,
  UserCircle2,
  WalletCards,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { AppUser } from '../types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCpf, formatDateLabel } from '@/lib/formatters';

const fallback = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return String(value);
};

const roleLabel = (role: AppUser['role']) => {
  if (role === 'ADMIN') return 'Administrador';
  if (role === 'RECEPCIONISTA') return 'Recepcionista';
  return 'Colaborador';
};

const authProviderLabel = (provider: AppUser['authProvider']) =>
  provider === 'EXTERNAL' ? 'JIT Externo' : 'Local';

const DetailItem = ({
  label,
  value,
  subtle = false,
}: {
  label: string;
  value: string;
  subtle?: boolean;
}) => (
  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4">
    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <p className={`mt-2 text-sm ${subtle ? 'text-slate-300' : 'text-slate-100'}`}>{value}</p>
  </div>
);

const SectionBlock = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof UserCircle2;
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <Card className="overflow-hidden border-slate-800 bg-slate-950 text-slate-100 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.95)]">
    <CardHeader className="border-b border-slate-800/80 bg-slate-900/70">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-100">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-xl text-white">{title}</CardTitle>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="grid gap-4 p-6 md:grid-cols-2">{children}</CardContent>
  </Card>
);

export default function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: sessionUser } = useAuth();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const targetUserId = id || sessionUser?.id;
  const isOwnProfile = !id || id === sessionUser?.id;

  useEffect(() => {
    const fetchUser = async () => {
      if (!targetUserId) {
        setLoading(false);
        setError('Usuário não encontrado.');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await api.get<AppUser>(`/users/${targetUserId}`);
        setUser(response.data);
      } catch (fetchError) {
        console.error(fetchError);
        setError('Não foi possível carregar os detalhes do usuário.');
      } finally {
        setLoading(false);
      }
    };

    void fetchUser();
  }, [targetUserId]);

  const headline = useMemo(() => {
    if (!user) return 'Detalhes do usuário';
    return isOwnProfile ? 'Meu perfil funcional' : 'Detalhes do usuário';
  }, [isOwnProfile, user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 animate-pulse rounded-[32px] bg-slate-200" />
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="p-6 text-sm text-red-600">{error || 'Usuário não encontrado.'}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950 text-slate-50 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.95)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.28),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(51,65,85,0.65),_transparent_35%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(30,41,59,0.98))]" />
        <div className="relative z-10 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-5">
              <Button
                variant="ghost"
                className="w-fit border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
                onClick={() => navigate(isOwnProfile ? '/settings' : '/users')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {isOwnProfile ? 'Ir para configurações' : 'Voltar para usuários'}
              </Button>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                    {authProviderLabel(user.authProvider)}
                  </span>
                  <span className="rounded-full border border-slate-500/40 bg-slate-800/70 px-3 py-1 text-xs font-medium text-slate-200">
                    {roleLabel(user.role)}
                  </span>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">{headline}</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{user.name}</h1>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-300">
                  Visualização completa do cadastro sincronizado, organizada por identidade, vínculo profissional e dados contratuais.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-500/22 via-indigo-500/14 to-indigo-600/12 p-4 shadow-[0_18px_40px_-24px_rgba(79,70,229,0.75)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Matrícula</p>
                <p className="mt-2 text-lg font-semibold text-white">{fallback(user.matricula)}</p>
              </div>
              <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-500/22 via-indigo-500/14 to-indigo-600/12 p-4 shadow-[0_18px_40px_-24px_rgba(79,70,229,0.75)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">CPF</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatCpf(user.cpf)}</p>
              </div>
              <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-500/22 via-indigo-500/14 to-indigo-600/12 p-4 shadow-[0_18px_40px_-24px_rgba(79,70,229,0.75)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Carga Horária</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {user.cargaHorariaSemanal ? `${user.cargaHorariaSemanal}h/semana` : '-'}
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-6 bg-white/10" />

          <div className="flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:flex-wrap">
            <div className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              {user.email || 'Sem e-mail cadastrado'}
            </div>
            <div className="inline-flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              Departamento interno: {user.department?.name || 'Não vinculado'}
            </div>
            <div className="inline-flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-slate-400" />
              Atualizado em {formatDateLabel(user.updatedAt || null)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionBlock
          icon={Fingerprint}
          title="Identidade"
          description="Chaves de autenticação, identificação pessoal e metadados de acesso."
        >
          <DetailItem label="Nome" value={fallback(user.name)} />
          <DetailItem label="Matrícula" value={fallback(user.matricula)} />
          <DetailItem label="CPF" value={formatCpf(user.cpf)} />
          <DetailItem label="E-mail" value={user.email || 'Sem e-mail cadastrado'} subtle />
          <DetailItem label="Perfil no sistema" value={roleLabel(user.role)} subtle />
          <DetailItem label="Origem da conta" value={authProviderLabel(user.authProvider)} subtle />
        </SectionBlock>

        <SectionBlock
          icon={BriefcaseBusiness}
          title="Profissional"
          description="Dados funcionais recebidos da API externa e sincronizados no login."
        >
          <DetailItem label="Cargo" value={fallback(user.cargo)} />
          <DetailItem label="Lotação" value={fallback(user.lotacao)} />
          <DetailItem label="Função" value={fallback(user.funcao)} />
          <DetailItem label="Departamento interno" value={user.department?.name || 'Não vinculado'} subtle />
          <DetailItem label="Matrícula funcional" value={fallback(user.matricula)} subtle />
          <DetailItem label="Fonte de sincronização" value={authProviderLabel(user.authProvider)} subtle />
        </SectionBlock>

        <SectionBlock
          icon={WalletCards}
          title="Contratual"
          description="Vínculo e ciclo contratual do servidor, sem ocultar campos vindos da API."
        >
          <DetailItem label="Vínculo" value={fallback(user.vinculo)} />
          <DetailItem label="Admissão" value={formatDateLabel(user.dataAdmissao)} />
          <DetailItem label="Demissão" value={formatDateLabel(user.dataDemissao)} />
          <DetailItem
            label="Carga horária semanal"
            value={user.cargaHorariaSemanal ? `${user.cargaHorariaSemanal} horas` : '-'}
          />
          <DetailItem label="Criado em" value={formatDateLabel(user.createdAt || null)} subtle />
          <DetailItem label="Última atualização" value={formatDateLabel(user.updatedAt || null)} subtle />
        </SectionBlock>
      </div>

      <Card className="border-slate-200 bg-white/90 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium text-slate-900">Resumo de integração</p>
            <p>
              Os campos da API externa exibidos nesta página são: matrícula, CPF, nome, cargo, lotação,
              função, vínculo, data de admissão, data de demissão e carga horária semanal.
            </p>
          </div>
          {isOwnProfile ? (
            <Button asChild className="bg-slate-900 hover:bg-slate-800">
              <Link to="/settings">
                <Shield className="mr-2 h-4 w-4" />
                Gerenciar senha e preferências
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to="/users">
                <IdCard className="mr-2 h-4 w-4" />
                Voltar para gestão
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200">
          <CardContent className="flex items-center gap-3 p-5">
            <Building2 className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Lotação</p>
              <p className="font-medium text-slate-900">{fallback(user.lotacao)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="flex items-center gap-3 p-5">
            <CalendarClock className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Admissão</p>
              <p className="font-medium text-slate-900">{formatDateLabel(user.dataAdmissao)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="flex items-center gap-3 p-5">
            <UserCircle2 className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Função</p>
              <p className="font-medium text-slate-900">{fallback(user.funcao)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
