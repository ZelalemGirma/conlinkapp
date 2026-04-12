import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { LEAD_CATEGORIES, LOCATION_ZONES } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, X, Save, Tag, MapPin, Clock, Sliders } from 'lucide-react';

const DEFAULT_OVERDUE_DAYS = '3';

const TagListEditor: React.FC<{
  label: string;
  description: string;
  items: string[];
  onSave: (items: string[]) => void;
  saving: boolean;
  defaults: string[];
}> = ({ label, description, items, onSave, saving, defaults }) => {
  const [localItems, setLocalItems] = useState<string[]>(items);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (localItems.includes(trimmed)) {
      toast.error('Item already exists');
      return;
    }
    setLocalItems([...localItems, trimmed]);
    setNewItem('');
  };

  const removeItem = (item: string) => {
    setLocalItems(localItems.filter(i => i !== item));
  };

  const handleSave = () => {
    onSave(localItems);
  };

  const resetDefaults = () => {
    setLocalItems([...defaults]);
  };

  const hasChanges = JSON.stringify(localItems) !== JSON.stringify(items);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{label}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {localItems.map(item => (
          <Badge key={item} variant="secondary" className="gap-1 pr-1">
            {item}
            <button
              onClick={() => removeItem(item)}
              className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {localItems.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No items configured</p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add new item…"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          className="max-w-xs"
        />
        <Button size="sm" variant="outline" onClick={addItem}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={resetDefaults}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { role } = useAuth();
  const { settings, isLoading, getListSetting, getSetting, upsertSetting } = useAppSettings();

  const [overdueDays, setOverdueDays] = useState(DEFAULT_OVERDUE_DAYS);

  useEffect(() => {
    const val = getSetting('overdue_threshold_days');
    if (val) setOverdueDays(val);
  }, [settings]);

  if (role !== 'admin') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-secondary">Settings</h1>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  const campaignTags = getListSetting('campaign_tags');
  const locationZones = getListSetting('location_zones');

  const effectiveCampaignTags = campaignTags.length > 0 ? campaignTags : [];
  const effectiveLocationZones = locationZones.length > 0 ? locationZones : [...LOCATION_ZONES];

  const handleSaveCampaignTags = (items: string[]) => {
    upsertSetting.mutate(
      { key: 'campaign_tags', value: JSON.stringify(items) },
      { onSuccess: () => toast.success('Campaign tags saved') }
    );
  };

  const handleSaveLocationZones = (items: string[]) => {
    upsertSetting.mutate(
      { key: 'location_zones', value: JSON.stringify(items) },
      { onSuccess: () => toast.success('Location zones saved') }
    );
  };

  const handleSaveOverdue = () => {
    const days = parseInt(overdueDays);
    if (isNaN(days) || days < 1 || days > 30) {
      toast.error('Threshold must be between 1 and 30 days');
      return;
    }
    upsertSetting.mutate(
      { key: 'overdue_threshold_days', value: String(days) },
      { onSuccess: () => toast.success('Overdue threshold saved') }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Settings</h1>
        <p className="text-muted-foreground">System configuration and admin preferences</p>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="campaigns" className="gap-1">
            <Tag className="h-3.5 w-3.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="zones" className="gap-1">
            <MapPin className="h-3.5 w-3.5" /> Zones
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-1">
            <Clock className="h-3.5 w-3.5" /> Overdue
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-1">
            <Sliders className="h-3.5 w-3.5" /> General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" /> Campaign Tags
              </CardTitle>
              <CardDescription>
                Manage campaign tags that reps can attach to leads for tracking marketing campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TagListEditor
                label="Active Campaign Tags"
                description="Tags available when creating or editing leads."
                items={effectiveCampaignTags}
                onSave={handleSaveCampaignTags}
                saving={upsertSetting.isPending}
                defaults={[]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zones">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> Location Zones
              </CardTitle>
              <CardDescription>
                Configure the location zones (sub-cities) available for lead addresses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TagListEditor
                label="Available Zones"
                description="Zones that appear in location dropdowns throughout the system."
                items={effectiveLocationZones}
                onSave={handleSaveLocationZones}
                saving={upsertSetting.isPending}
                defaults={[...LOCATION_ZONES]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Overdue Threshold
              </CardTitle>
              <CardDescription>
                Set how many days of inactivity before a lead is flagged as overdue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs space-y-2">
                <Label htmlFor="overdue-days">Days without contact</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="overdue-days"
                    type="number"
                    min={1}
                    max={30}
                    value={overdueDays}
                    onChange={e => setOverdueDays(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leads with no interaction for this many days will show an overdue warning. Default is 3 days.
                </p>
              </div>
              <Button size="sm" onClick={handleSaveOverdue} disabled={upsertSetting.isPending}>
                <Save className="h-4 w-4 mr-1" /> Save Threshold
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" /> General Preferences
              </CardTitle>
              <CardDescription>
                System-wide settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="text-sm font-medium">Lead Categories</h4>
                <p className="text-xs text-muted-foreground">
                  The following {LEAD_CATEGORIES.length} categories are available system-wide:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {LEAD_CATEGORIES.map(cat => (
                    <Badge key={cat} variant="outline" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="text-sm font-medium">Application Info</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-muted-foreground">Version</span>
                  <span>1.0.0</span>
                  <span className="text-muted-foreground">Total Settings</span>
                  <span>{settings.length} configured</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
