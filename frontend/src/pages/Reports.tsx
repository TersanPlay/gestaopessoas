import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from "jspdf";
import {
  Calendar as CalendarIcon,
  Download,
  Filter,
  FileBarChart,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Building2,
  Clock3,
  Users,
} from "lucide-react";
import { reportsService } from '../services/api';
import api from '../services/api';
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";

interface Department {
  id: string;
  name: string;
}

type VisitStatus = 'PENDING' | 'CHECKIN' | 'CHECKOUT' | 'CANCELLED';
type GroupMode = 'day' | 'week' | 'month';

interface VisitReportItem {
  id: string;
  date: string;
  status: VisitStatus;
  accessCode?: string | null;
  motive?: string | null;
  visitor: {
    name: string;
    document: string;
  };
  host?: {
    name: string;
    email?: string;
  } | null;
  department?: {
    name: string;
  } | null;
}

interface DepartmentSummary {
  name: string;
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  share: number;
}

const ITEMS_PER_PAGE = 10;
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const HOUR_START = 7;
const HOUR_END = 20;

const normalizeDayIndex = (jsDay: number) => (jsDay + 6) % 7;
const isCompletedStatus = (status: VisitStatus) => status === 'CHECKIN' || status === 'CHECKOUT';

const statusLabel = (status: VisitStatus) => {
  if (status === 'CHECKIN') return 'Em andamento';
  if (status === 'CHECKOUT') return 'Concluida';
  if (status === 'PENDING') return 'Pendente';
  return 'Cancelada';
};

