import React, { useState } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LOCATION_ZONES, LEAD_STATUS_CONFIG } from '@/types';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import { MapPin, Calendar, Phone, Building2 } from 'lucide-react';

// Zone approximate coordinates for Addis Ababa sub-cities
const ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Bole': { lat: 8.9806, lng: 38.7578 },
  'Kirkos': { lat: 9.0107, lng: 38.7469 },
  'Nifas Silk': { lat: 8.9733, lng: 38.7297 },
  'Yeka': { lat: 9.0373, lng: 38.7908 },
  'Arada': { lat: 9.0359, lng: 38.7468 },
  'Addis Ketema': { lat: 9.0260, lng: 38.7300 },
  'Lideta': { lat: 9.0107, lng: 38.7297 },
  'Kolfe Keranio': { lat: 9.0167, lng: 38.6897 },
  'Gulele': { lat: 9.0600, lng: 38.7300 },
  'Akaky Kaliti': { lat: 8.8967, lng: 38.7600 },
  'Lemi Kura': { lat: 8.9400, lng: 38.8100 },
};

const MapView = () => {
  const [zoneFilter, setZoneFilter] = useState('');
  const { data: leads, isLoading } = useLeads({
    status: 'meeting_scheduled',
    zone: zoneFilter || undefined,
  });

  // Group leads by zone
  const zoneGroups = (leads || []).reduce<Record<string, typeof leads>>((acc, lead) => {
    const zone = lead.location_zone || 'Unassigned';
    if (!acc[zone]) acc[zone] = [];
    acc[zone]!.push(lead);
    return acc;
  }, {});

  const zones = Object.keys(zoneGroups).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Map View</h1>
          <p className="text-muted-foreground">
            {leads?.length || 0} meeting-scheduled lead{leads?.length !== 1 ? 's' : ''} across {zones.length} zone{zones.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Select value={zoneFilter} onValueChange={v => setZoneFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Zones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {LOCATION_ZONES.map(z => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Visual Zone Map Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Addis Ababa Zone Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {LOCATION_ZONES.map(zone => {
              const count = zoneGroups[zone]?.length || 0;
              const hasLeads = count > 0;
              return (
                <div
                  key={zone}
                  className={`relative rounded-lg border-2 p-4 text-center transition-all cursor-pointer hover:shadow-md ${
                    hasLeads
                      ? 'border-primary bg-primary/5 hover:bg-primary/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}
                  onClick={() => setZoneFilter(zone === zoneFilter ? '' : zone)}
                >
                  <MapPin className={`h-5 w-5 mx-auto mb-1 ${hasLeads ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-medium text-sm">{zone}</p>
                  <p className={`text-2xl font-bold ${hasLeads ? 'text-primary' : 'text-muted-foreground'}`}>
                    {count}
                  </p>
                  <p className="text-[10px] text-muted-foreground">meetings</p>
                  {hasLeads && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lead Cards by Zone */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
      ) : zones.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            No meeting-scheduled leads found.
          </CardContent>
        </Card>
      ) : (
        zones.map(zone => (
          <Card key={zone}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {zone}
                <Badge variant="secondary" className="ml-auto">{zoneGroups[zone]!.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {zoneGroups[zone]!.map(lead => (
                  <div key={lead.id} className="rounded-lg border p-3 space-y-2 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{lead.company_name}</span>
                      </div>
                      <LeadStatusBadge status={lead.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{lead.contact_person}</p>
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </a>
                    )}
                    {lead.meeting_date && (
                      <p className="flex items-center gap-1 text-xs text-info">
                        <Calendar className="h-3 w-3" />
                        {new Date(lead.meeting_date).toLocaleString()}
                      </p>
                    )}
                    {lead.specific_address && (
                      <p className="text-xs text-muted-foreground truncate">{lead.specific_address}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default MapView;
