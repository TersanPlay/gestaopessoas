import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarDays, CarFront, Clock3, Download, FileBarChart, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { guardhouseApi, type GuardhouseMovement, type MovementStatus, type VehicleCategory } from '@/services/guardhouseApi';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type StatusFilter = 'ALL' | MovementStatus;

const ACCESS_LABEL: Record<VehicleCategory, string> = {
  OFFICIAL: 'Oficial',
  EMPLOYEE: 'Servidor',
  VISITOR: 'Visitante',
  CONTRACTOR: 'Contratado',
};

const STATUS_LABEL: Record<MovementStatus, string> = {
  PRESENT: 'Presente',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toIsoStart = (dateValue: string) => new Date(`${dateValue}T00:00:00`).toISOString();
const toIsoEnd = (dateValue: string) => new Date(`${dateValue}T23:59:59.999`).toISOString();

const formatDurationLabel = (minutes: number) => {
  if (minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  return `${hours}h${String(mins).padStart(2, '0')}`;
};

const formatDateTime = (isoDate: string) =>
  new Date(isoDate).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const computeDuration = (movement: GuardhouseMovement) => {
  if (movement.durationMinutes !== null) return movement.durationMinutes;
  if (!movement.exitAt) return 0;

  const entry = new Date(movement.entryAt).getTime();
  const exit = new Date(movement.exitAt).getTime();
  if (Number.isNaN(entry) || Number.isNaN(exit)) return 0;
  return Math.max(0, Math.round((exit - entry) / (1000 * 60)));
};

const GuardhouseReports = () => {
  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return from;
  }, [today]);

  const [dateFrom, setDateFrom] = useState(formatDateInput(defaultFrom));
  const [dateTo, setDateTo] = useState(formatDateInput(today));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<GuardhouseMovement[]>([]);

  const fetchMovements = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    if (dateFrom > dateTo) {
      alert('A data inicial nao pode ser maior que a data final.');
      return;
    }

    setLoading(true);
    try {
      const data = await guardhouseApi.getMovements({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        dateFrom: toIsoStart(dateFrom),
        dateTo: toIsoEnd(dateTo),
        limit: 200,
      });
      setMovements(data);
    } catch (error) {
      console.error('Failed to load guardhouse analytics report', error);
      alert('Nao foi possivel carregar o dashboard analitico da guarita.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    void fetchMovements();
  }, [fetchMovements]);

  const totalMovements = movements.length;
  const presentCount = movements.filter((movement) => movement.status === 'PRESENT').length;
  const finishedCount = movements.filter((movement) => movement.status === 'FINISHED').length;
  const uniqueVehicles = new Set(movements.map((movement) => movement.vehicle.plate)).size;

  const averageDuration = useMemo(() => {
    const finished = movements.filter((movement) => movement.status === 'FINISHED');
    if (finished.length === 0) return 0;

    const totalMinutes = finished.reduce((sum, movement) => sum + computeDuration(movement), 0);
    return Math.round(totalMinutes / finished.length);
  }, [movements]);

  const dailyFlowData = useMemo(() => {
    const map = new Map<number, { dia: string; entradas: number; saidas: number }>();

    const ensureDay = (date: Date) => {
      const key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const existing = map.get(key);
      if (existing) return { key, value: existing };

      const created = {
        dia: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        entradas: 0,
        saidas: 0,
      };
      map.set(key, created);
      return { key, value: created };
    };

    for (const movement of movements) {
      const entryDate = new Date(movement.entryAt);
      const entryDay = ensureDay(entryDate);
      entryDay.value.entradas += 1;

      if (movement.exitAt) {
        const exitDate = new Date(movement.exitAt);
        const exitDay = ensureDay(exitDate);
        exitDay.value.saidas += 1;
      }
    }

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => ({
        ...value,
        total: value.entradas + value.saidas,
      }))
      .slice(-14);
  }, [movements]);

  const accessTypeData = useMemo(() => {
    const map = new Map<VehicleCategory, number>();

    for (const movement of movements) {
      map.set(movement.accessCategory, (map.get(movement.accessCategory) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .map(([access, total]) => ({
        acesso: ACCESS_LABEL[access],
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [movements]);

  const movementTypeData = useMemo(() => {
    let cars = 0;
    let motos = 0;
    for (const movement of movements) {
      if (movement.vehicle.vehicleType === 'MOTORCYCLE') {
        motos += 1;
      } else {
        cars += 1;
      }
    }

    return [
      { tipo: 'Carros', total: cars },
      { tipo: 'Motos', total: motos },
    ];
  }, [movements]);

  const recentRows = movements.slice(0, 10);

  const exportCsv = () => {
    if (movements.length === 0) return;

    const headers = ['Placa', 'Condutor', 'Tipo', 'Acesso', 'Entrada', 'Saida', 'Status'];
    const rows = movements.map((movement) => [
      movement.vehicle.plate,
      movement.driver?.fullName ?? 'Sem condutor',
      movement.vehicle.vehicleType === 'MOTORCYCLE' ? 'Moto' : 'Carro',
      ACCESS_LABEL[movement.accessCategory],
      formatDateTime(movement.entryAt),
      movement.exitAt ? formatDateTime(movement.exitAt) : '-',
      STATUS_LABEL[movement.status],
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.map((item) => `"${item}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `guardhouse_dashboard_analitico_${dateFrom}_${dateTo}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Analitico de Visitas</h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            Painel exclusivo da Guarita para analise de entradas, saidas e permanencia no patio.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={movements.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" asChild>
            <Link to="/guardhouse/dashboard">Voltar ao Dashboard</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5" />
            Filtros do Relatorio
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Data inicial</label>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Data final</label>
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="PRESENT">Presente</SelectItem>
                <SelectItem value="FINISHED">Finalizado</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => void fetchMovements()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Movimentacoes</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-3xl font-bold">{loading ? '-' : totalMovements}</span>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Veiculos unicos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-3xl font-bold">{loading ? '-' : uniqueVehicles}</span>
            <CarFront className="h-5 w-5 text-sky-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">No patio agora</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-3xl font-bold">{loading ? '-' : presentCount}</span>
            <FileBarChart className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo medio</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-3xl font-bold">{loading ? '-' : formatDurationLabel(averageDuration)}</span>
            <Clock3 className="h-5 w-5 text-indigo-600" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo Diario (Entradas x Saidas)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {dailyFlowData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados para o periodo selecionado.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas" name="Saidas" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="total" name="Total diario" stroke="#0F172A" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuicao por Tipo de Acesso</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {accessTypeData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados para o periodo selecionado.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={accessTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="acesso" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" name="Movimentacoes" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipo de Veiculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {movementTypeData.map((item) => (
              <div key={item.tipo} className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground">{item.tipo}</p>
                <p className="text-2xl font-semibold">{item.total}</p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Finalizados no periodo: <span className="font-semibold">{finishedCount}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ultimas Movimentacoes do Filtro</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Condutor</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saida</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRows.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-mono font-semibold">{movement.vehicle.plate}</TableCell>
                    <TableCell>{movement.driver?.fullName ?? 'Sem condutor'}</TableCell>
                    <TableCell>{formatDateTime(movement.entryAt)}</TableCell>
                    <TableCell>{movement.exitAt ? formatDateTime(movement.exitAt) : '-'}</TableCell>
                    <TableCell>{STATUS_LABEL[movement.status]}</TableCell>
                  </TableRow>
                ))}
                {recentRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma movimentacao encontrada para os filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuardhouseReports;
