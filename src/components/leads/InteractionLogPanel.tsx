import React, { useState } from 'react';
import { useInteractionLogs, useCreateInteraction } from '@/hooks/useInteractions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Phone, Mail, Send, MapPin, Users, Plus, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type InteractionType = Database['public']['Enums']['interaction_type'];

const INTERACTION_ICONS: Record<InteractionType, React.ElementType> = {
  phone: Phone,
  email: Mail,
  telegram: Send,
  site_visit: MapPin,
  meeting: Users,
};

const INTERACTION_LABELS: Record<InteractionType, string> = {
  phone: 'Phone Call',
  email: 'Email',
  telegram: 'Telegram',
  site_visit: 'Site Visit',
  meeting: 'Meeting',
};

const INTERACTION_COLORS: Record<InteractionType, string> = {
  phone: 'bg-info/10 text-info border-info/20',
  email: 'bg-primary/10 text-primary border-primary/20',
  telegram: 'bg-info/10 text-info border-info/20',
  site_visit: 'bg-success/10 text-success border-success/20',
  meeting: 'bg-warning/10 text-warning border-warning/20',
};

interface InteractionLogPanelProps {
  leadId: string;
}

const InteractionLogPanel: React.FC<InteractionLogPanelProps> = ({ leadId }) => {
  const { data: logs, isLoading } = useInteractionLogs(leadId);
  const createInteraction = useCreateInteraction();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<InteractionType>('phone');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!notes.trim()) return;
    await createInteraction.mutateAsync({
      lead_id: leadId,
      type,
      notes: notes.trim(),
    });
    setNotes('');
    setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Interaction Log</h4>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-3 w-3" />
          Log
        </Button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
          <Select value={type} onValueChange={v => setType(v as InteractionType)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(INTERACTION_LABELS) as InteractionType[]).map(t => {
                const Icon = INTERACTION_ICONS[t];
                return (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {INTERACTION_LABELS[t]}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Notes about this interaction..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!notes.trim() || createInteraction.isPending}>
              {createInteraction.isPending ? 'Saving...' : 'Save Log'}
            </Button>
          </div>
        </div>
      )}

      {/* Log timeline */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : logs?.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No interactions logged yet</p>
        ) : (
          logs?.map(log => {
            const Icon = INTERACTION_ICONS[log.type];
            return (
              <div key={log.id} className="flex gap-3 text-sm">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${INTERACTION_COLORS[log.type]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {INTERACTION_LABELS[log.type]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{log.notes}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default InteractionLogPanel;
