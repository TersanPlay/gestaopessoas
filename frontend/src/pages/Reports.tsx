import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Download, Filter, FileBarChart, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { reportsService } from '../services/api';
import api from '../services/api';
import { cn } from "@/lib/utils";

interface Department {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 10;

export default function Reports() {
  const [date, setDate] = useState<{ from: Date; to: Date } | undefined>({
    from: new Date(),
    to: new Date()
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (error) {
      console.error("Erro ao buscar departamentos", error);
    }
  };

  const handleGenerateReport = useCallback(async () => {
    // If called from button click, use current state. 
    // If called from useEffect, use initial state or current state.
    // However, since we want initial load to use today's date, and we set initial state above,
    // we just need to ensure we access the state correctly.
    
    // We need to access the state values. Since this is inside useCallback, we need deps.
    // But we want to call it on mount.
    // Let's refactor slightly to avoid stale closures if we use it in useEffect.
    
    // Actually, better to just define the function and call it.
    
    // We will use the 'date' state which is initialized to today.
    const dateToUse = date || { from: new Date(), to: new Date() };

    if (!dateToUse.from) {
        alert("Selecione pelo menos a data inicial");
        return;
    }

    setLoading(true);
    try {
      const params = {
        startDate: dateToUse.from.toISOString(),
        endDate: dateToUse.to ? dateToUse.to.toISOString() : dateToUse.from.toISOString(),
        departmentId: selectedDept,
        status: status
      };

      const [visitsData, statsData] = await Promise.all([
        reportsService.getVisits(params),
        reportsService.getStats(params)
      ]);

      setReportData(visitsData);
      setStats(statsData);
      setCurrentPage(1); // Reset to first page on new search
    } catch (error) {
      console.error("Erro ao gerar relatório", error);
      alert("Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  }, [date, selectedDept, status]);

  useEffect(() => {
    fetchDepartments();
    handleGenerateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initial load only

  // Trigger search on mount (and when dependencies change if we wanted auto-search, 
  // but user might want manual search. User asked for "ao abrir a pagina".
  // So we keep the initial useEffect, but we need to make sure handleGenerateReport is stable or called correctly.
  
  // Let's just call it in a separate useEffect that depends on nothing to run once, 
  // but we need to make sure it uses the initial state.
  
  // Refactor: move fetch logic to a standalone function that accepts params, 
  // or just rely on state being initialized.
  
  // Simplified approach:
  // 1. Initialize state with today (Done above)
  // 2. Add useEffect to call handleGenerateReport on mount.
  // 3. handleGenerateReport uses current state.

  const totalPages = Math.ceil(reportData.length / ITEMS_PER_PAGE);
  const currentData = reportData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
    }
  };


  const handleExportCSV = () => {
    if (reportData.length === 0) return;

    const headers = ["Data/Hora", "Visitante", "Documento", "Departamento", "Anfitrião", "Status"];
    const rows = reportData.map(visit => [
        new Date(visit.date).toLocaleString(),
        visit.visitor.name,
        visit.visitor.document,
        visit.department?.name || '-',
        visit.host?.name || '-',
        visit.status
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_visitas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient flex items-center gap-2">
            <FileBarChart className="h-8 w-8" /> Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">Extraia dados consolidados e estatísticas do sistema.</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 items-end">
            <div className="grid gap-2">
                <label className="text-sm font-medium">Período</label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "dd/MM/yyyy")} -{" "}
                                        {format(date.to, "dd/MM/yyyy")}
                                    </>
                                ) : (
                                    format(date.from, "dd/MM/yyyy")
                                )
                            ) : (
                                <span>Selecione uma data</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                            locale={ptBR}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="grid gap-2">
                <label className="text-sm font-medium">Departamento</label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        {departments.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        <SelectItem value="PENDING">Pendente</SelectItem>
                        <SelectItem value="CHECKIN">Realizada</SelectItem>
                        <SelectItem value="CANCELLED">Cancelada</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button onClick={handleGenerateReport} disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Gerar Relatório"}
            </Button>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
          <div className="grid gap-4 md:grid-cols-3">
              <Card>
                  <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total de Visitas</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{stats.totalVisits}</div>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold text-red-600">{stats.cancelledVisits}</div>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Top Departamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="text-lg font-bold truncate">
                          {stats.departmentStats.length > 0 
                            ? stats.departmentStats.sort((a: any, b: any) => b.count - a.count)[0].name 
                            : '-'}
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      {/* Results Table */}
      {reportData.length > 0 && (
          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Resultados ({reportData.length})</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                      <Download className="mr-2 h-4 w-4" /> Exportar CSV
                  </Button>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Data/Hora</TableHead>
                              <TableHead>Visitante</TableHead>
                              <TableHead>Documento</TableHead>
                              <TableHead>Departamento</TableHead>
                              <TableHead>Anfitrião</TableHead>
                              <TableHead>Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {currentData.map((visit) => (
                              <TableRow key={visit.id}>
                                  <TableCell>{new Date(visit.date).toLocaleString()}</TableCell>
                                  <TableCell>{visit.visitor.name}</TableCell>
                                  <TableCell>{visit.visitor.document}</TableCell>
                                  <TableCell>{visit.department?.name || '-'}</TableCell>
                                  <TableCell>{visit.host?.name || '-'}</TableCell>
                                  <TableCell>
                                    <span className={cn(
                                        "px-2 py-1 rounded-full text-xs font-semibold",
                                        visit.status === 'PENDING' && "bg-yellow-100 text-yellow-800",
                                        visit.status === 'CHECKIN' && "bg-green-100 text-green-800",
                                        visit.status === 'CHECKOUT' && "bg-gray-100 text-gray-800",
                                        visit.status === 'CANCELLED' && "bg-red-100 text-red-800"
                                    )}>
                                        {visit.status}
                                    </span>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </div>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Próximo
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>
              </CardContent>
          </Card>
      )}
    </div>
  );
}
