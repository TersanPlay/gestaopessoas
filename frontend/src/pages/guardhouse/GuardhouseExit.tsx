import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeftCircle, Search } from 'lucide-react';
import { guardhouseApi, type GuardhouseMovement } from '@/services/guardhouseApi';

const GuardhouseExit = () => {
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [activeMovements, setActiveMovements] = useState<GuardhouseMovement[]>([]);
  const [exitNotesById, setExitNotesById] = useState<Record<string, string>>({});

  const fetchActive = async (currentPlate?: string) => {
    setLoading(true);
    try {
      const data = await guardhouseApi.getMovements({
        status: 'PRESENT',
        plate: currentPlate && currentPlate.trim().length > 0 ? currentPlate : undefined,
        limit: 50,
      });
      setActiveMovements(data);
    } catch (error) {
      console.error('Failed to fetch active movements', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActive();
  }, []);

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    await fetchActive(plate);
  };

  const finalizeExit = async (movementId: string) => {
    setFinishingId(movementId);
    try {
      await guardhouseApi.registerExit(movementId, exitNotesById[movementId]);
      await fetchActive(plate);
    } catch (error) {
      console.error('Failed to register exit', error);
      alert('Nao foi possivel registrar a saida.');
    } finally {
      setFinishingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registro de Saida</h1>
        <p className="text-muted-foreground">Localize movimentacoes ativas e finalize a saida do veiculo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Busca por placa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 md:flex-row" onSubmit={onSearch}>
            <Input
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="Digite a placa"
              className="md:max-w-xs"
            />
            <div className="flex gap-2">
              <Button type="submit">Buscar</Button>
              <Button type="button" variant="outline" onClick={() => fetchActive()}>
                Limpar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftCircle className="h-5 w-5" />
            Movimentacoes em aberto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}

          {!loading &&
            activeMovements.map((movement) => (
              <div key={movement.id} className="rounded border bg-muted/30 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {movement.vehicle.plate} • {movement.spot.code}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Condutor: {movement.driver?.fullName ?? 'Nao informado'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Entrada: {new Date(movement.entryAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <p className="text-sm font-medium">
                    Tempo parcial:{' '}
                    {Math.max(
                      1,
                      Math.round((Date.now() - new Date(movement.entryAt).getTime()) / (1000 * 60)),
                    )}{' '}
                    min
                  </p>
                </div>

                <div className="mt-3 flex flex-col gap-2 md:flex-row">
                  <Input
                    value={exitNotesById[movement.id] ?? ''}
                    onChange={(e) =>
                      setExitNotesById((prev) => ({
                        ...prev,
                        [movement.id]: e.target.value,
                      }))
                    }
                    placeholder="Observacoes de saida (opcional)"
                  />
                  <Button disabled={finishingId === movement.id} onClick={() => finalizeExit(movement.id)}>
                    {finishingId === movement.id ? 'Finalizando...' : 'Registrar Saida'}
                  </Button>
                </div>
              </div>
            ))}

          {!loading && activeMovements.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma movimentacao em aberto encontrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GuardhouseExit;