const statusBadgeClass = (status: VisitStatus) => cn(
  "px-2 py-1 rounded-full text-xs font-semibold",
  status === 'PENDING' && "bg-yellow-100 text-yellow-800",
  status === 'CHECKIN' && "bg-blue-100 text-blue-800",
  status === 'CHECKOUT' && "bg-green-100 text-green-800",
  status === 'CANCELLED' && "bg-red-100 text-red-800"
);

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [groupMode, setGroupMode] = useState<GroupMode>('day');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<VisitReportItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (error) {
      console.error("Erro ao buscar departamentos", error);
    }
  };

  const handleGenerateReport = async () => {
    const fromDate = dateRange?.from ?? new Date();
    const toDate = dateRange?.to ?? fromDate;

    setLoading(true);
    try {
      const params = {
        startDate: startOfDay(fromDate).toISOString(),
        endDate: endOfDay(toDate).toISOString(),
        departmentId: selectedDept,
        status,
      };

      const visitsData = await reportsService.getVisits(params);
      setReportData(visitsData);
      setCurrentPage(1);
    } catch (error) {
      console.error("Erro ao gerar relatorio", error);
      alert("Erro ao gerar relatorio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    void handleGenerateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalVisits = reportData.length;
  const completedVisits = reportData.filter((visit) => isCompletedStatus(visit.status)).length;
  const pendingVisits = reportData.filter((visit) => visit.status === 'PENDING').length;
  const cancelledVisits = reportData.filter((visit) => visit.status === 'CANCELLED').length;
  const completionRate = totalVisits > 0 ? (completedVisits / totalVisits) * 100 : 0;

  const fromDate = dateRange?.from ?? new Date();
  const toDate = dateRange?.to ?? fromDate;
  const selectedDays = Math.max(1, Math.ceil((endOfDay(toDate).getTime() - startOfDay(fromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const averagePerDay = totalVisits / selectedDays;

  const periodMap = new Map<number, { label: string; total: number; completed: number; cancelled: number }>();
  const evolutionMap = new Map<number, { label: string; total: number; cancelled: number }>();
  const departmentsMap = new Map<string, DepartmentSummary>();
  const hostsMap = new Map<string, number>();
  const weekdayMap = WEEKDAYS.map((day) => ({ day, total: 0, completed: 0, cancelled: 0 }));
  const hourMap = Array.from({ length: 24 }, (_, hour) => ({ hour, visits: 0 }));
  const heatmap = WEEKDAYS.map(() => Array.from({ length: HOUR_END - HOUR_START + 1 }, () => 0));

  for (const visit of reportData) {
    const visitDate = new Date(visit.date);
    if (Number.isNaN(visitDate.getTime())) continue;

    let periodStart = startOfDay(visitDate);
    let periodLabel = format(periodStart, "dd/MM", { locale: ptBR });

    if (groupMode === 'week') {
      periodStart = startOfWeek(visitDate, { weekStartsOn: 1 });
      periodLabel = `Sem ${format(periodStart, "dd/MM", { locale: ptBR })}`;
    }

    if (groupMode === 'month') {
      periodStart = startOfMonth(visitDate);
      periodLabel = format(periodStart, "MMM/yyyy", { locale: ptBR });
    }

    const periodKey = periodStart.getTime();
    const currentPeriod = periodMap.get(periodKey) ?? {
      label: periodLabel,
      total: 0,
      completed: 0,
      cancelled: 0,
    };
    currentPeriod.total += 1;
    if (isCompletedStatus(visit.status)) currentPeriod.completed += 1;
    if (visit.status === 'CANCELLED') currentPeriod.cancelled += 1;
    periodMap.set(periodKey, currentPeriod);

    const evolutionKey = startOfDay(visitDate).getTime();
    const currentEvolution = evolutionMap.get(evolutionKey) ?? {
      label: format(startOfDay(visitDate), "dd/MM", { locale: ptBR }),
      total: 0,
      cancelled: 0,
    };
    currentEvolution.total += 1;
    if (visit.status === 'CANCELLED') currentEvolution.cancelled += 1;
    evolutionMap.set(evolutionKey, currentEvolution);

    const departmentName = visit.department?.name || 'Sem departamento';
    const currentDepartment = departmentsMap.get(departmentName) ?? {
      name: departmentName,
      total: 0,
      completed: 0,
      cancelled: 0,
      pending: 0,
      share: 0,
    };
    currentDepartment.total += 1;
    if (isCompletedStatus(visit.status)) currentDepartment.completed += 1;
    if (visit.status === 'CANCELLED') currentDepartment.cancelled += 1;
    if (visit.status === 'PENDING') currentDepartment.pending += 1;
    departmentsMap.set(departmentName, currentDepartment);

    const hostName = visit.host?.name || 'Sem responsável';
    hostsMap.set(hostName, (hostsMap.get(hostName) ?? 0) + 1);

    const weekdayIndex = normalizeDayIndex(visitDate.getDay());
    weekdayMap[weekdayIndex].total += 1;
    if (isCompletedStatus(visit.status)) weekdayMap[weekdayIndex].completed += 1;
    if (visit.status === 'CANCELLED') weekdayMap[weekdayIndex].cancelled += 1;

    const hour = visitDate.getHours();
    hourMap[hour].visits += 1;

    if (hour >= HOUR_START && hour <= HOUR_END) {
      heatmap[weekdayIndex][hour - HOUR_START] += 1;
    }
  }

  const visitsByPeriod = Array.from(periodMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);

  const evolutionData = Array.from(evolutionMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);

  const departmentSummary = Array.from(departmentsMap.values())
    .map((item) => ({
      ...item,
      share: totalVisits > 0 ? (item.total / totalVisits) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const topDepartments = departmentSummary.slice(0, 8);

  const topHosts = Array.from(hostsMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const peakHour = hourMap.reduce((best, current) => current.visits > best.visits ? current : best, hourMap[0]);
  const peakWeekday = weekdayMap.reduce((best, current) => current.total > best.total ? current : best, weekdayMap[0]);

  const hourChartData = hourMap
    .filter((item) => item.hour >= HOUR_START && item.hour <= HOUR_END)
    .map((item) => ({
      hour: `${String(item.hour).padStart(2, '0')}h`,
      visits: item.visits,
    }));

  const heatmapMax = Math.max(...heatmap.flat(), 1);
  const hourHeaders = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => `${String(HOUR_START + i).padStart(2, '0')}h`);

  const totalPages = Math.ceil(reportData.length / ITEMS_PER_PAGE);
  const currentData = reportData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) return;

    const headers = ["Data/Hora", "Visitante", "Documento", "Departamento", "Responsável", "Status"];
    const rows = reportData.map((visit) => [
      new Date(visit.date).toLocaleString('pt-BR'),
      visit.visitor.name,
      visit.visitor.document,
      visit.department?.name || '-',
      visit.host?.name || '-',
      statusLabel(visit.status),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_visitas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (reportData.length === 0) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const selectedDepartmentName =
      selectedDept === 'ALL'
        ? 'Todos'
        : departments.find((dept) => dept.id === selectedDept)?.name || 'Todos';
    const selectedStatusLabel = status === 'ALL' ? 'Todos' : statusLabel(status as VisitStatus);

    const columns = [
      { label: 'Data/Hora', width: 37, getValue: (visit: VisitReportItem) => new Date(visit.date).toLocaleString('pt-BR') },
      { label: 'Visitante', width: 50, getValue: (visit: VisitReportItem) => visit.visitor.name },
      { label: 'Documento', width: 34, getValue: (visit: VisitReportItem) => visit.visitor.document },
      { label: 'Departamento', width: 44, getValue: (visit: VisitReportItem) => visit.department?.name || '-' },
      { label: 'Responsável', width: 50, getValue: (visit: VisitReportItem) => visit.host?.name || '-' },
      { label: 'Status', width: 22, getValue: (visit: VisitReportItem) => statusLabel(visit.status) },
    ];

    let currentX = margin;
    const resolvedColumns = columns.map((column) => {
      const resolved = { ...column, x: currentX };
      currentX += column.width;
      return resolved;
    });

    const truncateToWidth = (value: string, maxWidth: number) => {
      if (doc.getTextWidth(value) <= maxWidth) return value;
      let text = value;
      while (text.length > 0 && doc.getTextWidth(`${text}...`) > maxWidth) {
        text = text.slice(0, -1);
      }
      return `${text}...`;
    };

    let y = 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Relatorio de Visitas - Detalhamento', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const periodFrom = format(fromDate, 'dd/MM/yyyy');
    const periodTo = format(toDate, 'dd/MM/yyyy');
    doc.text(`Periodo: ${periodFrom} a ${periodTo}`, margin, y);
    doc.text(`Departamento: ${selectedDepartmentName}`, margin + 80, y);
    doc.text(`Status: ${selectedStatusLabel}`, margin + 160, y);
    y += 5;
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, y);
    y += 7;

    const drawTableHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      for (const column of resolvedColumns) {
        doc.text(column.label, column.x, y);
      }
      y += 1.5;
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4.5;
    };

    drawTableHeader();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    for (const visit of reportData) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = 12;
        drawTableHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }

      for (const column of resolvedColumns) {
        const rawValue = String(column.getValue(visit));
        const value = truncateToWidth(rawValue, column.width - 2);
        doc.text(value, column.x, y);
      }

      y += 4.5;
    }

    doc.save(`relatorio_visitas_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient flex items-center gap-2">
            <FileBarChart className="h-8 w-8" /> Dashboard Analitico de Visitas
          </h1>
          <p className="text-muted-foreground mt-1">
            Painel consolidado com indicadores, graficos e tabelas para analise do fluxo institucional.
          </p>
        </div>
      </div>

      <Card className="sticky top-2 z-30 border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" /> Filtros e Segmentacao
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 items-end">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Periodo</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
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
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
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
                {departments.map((dept) => (
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
                <SelectItem value="CHECKIN">Em andamento</SelectItem>
                <SelectItem value="CHECKOUT">Concluida</SelectItem>
                <SelectItem value="CANCELLED">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleGenerateReport} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Atualizar analise"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de visitas</CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalVisits}</div>
            <p className="text-xs text-muted-foreground mt-1">No periodo filtrado</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Taxa de conclusao</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{completionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{completedVisits} concluidas de {totalVisits}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Media diaria</CardTitle>
            <Clock3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{averagePerDay.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">Visitas por dia no periodo</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Canceladas</CardTitle>
            <FileText className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{cancelledVisits}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalVisits > 0 ? ((cancelledVisits / totalVisits) * 100).toFixed(1) : "0.0"}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Departamento lider</CardTitle>
            <Building2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-gray-900 truncate">{departmentSummary[0]?.name || "-"}</div>
            <p className="text-xs text-muted-foreground mt-1">{departmentSummary[0]?.total || 0} visitas</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Maior fluxo semanal</CardTitle>
            <Clock3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-gray-900">
              {peakWeekday?.day || "-"} • {String(peakHour?.hour ?? 0).padStart(2, "0")}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {peakWeekday?.total || 0} visitas no dia mais movimentado
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Visitas por periodo</CardTitle>
            <div className="flex items-center gap-1 rounded-md border p-1">
              <Button type="button" size="sm" variant={groupMode === 'day' ? 'default' : 'ghost'} onClick={() => setGroupMode('day')}>Dia</Button>
              <Button type="button" size="sm" variant={groupMode === 'week' ? 'default' : 'ghost'} onClick={() => setGroupMode('week')}>Semana</Button>
              <Button type="button" size="sm" variant={groupMode === 'month' ? 'default' : 'ghost'} onClick={() => setGroupMode('month')}>Mes</Button>
            </div>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitsByPeriod}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="total" name="Total" stroke="#2563eb" fill="#93c5fd" fillOpacity={0.35} />
                <Area type="monotone" dataKey="completed" name="Concluidas" stroke="#16a34a" fill="#86efac" fillOpacity={0.25} />
                <Area type="monotone" dataKey="cancelled" name="Canceladas" stroke="#dc2626" fill="#fecaca" fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolucao temporal (dia a dia)</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" name="Visitas" stroke="#0f766e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cancelled" name="Canceladas" stroke="#b91c1c" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Departamentos mais visitados</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDepartments} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={130} />
                <Tooltip />
                <Bar dataKey="total" name="Visitas" fill="#2563eb" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horarios de maior fluxo (semana)</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="visits" name="Visitas" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Heatmap de fluxo por dia e horario</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <div className="min-w-[900px] space-y-2">
            <div className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(${hourHeaders.length}, minmax(42px, 1fr))` }}>
              <div className="text-xs font-medium text-muted-foreground">Dia / Hora</div>
              {hourHeaders.map((hour) => (
                <div key={hour} className="text-xs font-medium text-center text-muted-foreground">{hour}</div>
              ))}
              {WEEKDAYS.map((day, dayIndex) => (
                <div key={day} className="contents">
                  <div className="text-sm font-medium py-1">{day}</div>
                  {heatmap[dayIndex].map((value, hourIndex) => {
                    const intensity = value / heatmapMax;
                    const bg = `rgba(37, 99, 235, ${0.08 + intensity * 0.82})`;
                    return (
                      <div
                        key={`${day}-${hourIndex}`}
                        className="h-8 rounded-sm border text-[11px] flex items-center justify-center"
                        style={{ backgroundColor: bg }}
                        title={`${day} ${hourHeaders[hourIndex]}: ${value} visitas`}
                      >
                        {value > 0 ? value : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Relatorio consolidado por departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Visitas</TableHead>
                  <TableHead className="text-right">Concluidas</TableHead>
                  <TableHead className="text-right">Canceladas</TableHead>
                  <TableHead className="text-right">Participacao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departmentSummary.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.total}</TableCell>
                    <TableCell className="text-right text-emerald-700">{item.completed}</TableCell>
                    <TableCell className="text-right text-red-700">{item.cancelled}</TableCell>
                    <TableCell className="text-right">{item.share.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking de responsáveis e fluxo semanal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Visitas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topHosts.map((host) => (
                  <TableRow key={host.name}>
                    <TableCell className="font-medium">{host.name}</TableCell>
                    <TableCell className="text-right">{host.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Concluidas</TableHead>
                  <TableHead className="text-right">Canceladas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weekdayMap.map((day) => (
                  <TableRow key={day.day}>
                    <TableCell className="font-medium">{day.day}</TableCell>
                    <TableCell className="text-right">{day.total}</TableCell>
                    <TableCell className="text-right text-emerald-700">{day.completed}</TableCell>
                    <TableCell className="text-right text-red-700">{day.cancelled}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {reportData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detalhamento de visitas ({reportData.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="mr-2 h-4 w-4" /> Exportar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Visitante</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell>{new Date(visit.date).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{visit.visitor.name}</TableCell>
                    <TableCell>{visit.visitor.document}</TableCell>
                    <TableCell>{visit.department?.name || '-'}</TableCell>
                    <TableCell>{visit.host?.name || '-'}</TableCell>
                    <TableCell>
                      <span className={statusBadgeClass(visit.status)}>{statusLabel(visit.status)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Pagina {currentPage} de {totalPages}
              </div>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  Proximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && reportData.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhuma visita encontrada para os filtros selecionados.
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground">
        Indicadores principais: pendentes {pendingVisits} | concluidas {completedVisits} | canceladas {cancelledVisits}.
      </div>
    </div>
  );
}
