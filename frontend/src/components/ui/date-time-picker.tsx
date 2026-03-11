'use client'

import { useState, useEffect, useMemo } from 'react'
import { CheckCircle2, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  value?: Date
  onChange: (date: Date) => void
  className?: string
  minHour?: number
  maxHour?: number
  step?: number // in minutes
  disabledDates?: Date[]
}

export function DateTimePicker({ 
  value, 
  onChange, 
  className,
  minHour = 9,
  maxHour = 18,
  step = 15,
  disabledDates = []
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value)
  const [selectedTime, setSelectedTime] = useState<string | null>(
    value ? format(value, 'HH:mm') : null
  )

  // Sync internal state with external value prop
  useEffect(() => {
    if (value) {
      setSelectedDate(value)
      setSelectedTime(format(value, 'HH:mm'))
    }
  }, [value])

  // Trigger onChange when both date and time are selected
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const newDateTime = new Date(selectedDate)
      newDateTime.setHours(hours)
      newDateTime.setMinutes(minutes)
      
      // Only trigger if different from current value
      if (!value || newDateTime.getTime() !== value.getTime()) {
        onChange(newDateTime)
      }
    }
  }, [selectedDate, selectedTime])

  const timeSlots = useMemo(() => {
    const slots = []
    const totalMinutesStart = minHour * 60
    const totalMinutesEnd = maxHour * 60
    
    for (let m = totalMinutesStart; m <= totalMinutesEnd; m += step) {
      const h = Math.floor(m / 60)
      const min = m % 60
      slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`)
    }
    return slots
  }, [minHour, maxHour, step])

  const handleToday = () => {
    const now = new Date()
    setSelectedDate(now)
    setSelectedTime(format(now, 'HH:mm'))
  }

  return (
    <div className={cn("w-full max-w-sm", className)}>
      <Card className='gap-0 p-0 shadow-none border-0 sm:border'>
        <CardHeader className='flex flex-row items-center justify-between h-max border-b !p-4'>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Selecione Data e Hora
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleToday} type="button" className="h-7 text-xs">
            Hoje
          </Button>
        </CardHeader>
        <CardContent className='relative p-0 md:pr-48'>
          <div className='p-6 flex justify-center'>
            <Calendar
              mode='single'
              selected={selectedDate}
              onSelect={setSelectedDate}
              defaultMonth={selectedDate}
              showOutsideDays={false}
              locale={ptBR}
              disabled={disabledDates}
              modifiers={{
                booked: disabledDates
              }}
              modifiersClassNames={{
                booked: '[&>button]:line-through opacity-50'
              }}
              className='bg-transparent p-0'
            />
          </div>
          <div className='inset-y-0 right-0 flex w-full flex-col gap-4 border-t max-md:h-60 md:absolute md:w-48 md:border-t-0 md:border-l'>
            <ScrollArea className='h-full'>
              <div className='flex flex-col gap-2 p-6'>
                {timeSlots.map(time => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? 'default' : 'outline'}
                    onClick={(e) => {
                        e.preventDefault();
                        setSelectedTime(time);
                    }}
                    className='w-full shadow-none text-xs'
                    type="button"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
        <CardFooter className='flex flex-col gap-4 border-t px-6 !py-5'>
          <div className='flex items-center gap-2 text-xs text-muted-foreground w-full justify-center'>
            {selectedDate && selectedTime ? (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className='size-4 stroke-green-600 dark:stroke-green-400' />
                <span>
                  Agendado para{' '}
                  <span className='font-medium text-foreground'>
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </span>
                  {' '}às <span className='font-medium text-foreground'>{selectedTime}</span>
                </span>
              </div>
            ) : (
              <span className="italic">Selecione uma data e um horário</span>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
