import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardList, Filter } from 'lucide-react';
import { guardhouseApi, type GuardhouseMovement, type MovementStatus } from '@/services/guardhouseApi';

const statusLabel: Record<MovementStatus, string> = {
  PRESENT: 'Presente',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

const GuardhouseMovements = () => {
  const [loading, setLoading] = useState(true);
  const [plate, setPlate] = useState('');
  const [status, setStatus] = useState<'ALL' | MovementStatus>('ALL');
  const [movements, setMovements] = useState<GuardhouseMovement[]>([]);

  const fetchMovements = useCallback(async (currentPlate = plate, currentStatus = status) => {
    setLoading(true);
    try {
      const data = await guardhouseApi.getMovements({
        plate: currentPlate.trim().length > 0 ? currentPlate : undefined,
        status: currentStatus === 'ALL' ? undefined : currentStatus,
        limit: 150,
      });
      setMovements(data);
    } catch (error) {
      console.error('Failed to load guardhouse movements', error);
    } finally {
      setLoading(false);
    }
  }, [plate, status]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const handleFilter = async (event: FormEvent) => {
    event.preventDefault();
    await fetchMovements();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historico de Movimentacoes</h1>
        <p className="text-muted-foreground">Consulta consolidada de entradas e saidas da guarita.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={handleFilter}>
            <Input
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="Placa"
            />
            <Select value={status} onValueChange={(value: 'ALL' | MovementStatus) => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="PRESENT">Presentes</SelectItem>
                <SelectItem value="FINISHED">Finalizados</SelectItem>
                <SelectItem value="CANCELLED">Cancelados</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button type="submit">Filtrar</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPlate('');
                  setStatus('ALL');
                  void fetchMovements('', 'ALL');
                }}
              >
                Limpar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Movimentacoes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Condutor</TableHead>
                <TableHead>Vaga</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saida</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permanencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading &&
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-mono font-semibold">{movement.vehicle.plate}</TableCell>
                    <TableCell>{movement.driver?.fullName ?? '-'}</TableCell>
                    <TableCell>{movement.spot.code}</TableCell>
                    <TableCell>{new Date(movement.entryAt).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{movement.exitAt ? new Date(movement.exitAt).toLocaleString('pt-BR') : '-'}</TableCell>
                    <TableCell>{statusLabel[movement.status]}</TableCell>
                    <TableCell>{movement.durationMinutes ? `${movement.durationMinutes} min` : '-'}</TableCell>
                  </TableRow>
                ))}
              {!loading && movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhuma movimentacao encontrada.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default GuardhouseMovements;

