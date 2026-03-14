import { useEffect, useMemo, useState } from 'react';
import { Car, Bike, Activity, Clock3, ArrowRightCircle, ArrowLeftCircle, FileBarChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import {
  guardhouseApi,
  type GuardhouseDashboardStats,
  type GuardhouseSpot,
  type MovementStatus,
  type SpotStatus,
  type SpotType,
} from '@/services/guardhouseApi';

const spotStatusClass: Record<SpotStatus, string> = {
  FREE: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  OCCUPIED: 'bg-rose-100 text-rose-700 border-rose-300',
  RESERVED: 'bg-amber-100 text-amber-700 border-amber-300',
  BLOCKED: 'bg-slate-200 text-slate-700 border-slate-400',
  MAINTENANCE: 'bg-orange-100 text-orange-700 border-orange-300',
};

const statusLabel: Record<SpotStatus, string> = {
  FREE: 'Livre',
  OCCUPIED: 'Ocupada',
  RESERVED: 'Reservada',
  BLOCKED: 'Bloqueada',
  MAINTENANCE: 'Manutencao',
};

const getDisplayTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const movementTypeLabel: Record<SpotType, string> = {
  CAR: 'Carro',
  MOTORCYCLE: 'Moto',
};

const movementStatusLabel: Record<MovementStatus, string> = {
  PRESENT: 'Presente',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelada',
};

const MOVEMENTS_PAGE_SIZE = 10;
const MOVEMENTS_MAX_LIMIT = 30;

const GuardhouseDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<GuardhouseDashboardStats | null>(null);
  const [spots, setSpots] = useState<GuardhouseSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, spotsData] = await Promise.all([
          guardhouseApi.getDashboardStats(),
          guardhouseApi.getSpots(),
        ]);
        setStats(statsData);
        setSpots(spotsData);
      } catch (error) {
        console.error('Failed to load guardhouse dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const carSpots = useMemo(
    () => spots.filter((spot) => spot.spotType === 'CAR').sort((a, b) => a.code.localeCompare(b.code)),
    [spots],
  );

  const motoSpots = useMemo(
    () => spots.filter((spot) => spot.spotType === 'MOTORCYCLE').sort((a, b) => a.code.localeCompare(b.code)),
    [spots],
  );

  const recentMovementsLimited = useMemo(
    () => (stats?.recentMovements ?? []).slice(0, MOVEMENTS_MAX_LIMIT),
    [stats?.recentMovements],
  );

  const totalMovementPages = useMemo(
    () => Math.max(1, Math.ceil(recentMovementsLimited.length / MOVEMENTS_PAGE_SIZE)),
    [recentMovementsLimited.length],
  );

  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * MOVEMENTS_PAGE_SIZE;
    const end = start + MOVEMENTS_PAGE_SIZE;
    return recentMovementsLimited.slice(start, end);
  }, [currentPage, recentMovementsLimited]);

  const movementPageNumbers = useMemo(
    () => Array.from({ length: totalMovementPages }, (_, index) => index + 1),
    [totalMovementPages],
  );

  const emptyMovementRows = Math.max(0, MOVEMENTS_PAGE_SIZE - paginatedMovements.length);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalMovementPages));
  }, [totalMovementPages]);

  const canRegisterVehicle = user?.role === 'ADMIN' || user?.role === 'RECEPCIONISTA';

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Guarita</h1>
          <p className="text-muted-foreground">Visao operacional de entradas, saidas e ocupacao de vagas.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Veiculos no Patio</CardTitle>
            <Car className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{loading ? '-' : stats?.vehiclesInside ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Veiculos presentes agora</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Entradas Hoje</CardTitle>
            <ArrowRightCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{loading ? '-' : stats?.entriesToday ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Movimentacoes de entrada no dia</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Saidas Hoje</CardTitle>
            <ArrowLeftCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{loading ? '-' : stats?.exitsToday ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Movimentacoes de saida no dia</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tempo Medio</CardTitle>
            <Clock3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{loading ? '-' : `${stats?.averageDurationMinutes ?? 0} min`}</div>
            <p className="text-xs text-muted-foreground mt-1">Permanencia media dos finalizados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {canRegisterVehicle && (
          <Link to="/guardhouse/entry" className="block">
            <Card className="h-full transition-colors hover:border-primary/60">
              <CardContent className="flex h-full items-center gap-3 p-4">
                <ArrowRightCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Cadastrar Veiculo</p>
                  <p className="text-xs text-muted-foreground">Registrar novo veiculo no sistema</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link to="/guardhouse/exit" className="block">
          <Card className="h-full transition-colors hover:border-primary/60">
            <CardContent className="flex h-full items-center gap-3 p-4">
              <ArrowLeftCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Registrar Saida</p>
                <p className="text-xs text-muted-foreground">Finalizar movimentacao ativa</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/guardhouse/movements" className="block">
          <Card className="h-full transition-colors hover:border-primary/60">
            <CardContent className="flex h-full items-center gap-3 p-4">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Historico</p>
                <p className="text-xs text-muted-foreground">Consultar entradas e saidas</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/guardhouse/vehicles" className="block">
          <Card className="h-full transition-colors hover:border-primary/60">
            <CardContent className="flex h-full items-center gap-3 p-4">
              <Car className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Veiculos</p>
                <p className="text-xs text-muted-foreground">Ver lista de cadastros</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/guardhouse/reports" className="block">
          <Card className="h-full transition-colors hover:border-primary/60">
            <CardContent className="flex h-full items-center gap-3 p-4">
              <FileBarChart className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Dashboard Analitico</p>
                <p className="text-xs text-muted-foreground">Relatorios exclusivos da guarita</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-sky-600" />
              Mapa de Vagas - Carros ({carSpots.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-6 gap-2">
            {carSpots.map((spot) => (
              <div
                key={spot.id}
                className={`rounded border px-2 py-3 text-center text-xs font-semibold ${spotStatusClass[spot.status]}`}
                title={`${spot.code} - ${statusLabel[spot.status]}`}
              >
                <div>{spot.code}</div>
                <div className="mt-1 text-[10px] font-normal">{statusLabel[spot.status]}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bike className="h-5 w-5 text-orange-600" />
              Mapa de Vagas - Motos ({motoSpots.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-6 gap-2">
            {motoSpots.map((spot) => (
              <div
                key={spot.id}
                className={`rounded border px-2 py-3 text-center text-xs font-semibold ${spotStatusClass[spot.status]}`}
                title={`${spot.code} - ${statusLabel[spot.status]}`}
              >
                <div>{spot.code}</div>
                <div className="mt-1 text-[10px] font-normal">{statusLabel[spot.status]}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Ultimas Movimentacoes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Condutor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saida</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading &&
                  Array.from({ length: MOVEMENTS_PAGE_SIZE }).map((_, index) => (
                    <TableRow key={`movement-loading-${index}`}>
                      <TableCell colSpan={6} className="text-sm text-muted-foreground">
                        {index === 0 ? 'Carregando...' : '-'}
                      </TableCell>
                    </TableRow>
                  ))}

                {!loading &&
                  paginatedMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="font-mono font-semibold">{movement.vehicle.plate}</TableCell>
                      <TableCell>{movement.driver?.fullName ?? 'Sem condutor'}</TableCell>
                      <TableCell>{movementTypeLabel[movement.vehicle.vehicleType]}</TableCell>
                      <TableCell>{getDisplayTime(movement.entryAt)}</TableCell>
                      <TableCell>{movement.exitAt ? getDisplayTime(movement.exitAt) : '-'}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                            movement.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                              : movement.status === 'FINISHED'
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                                : 'bg-rose-100 text-rose-700 border-rose-300'
                          }`}
                        >
                          {movementStatusLabel[movement.status]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}

                {!loading && recentMovementsLimited.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Ainda nao ha movimentacoes registradas.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  Array.from({
                    length: recentMovementsLimited.length === 0 ? MOVEMENTS_PAGE_SIZE - 1 : emptyMovementRows,
                  }).map((_, index) => (
                    <TableRow key={`movement-empty-${index}`}>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Exibindo {paginatedMovements.length} de {recentMovementsLimited.length} movimentacoes (limite {MOVEMENTS_MAX_LIMIT})
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loading || currentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              {movementPageNumbers.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  type="button"
                  size="sm"
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  disabled={loading}
                  onClick={() => setCurrentPage(pageNumber)}
                  className="min-w-9"
                >
                  {pageNumber}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loading || currentPage >= totalMovementPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalMovementPages, prev + 1))}
              >
                Proxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GuardhouseDashboard;
