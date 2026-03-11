import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, User, Building, MapPin, List, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isPast, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Visit {
  id: string;
  date: string;
  status: 'PENDING' | 'CHECKIN' | 'CHECKOUT' | 'CANCELLED';
  motive: string;
  visitor: {
    name: string;
    document: string;
    photo?: string;
  };
  host?: {
    name: string;
  };
  department?: {
    name: string;
  };
}

const Agenda = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/visits');
      // Filter only pending visits and sort by date
      let pendingVisits = response.data
        .filter((v: Visit) => v.status === 'PENDING')
        .sort((a: Visit, b: Visit) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setVisits(pendingVisits);
    } catch (error) {
      console.error('Failed to fetch agenda', error);
    } finally {
      setLoading(false);
    }
  };

  const groupVisitsByDate = () => {
    const grouped: { [key: string]: Visit[] } = {};
    visits.forEach(visit => {
      const dateKey = format(parseISO(visit.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(visit);
    });
    return grouped;
  };

  const getDayLabel = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  const groupedVisits = groupVisitsByDate();
  const sortedDates = Object.keys(groupedVisits).sort();

  // Calendar Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days for start of month
  const startDayOfWeek = monthStart.getDay(); // 0 (Sun) to 6 (Sat)
  const prefixDays = Array.from({ length: startDayOfWeek }).map((_, i) => i);

  const getVisitsForDay = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return groupedVisits[dateKey] || [];
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const selectedDateVisits = selectedDate 
    ? getVisitsForDay(selectedDate) 
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Agenda de Visitas</h1>
          <p className="text-muted-foreground mt-1">Próximas visitas agendadas.</p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg">
            <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('list')}
                className="gap-2"
            >
                <List className="h-4 w-4" /> Lista
            </Button>
            <Button 
                variant={viewMode === 'calendar' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('calendar')}
                className="gap-2"
            >
                <CalendarIcon className="h-4 w-4" /> Calendário
            </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : sortedDates.length === 0 && viewMode === 'list' ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
          <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhuma visita agendada</p>
          <p className="text-sm">As novas visitas agendadas aparecerão aqui.</p>
        </div>
      ) : (
        <>
            {viewMode === 'list' && (
                <div className="space-y-8">
                {sortedDates.map(dateKey => (
                    <div key={dateKey} className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold capitalize text-primary">
                        {getDayLabel(dateKey)}
                        </h2>
                        <div className="h-px flex-1 bg-border/60" />
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {groupedVisits[dateKey].map(visit => {
                        const visitDate = parseISO(visit.date);
                        const isLate = isPast(visitDate) && isToday(visitDate);
                        
                        return (
                            <Card key={visit.id} className={`card-corporate border-l-4 ${isLate ? 'border-l-orange-500' : 'border-l-primary'}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    {format(visitDate, 'HH:mm')}
                                </CardTitle>
                                {isLate && (
                                    <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                                    Pendente
                                    </span>
                                )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <User className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">{visit.visitor.name}</p>
                                    <p className="text-xs text-muted-foreground">Doc: {visit.visitor.document}</p>
                                </div>
                                </div>

                                <div className="pt-2 border-t border-border/50 space-y-1.5">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="truncate">Local: {visit.department?.name || 'N/A'}</span>
                                </div>
                                {visit.host && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                    <Building className="h-3.5 w-3.5" />
                                    <span className="truncate">Anfitrião: {visit.host.name}</span>
                                    </div>
                                )}
                                </div>
                                
                                <div className="pt-2">
                                <span className="inline-block bg-muted px-2 py-1 rounded-md text-xs font-medium text-muted-foreground">
                                    {visit.motive}
                                </span>
                                </div>
                            </CardContent>
                            </Card>
                        );
                        })}
                    </div>
                    </div>
                ))}
                </div>
            )}

            {viewMode === 'calendar' && (
                <div className="grid lg:grid-cols-[1fr_350px] gap-8">
                    <Card className="p-6 h-fit bg-gradient-to-br from-background via-muted/30 to-primary/10 overflow-x-auto">
                        <div className="min-w-[600px]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold capitalize">
                                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                                </h2>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="icon" onClick={prevMonth}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={nextMonth}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                    <div key={day} className="text-sm font-medium text-muted-foreground py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1">
                                {prefixDays.map(i => (
                                    <div key={`empty-${i}`} className="h-24 bg-muted/20 rounded-md" />
                                ))}
                                
                                {calendarDays.map(day => {
                                    const dayVisits = getVisitsForDay(day);
                                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                                    const isCurrentMonth = isSameMonth(day, currentMonth);

                                    return (
                                        <div 
                                            key={day.toISOString()}
                                            onClick={() => setSelectedDate(day)}
                                            className={`
                                                h-24 p-2 rounded-md border cursor-pointer transition-all duration-200 relative
                                                ${!isCurrentMonth ? 'opacity-50 bg-muted/10' : 'bg-background'}
                                                ${isSelected 
                                                    ? 'border-primary ring-1 ring-primary bg-gradient-to-br from-primary/10 to-background shadow-sm' 
                                                    : 'hover:border-primary/50 hover:shadow-sm'
                                                }
                                            `}
                                        >
                                            <div className="text-right text-sm font-medium mb-1">
                                                {format(day, 'd')}
                                            </div>
                                            <div className="space-y-1">
                                                {dayVisits.slice(0, 3).map((visit, idx) => (
                                                    <div key={idx} className="text-[10px] bg-primary/10 text-primary px-1 rounded truncate">
                                                        {format(parseISO(visit.date), 'HH:mm')} - {visit.visitor.name}
                                                    </div>
                                                ))}
                                                {dayVisits.length > 3 && (
                                                    <div className="text-[10px] text-muted-foreground text-center">
                                                        +{dayVisits.length - 3} mais
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>

                    {/* Side Panel for Selected Date */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">
                                {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
                            </h3>
                            {selectedDateVisits.length > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    {selectedDateVisits.length} visita(s)
                                </span>
                            )}
                        </div>

                        {selectedDateVisits.length === 0 ? (
                            <Card className="bg-gradient-to-br from-muted/30 to-background border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                                    <CalendarIcon className="h-10 w-10 mb-3 opacity-20" />
                                    <p>Nenhuma visita para este dia.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {selectedDateVisits.map(visit => {
                                    const visitDate = parseISO(visit.date);
                                    return (
                                        <Card key={visit.id} className="card-corporate overflow-hidden transition-all duration-200 hover:shadow-md hover:bg-gradient-to-r hover:from-background hover:to-muted/20">
                                            <div className="flex">
                                                <div className="w-16 bg-muted/50 flex flex-col items-center justify-center border-r p-2 text-center">
                                                    <span className="text-lg font-bold text-primary">
                                                        {format(visitDate, 'HH:mm')}
                                                    </span>
                                                </div>
                                                <div className="p-3 flex-1 min-w-0">
                                                    <h4 className="font-medium truncate">{visit.visitor.name}</h4>
                                                    <p className="text-xs text-muted-foreground truncate mb-2">
                                                        Doc: {visit.visitor.document}
                                                    </p>
                                                    
                                                    <div className="space-y-1 mb-2">
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <MapPin className="h-3 w-3" />
                                                            <span className="truncate">{visit.department?.name || 'Sem departamento'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <User className="h-3 w-3" />
                                                            <span className="truncate">{visit.host?.name || 'Sem anfitrião'}</span>
                                                        </div>
                                                    </div>

                                                    {visit.motive && (
                                                        <span className="inline-block bg-muted px-2 py-0.5 rounded text-[10px] font-medium text-muted-foreground">
                                                            {visit.motive}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default Agenda;
