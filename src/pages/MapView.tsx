import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useLeads } from '@/hooks/useLeads';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LEAD_STATUS_CONFIG, LOCATION_ZONES } from '@/types';
import type { Lead, LeadStatus } from '@/types';
import { Eye, Layers, MapPin } from 'lucide-react';

const ADDIS_CENTER: [number, number] = [9.015, 38.755];
const BRAND_COLORS = {
  meeting: '#F28C28',
  approved: '#1A2E44',
  followup: '#EF4444',
  profile: '#3B82F6',
  other: '#9CA3AF',
};

const ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
  Bole: { lat: 8.9806, lng: 38.7578 },
  Kirkos: { lat: 9.0107, lng: 38.7469 },
  'Nifas Silk': { lat: 8.9733, lng: 38.7297 },
  Yeka: { lat: 9.0373, lng: 38.7908 },
  Arada: { lat: 9.0359, lng: 38.7468 },
  'Addis Ketema': { lat: 9.026, lng: 38.73 },
  Lideta: { lat: 9.0107, lng: 38.7297 },
  'Kolfe Keranio': { lat: 9.0167, lng: 38.6897 },
  Gulele: { lat: 9.06, lng: 38.73 },
  'Akaky Kaliti': { lat: 8.8967, lng: 38.76 },
  'Lemi Kura': { lat: 8.94, lng: 38.81 },
};

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getStableOffset = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return ((hash % 1000) / 1000 - 0.5) * 0.01;
};

const getPinConfig = (status: string): { color: string; glow: boolean } => {
  switch (status) {
    case 'meeting_scheduled':
      return { color: BRAND_COLORS.meeting, glow: false };
    case 'deal_closed':
    case 'approved':
      return { color: BRAND_COLORS.approved, glow: false };
    case 'needs_followup':
    case 'call_me_back':
      return { color: BRAND_COLORS.followup, glow: true };
    case 'profile_sent':
      return { color: BRAND_COLORS.profile, glow: false };
    default:
      return { color: BRAND_COLORS.other, glow: false };
  }
};

const createColorIcon = (color: string, glowing = false) => {
  const shadow = glowing ? `filter: drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color});` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <defs><style>.pin{${shadow}}</style></defs>
    <path class="pin" d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="6" fill="#fff" fill-opacity="0.92"/>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
};

