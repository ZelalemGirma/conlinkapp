import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateMeeting } from '@/hooks/useMeetings';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MeetingSchedulerDialogProps {
  leadId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MeetingSchedulerDialog: React.FC<MeetingSchedulerDialogProps> = ({
  leadId,
  companyName,
  open,
  onOpenChange,
}) => {
  const createMeeting = useCreateMeeting();
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const handleSchedule = async () => {
    if (!date) return;
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours, minutes, 0, 0);

    await createMeeting.mutateAsync({
      lead_id: leadId,
      scheduled_at: scheduledAt.toISOString(),
      location,
      notes,
    });

    setDate(undefined);
    setTime('10:00');
    setLocation('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-secondary flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Schedule Meeting
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Scheduling a meeting with <strong>{companyName}</strong>
        </p>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={d => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Time *
            </Label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" /> Location
            </Label>
            <Input
              placeholder="Meeting location or address"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Meeting agenda or notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={!date || createMeeting.isPending}>
              {createMeeting.isPending ? 'Scheduling...' : 'Schedule Meeting'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingSchedulerDialog;
