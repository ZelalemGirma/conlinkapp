import React, { useState, useMemo, useRef } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LOCATION_ZONES, LEAD_STATUS_CONFIG } from '@/types';
import type { LeadStatus } from '@/types';
import { MapPin, Navigation, Phone, Building2, Layers, Eye } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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

// Custom colored marker icons using SVG
const createColorIcon = (color: string, glowing = false) => {
  const shadow = glowing ? `filter: drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color});` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <defs><style>.pin{${shadow}}</style></defs>
    <path class="pin" d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="6" fill="#fff" fill-opacity="0.9"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
};

// Cluster icon
const createClusterIcon = (count: number) => {
  const size = count > 20 ? 50 : count > 10 ? 44 : 38;
  return L.divIcon({
    html: `<div style="
      background: hsl(var(--primary));
      color: white;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: ${count > 99 ? '11' : '13'}px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${count}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Get pin color based on status
const getPinConfig = (status: string): { color: string; glow: boolean } => {
  switch (status) {
    case 'meeting_scheduled':
      return { color: '#F28C28', glow: false }; // Orange
    case 'deal_closed':
    case 'approved':
      return { color: '#1A2E44', glow: false }; // Navy blue
    case 'needs_followup':
    case 'call_me_back':
      return { color: '#EF4444', glow: true }; // Red glowing
    case 'rejected_phone':
    case 'rejected_spot':
    case 'wrong_number':
      return { color: '#9CA3AF', glow: false }; // Gray
    case 'profile_sent':
      return { color: '#3B82F6', glow: false }; // Blue
    default:
      return { color: '#6B7280', glow: false };
  }
};

// Get lead position with slight randomization within zone
const getLeadPosition = (lead: any): [number, number] | null => {
  if (lead.gps_lat && lead.gps_lng) return [lead.gps_lat, lead.gps_lng];
  const zone = lead.location_zone;
  if (zone && ZONE_COORDS[zone]) {
    const base = ZONE_COORDS[zone];
    // Add small random offset to avoid pin stacking
    const offset = () => (Math.random() - 0.5) * 0.012;
    return [base.lat + offset(), base.lng + offset()];
  }
  return null;
};

const MapView: React.FC = () => {
  const [zoneFilter, setZoneFilter] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [enableClustering, setEnableClustering] = useState(true);

  // Fetch ALL leads for the map (not just meeting_scheduled)
  const { data: allLeads = [], isLoading } = useLeads({
    zone: zoneFilter || undefined,
  });

  // Leads with positions
  const mappedLeads = useMemo(() => {
    return allLeads
      .map(lead => ({
        ...lead,
        position: getLeadPosition(lead),
      }))
      .filter(l => l.position !== null) as (typeof allLeads[0] & { position: [number, number] })[];
  }, [allLeads]);

  // Group by zone for clusters
  const zoneClusters = useMemo(() => {
    const clusters = new Map<string, { leads: typeof mappedLeads; center: [number, number] }>();
    mappedLeads.forEach(lead => {
      const zone = lead.location_zone || 'Unknown';
      if (!clusters.has(zone)) {
        const coords = ZONE_COORDS[zone];
        clusters.set(zone, {
          leads: [],
          center: coords ? [coords.lat, coords.lng] : [9.02, 38.75],
        });
      }
      clusters.get(zone)!.leads.push(lead);
    });
    return clusters;
  }, [mappedLeads]);

  // Heatmap data: zone density for active/approved leads
  const heatmapZones = useMemo(() => {
    const zoneCount = new Map<string, number>();
    mappedLeads.forEach(lead => {
      if (['approved', 'meeting_scheduled', 'profile_sent', 'needs_followup', 'call_me_back'].includes(lead.status)) {
        const zone = lead.location_zone || 'Unknown';
        zoneCount.set(zone, (zoneCount.get(zone) || 0) + 1);
      }
    });
    const maxCount = Math.max(...Array.from(zoneCount.values()), 1);
    return Array.from(zoneCount.entries()).map(([zone, count]) => ({
      zone,
      count,
      intensity: count / maxCount,
      center: ZONE_COORDS[zone] || { lat: 9.02, lng: 38.75 },
    }));
  }, [mappedLeads]);

  // Status summary
  const statusSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    allLeads.forEach(l => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return counts;
  }, [allLeads]);

  const center: [number, number] = [9.015, 38.755]; // Addis Ababa center

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" /> Map View
          </h1>
          <p className="text-sm text-muted-foreground">
            {mappedLeads.length} lead{mappedLeads.length !== 1 ? 's' : ''} plotted across Addis Ababa
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={zoneFilter} onValueChange={v => setZoneFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[170px] h-9 text-xs">
              <SelectValue placeholder="All Zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {LOCATION_ZONES.map(z => (
                <SelectItem key={z} value={z}>{z}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="heatmap" checked={showHeatmap} onCheckedChange={setShowHeatmap} />
            <Label htmlFor="heatmap" className="text-xs cursor-pointer flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" /> Heatmap
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="cluster" checked={enableClustering} onCheckedChange={setEnableClustering} />
            <Label htmlFor="cluster" className="text-xs cursor-pointer flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> Clusters
            </Label>
          </div>
        </div>
      </div>

      {/* Pin Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#F28C28]" /> Meeting Scheduled
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#1A2E44]" /> Approved / Deal Closed
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#EF4444] shadow-[0_0_6px_#EF4444]" /> Needs Follow-up
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#3B82F6]" /> Profile Sent
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#9CA3AF]" /> Other
        </div>
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[500px] w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading map data…</div>
            ) : (
              <MapContainer
                center={center}
                zoom={12}
                className="h-full w-full z-0"
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Heatmap overlay */}
                {showHeatmap && heatmapZones.map(hz => (
                  <CircleMarker
                    key={`heat-${hz.zone}`}
                    center={[hz.center.lat, hz.center.lng]}
                    radius={30 + hz.intensity * 40}
                    pathOptions={{
                      color: 'transparent',
                      fillColor: `hsl(25, 95%, ${55 - hz.intensity * 20}%)`,
                      fillOpacity: 0.2 + hz.intensity * 0.35,
                    }}
                  >
                    <Popup>
                      <strong>{hz.zone}</strong><br />
                      {hz.count} active lead{hz.count !== 1 ? 's' : ''}
                    </Popup>
                  </CircleMarker>
                ))}

                {/* Clustered view */}
                {enableClustering ? (
                  Array.from(zoneClusters.entries()).map(([zone, data]) => (
                    <Marker
                      key={`cluster-${zone}`}
                      position={data.center}
                      icon={createClusterIcon(data.leads.length)}
                    >
                      <Popup maxWidth={280}>
                        <div style={{ fontFamily: 'system-ui', fontSize: '13px' }}>
                          <strong style={{ fontSize: '14px' }}>{data.leads.length} Leads in {zone}</strong>
                          <div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                            {data.leads.slice(0, 10).map(lead => {
                              const pinCfg = getPinConfig(lead.status);
                              return (
                                <div key={lead.id} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pinCfg.color, display: 'inline-block' }} />
                                    <strong>{lead.company_name}</strong>
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#666' }}>{lead.category} · {LEAD_STATUS_CONFIG[lead.status as LeadStatus]?.label}</div>
                                </div>
                              );
                            })}
                            {data.leads.length > 10 && (
                              <div style={{ fontSize: '11px', color: '#999', padding: '4px 0' }}>
                                +{data.leads.length - 10} more…
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))
                ) : (
                  /* Individual pins */
                  mappedLeads.map(lead => {
                    const pinCfg = getPinConfig(lead.status);
                    const icon = createColorIcon(pinCfg.color, pinCfg.glow);
                    return (
                      <Marker key={lead.id} position={lead.position} icon={icon}>
                        <Popup maxWidth={300}>
                          <div style={{ fontFamily: 'system-ui', fontSize: '13px', minWidth: '200px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: pinCfg.color, display: 'inline-block', boxShadow: pinCfg.glow ? `0 0 8px ${pinCfg.color}` : 'none' }} />
                              <strong style={{ fontSize: '14px' }}>{lead.company_name}</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>
                              📋 {lead.category}
                            </div>
                            <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>
                              📍 {lead.location_zone || 'No zone'} {lead.specific_address ? `· ${lead.specific_address}` : ''}
                            </div>
                            <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>
                              👤 {lead.contact_person}
                            </div>
                            {lead.phone && (
                              <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                                📞 <a href={`tel:${lead.phone}`} style={{ color: '#F28C28' }}>{lead.phone}</a>
                              </div>
                            )}
                            <div style={{ fontSize: '11px', padding: '3px 8px', background: pinCfg.color + '20', borderRadius: '12px', display: 'inline-block', color: pinCfg.color, fontWeight: 600, marginBottom: '8px' }}>
                              {LEAD_STATUS_CONFIG[lead.status as LeadStatus]?.label || lead.status}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                              {lead.gps_lat && lead.gps_lng && (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${lead.gps_lat},${lead.gps_lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    padding: '5px 10px', background: '#F28C28', color: '#fff',
                                    borderRadius: '6px', fontSize: '11px', fontWeight: 600, textDecoration: 'none',
                                  }}
                                >
                                  🧭 Navigate
                                </a>
                              )}
                              {lead.phone && (
                                <a
                                  href={`tel:${lead.phone}`}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    padding: '5px 10px', background: '#1A2E44', color: '#fff',
                                    borderRadius: '6px', fontSize: '11px', fontWeight: 600, textDecoration: 'none',
                                  }}
                                >
                                  📞 Call
                                </a>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })
                )}
              </MapContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Zone Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {LOCATION_ZONES.map(zone => {
          const zoneLeads = allLeads.filter(l => l.location_zone === zone);
          const count = zoneLeads.length;
          const active = zoneLeads.filter(l => ['approved', 'meeting_scheduled', 'needs_followup', 'call_me_back'].includes(l.status)).length;
          const isSelected = zoneFilter === zone;
          return (
            <div
              key={zone}
              className={`rounded-lg border-2 p-3 text-center transition-all cursor-pointer hover:shadow-md ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : count > 0
                  ? 'border-border bg-card hover:bg-muted/50'
                  : 'border-border bg-muted/20'
              }`}
              onClick={() => setZoneFilter(zone === zoneFilter ? '' : zone)}
            >
              <p className="font-medium text-sm">{zone}</p>
              <p className={`text-xl font-bold ${count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{count}</p>
              <p className="text-[10px] text-muted-foreground">{active} active</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MapView;