const createClusterIcon = (count: number) => {
  const size = count > 20 ? 50 : count > 10 ? 44 : 38;

  return L.divIcon({
    html: `<div style="
      background:${BRAND_COLORS.meeting};
      color:#fff;
      width:${size}px;
      height:${size}px;
      border-radius:999px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:${count > 99 ? '11' : '13'}px;
      border:3px solid #fff;
      box-shadow:0 4px 16px rgba(0,0,0,0.28);
    ">${count}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const getLeadPosition = (lead: Lead): [number, number] | null => {
  if (typeof lead.gps_lat === 'number' && typeof lead.gps_lng === 'number') {
    return [lead.gps_lat, lead.gps_lng];
  }

  const zone = lead.location_zone;
  if (zone && ZONE_COORDS[zone]) {
    const base = ZONE_COORDS[zone];
    return [
      base.lat + getStableOffset(`${lead.id}-lat`),
      base.lng + getStableOffset(`${lead.id}-lng`),
    ];
  }

  return null;
};

const getNavigationUrl = (lead: Lead) => {
  if (typeof lead.gps_lat === 'number' && typeof lead.gps_lng === 'number') {
    return `https://www.google.com/maps/dir/?api=1&destination=${lead.gps_lat},${lead.gps_lng}`;
  }

  const query = encodeURIComponent(
    [lead.company_name, lead.specific_address, lead.location_zone, 'Addis Ababa'].filter(Boolean).join(', ')
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

const buildLeadPopupHtml = (lead: Lead) => {
  const pin = getPinConfig(lead.status);
  const companyName = escapeHtml(lead.company_name);
  const category = escapeHtml(lead.category);
  const zone = escapeHtml(lead.location_zone || 'No zone');
  const address = lead.specific_address ? ` · ${escapeHtml(lead.specific_address)}` : '';
  const contact = lead.contact_person ? escapeHtml(lead.contact_person) : 'Unknown contact';
  const phone = lead.phone ? escapeHtml(lead.phone) : '';
  const statusLabel = escapeHtml(LEAD_STATUS_CONFIG[lead.status as LeadStatus]?.label || lead.status);
  const navigationUrl = getNavigationUrl(lead);

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;min-width:220px;line-height:1.4;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="width:10px;height:10px;border-radius:999px;background:${pin.color};display:inline-block;${pin.glow ? `box-shadow:0 0 8px ${pin.color};` : ''}"></span>
        <strong style="font-size:14px;color:#111827;">${companyName}</strong>
      </div>
      <div style="font-size:12px;color:#4B5563;margin-bottom:4px;">📋 ${category}</div>
      <div style="font-size:12px;color:#4B5563;margin-bottom:4px;">📍 ${zone}${address}</div>
      <div style="font-size:12px;color:#4B5563;margin-bottom:6px;">👤 ${contact}</div>
      ${phone ? `<div style="font-size:12px;margin-bottom:6px;">📞 <a href="tel:${phone}" style="color:${BRAND_COLORS.meeting};text-decoration:none;">${phone}</a></div>` : ''}
      <div style="display:inline-block;padding:4px 9px;border-radius:999px;background:${pin.color}20;color:${pin.color};font-weight:600;font-size:11px;margin-bottom:10px;">
        ${statusLabel}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a
          href="${navigationUrl}"
          target="_blank"
          rel="noopener noreferrer"
          style="display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:8px;background:${BRAND_COLORS.meeting};color:#fff;font-size:11px;font-weight:700;text-decoration:none;"
        >
          Start Navigation
        </a>
        ${phone ? `
          <a
            href="tel:${phone}"
            style="display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:8px;background:${BRAND_COLORS.approved};color:#fff;font-size:11px;font-weight:700;text-decoration:none;"
          >
            Check-in Call
          </a>
        ` : ''}
      </div>
    </div>
  `;
};

const buildClusterPopupHtml = (zone: string, leads: Array<Lead & { position: [number, number] }>) => {
  const items = leads
    .slice(0, 10)
    .map((lead) => {
      const pin = getPinConfig(lead.status);
      const label = escapeHtml(LEAD_STATUS_CONFIG[lead.status as LeadStatus]?.label || lead.status);
      return `
        <div style="padding:6px 0;border-bottom:1px solid #E5E7EB;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="width:8px;height:8px;border-radius:999px;background:${pin.color};display:inline-block;"></span>
            <strong style="font-size:12px;color:#111827;">${escapeHtml(lead.company_name)}</strong>
          </div>
          <div style="font-size:11px;color:#6B7280;">${escapeHtml(lead.category)} · ${label}</div>
        </div>
      `;
    })
    .join('');

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;min-width:230px;">
      <strong style="font-size:14px;color:#111827;">${leads.length} Leads in ${escapeHtml(zone)}</strong>
      <div style="margin-top:8px;max-height:200px;overflow-y:auto;">
        ${items}
        ${leads.length > 10 ? `<div style="font-size:11px;color:#6B7280;padding-top:6px;">+${leads.length - 10} more leads…</div>` : ''}
      </div>
    </div>
  `;
};

const MapView: React.FC = () => {
  const [zoneFilter, setZoneFilter] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [enableClustering, setEnableClustering] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const { data: allLeads = [], isLoading } = useLeads({
    zone: zoneFilter || undefined,
  });

  const mappedLeads = useMemo(() => {
    return allLeads
      .map((lead) => ({
        ...lead,
        position: getLeadPosition(lead),
      }))
      .filter((lead): lead is Lead & { position: [number, number] } => Array.isArray(lead.position));
  }, [allLeads]);

  const zoneClusters = useMemo(() => {
    const clusters = new Map<string, { leads: Array<Lead & { position: [number, number] }>; center: [number, number] }>();

    mappedLeads.forEach((lead) => {
      const zone = lead.location_zone || 'Unknown';
      if (!clusters.has(zone)) {
        const coords = ZONE_COORDS[zone];
        clusters.set(zone, {
          leads: [],
          center: coords ? [coords.lat, coords.lng] : ADDIS_CENTER,
        });
      }
      clusters.get(zone)?.leads.push(lead);
    });

    return clusters;
  }, [mappedLeads]);

  const heatmapZones = useMemo(() => {
    const zoneCount = new Map<string, number>();

    mappedLeads.forEach((lead) => {
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
      center: ZONE_COORDS[zone] || { lat: ADDIS_CENTER[0], lng: ADDIS_CENTER[1] },
    }));
  }, [mappedLeads]);

  const visiblePositions = useMemo(() => {
    if (enableClustering) {
      return Array.from(zoneClusters.values()).map((entry) => entry.center);
    }
    return mappedLeads.map((lead) => lead.position);
  }, [enableClustering, mappedLeads, zoneClusters]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(ADDIS_CENTER, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = layerGroup;

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      layerGroup.clearLayers();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    requestAnimationFrame(() => {
      mapRef.current?.invalidateSize();
    });
  }, [isLoading]);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (showHeatmap) {
      heatmapZones.forEach((zone) => {
        L.circle([zone.center.lat, zone.center.lng], {
          color: 'transparent',
          fillColor: BRAND_COLORS.meeting,
          fillOpacity: 0.14 + zone.intensity * 0.28,
          radius: 900 + zone.intensity * 1800,
        })
          .bindPopup(`<strong>${escapeHtml(zone.zone)}</strong><br/>${zone.count} active leads`)
          .addTo(layerGroup);
      });
    }

    if (enableClustering) {
      zoneClusters.forEach((entry, zone) => {
        L.marker(entry.center, { icon: createClusterIcon(entry.leads.length) })
          .bindPopup(buildClusterPopupHtml(zone, entry.leads), { maxWidth: 280 })
          .addTo(layerGroup);
      });
    } else {
      mappedLeads.forEach((lead) => {
        const pin = getPinConfig(lead.status);
        L.marker(lead.position, { icon: createColorIcon(pin.color, pin.glow) })
          .bindPopup(buildLeadPopupHtml(lead), { maxWidth: 300 })
          .addTo(layerGroup);
      });
    }

    if (visiblePositions.length > 0) {
      map.fitBounds(L.latLngBounds(visiblePositions), {
        padding: [28, 28],
        maxZoom: enableClustering ? 12 : 14,
      });
    } else {
      map.setView(ADDIS_CENTER, 12);
    }
  }, [enableClustering, heatmapZones, mappedLeads, showHeatmap, visiblePositions, zoneClusters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <MapPin className="h-6 w-6 text-primary" />
            Map View
          </h1>
          <p className="text-sm text-muted-foreground">
            {mappedLeads.length} lead{mappedLeads.length !== 1 ? 's' : ''} plotted across Addis Ababa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Select value={zoneFilter} onValueChange={(value) => setZoneFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="h-9 w-[170px] text-xs">
              <SelectValue placeholder="All Zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {LOCATION_ZONES.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch id="heatmap" checked={showHeatmap} onCheckedChange={setShowHeatmap} />
            <Label htmlFor="heatmap" className="flex cursor-pointer items-center gap-1 text-xs">
              <Layers className="h-3.5 w-3.5" /> Heatmap
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="cluster" checked={enableClustering} onCheckedChange={setEnableClustering} />
            <Label htmlFor="cluster" className="flex cursor-pointer items-center gap-1 text-xs">
              <Eye className="h-3.5 w-3.5" /> Clusters
            </Label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: BRAND_COLORS.meeting }} />
          Meeting Scheduled
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: BRAND_COLORS.approved }} />
          Approved / Deal Closed
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: BRAND_COLORS.followup, boxShadow: `0 0 6px ${BRAND_COLORS.followup}` }}
          />
          Needs Follow-up
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: BRAND_COLORS.profile }} />
          Profile Sent
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative h-[500px] w-full">
            <div ref={mapContainerRef} className="h-full w-full" />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted-foreground backdrop-blur-[1px]">
                Loading map data…
              </div>
            )}
            {!isLoading && mappedLeads.length === 0 && (
              <div className="absolute inset-x-4 top-4 rounded-md border bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow-sm">
                No leads with location data match this filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {LOCATION_ZONES.map((zone) => {
          const zoneLeads = allLeads.filter((lead) => lead.location_zone === zone);
          const count = zoneLeads.length;
          const active = zoneLeads.filter((lead) =>
            ['approved', 'meeting_scheduled', 'needs_followup', 'call_me_back'].includes(lead.status)
          ).length;
          const isSelected = zoneFilter === zone;

          return (
            <button
              key={zone}
              type="button"
              className={`rounded-lg border-2 p-3 text-center transition-all hover:shadow-md ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : count > 0
                    ? 'border-border bg-card hover:bg-muted/50'
                    : 'border-border bg-muted/20'
              }`}
              onClick={() => setZoneFilter(zone === zoneFilter ? '' : zone)}
            >
              <p className="text-sm font-medium">{zone}</p>
              <p className={`text-xl font-bold ${count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{count}</p>
              <p className="text-[10px] text-muted-foreground">{active} active</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MapView;
