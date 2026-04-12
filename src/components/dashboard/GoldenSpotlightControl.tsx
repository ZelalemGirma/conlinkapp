import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useProfiles } from '@/hooks/useProfiles';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const GoldenSpotlightControl: React.FC = () => {
  const { data: profiles } = useProfiles();
  const [selectedUser, setSelectedUser] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      // Upsert the setting
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'golden_spotlight_user_id', value: selectedUser }, { onConflict: 'key' });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['spotlight-rep'] });
      toast({ title: 'Spotlight updated!' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5 text-primary fill-primary" />
          Golden Sales Spotlight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select the top-performing rep to feature on the dashboard banner.
        </p>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger>
            <SelectValue placeholder="Select a rep..." />
          </SelectTrigger>
          <SelectContent>
            {profiles?.map(p => (
              <SelectItem key={p.user_id} value={p.user_id}>
                {p.full_name || p.user_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSave} disabled={!selectedUser || saving} className="w-full">
          {saving ? 'Saving...' : 'Set Spotlight'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GoldenSpotlightControl;
