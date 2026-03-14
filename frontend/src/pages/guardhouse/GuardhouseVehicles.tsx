import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CarFront, Search } from 'lucide-react';
import { guardhouseApi, type GuardhouseVehicle } from '@/services/guardhouseApi';

const categoryLabel: Record<GuardhouseVehicle['category'], string> = {
  OFFICIAL: 'Oficial',
  EMPLOYEE: 'Servidor',
  VISITOR: 'Visitante',
  CONTRACTOR: 'Prestador',
};

const GuardhouseVehicles = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vehicles, setVehicles] = useState<GuardhouseVehicle[]>([]);

  const fetchVehicles = async (query?: string) => {
    setLoading(true);
    try {
      const data = await guardhouseApi.getVehicles({
        search: query && query.trim().length > 0 ? query : undefined,
      });
      setVehicles(data);
    } catch (error) {
      console.error('Failed to load guardhouse vehicles', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    await fetchVehicles(search);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Veiculos</h1>
        <p className="text-muted-foreground">Consulta e acompanhamento dos veiculos que passam pela guarita.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-2 md:flex-row" onSubmit={handleSearch}>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Placa, marca ou modelo"
              className="md:max-w-sm"
            />
            <div className="flex gap-2">
              <Button type="submit">Aplicar filtro</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch('');
                  fetchVehicles();
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
            <CarFront className="h-5 w-5" />
            Lista de Veiculos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca/Modelo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading &&
                vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-mono font-semibold">{vehicle.plate}</TableCell>
                    <TableCell>{categoryLabel[vehicle.category]}</TableCell>
                    <TableCell>{vehicle.vehicleType === 'CAR' ? 'Carro' : 'Moto'}</TableCell>
                    <TableCell>
                      {[vehicle.brand, vehicle.model].filter(Boolean).join(' / ') || '-'}
                    </TableCell>
                    <TableCell>{vehicle.isActive ? 'Ativo' : 'Inativo'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/guardhouse/vehicles/${vehicle.id}`)}>
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && vehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum veiculo encontrado.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
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

export default GuardhouseVehicles;
