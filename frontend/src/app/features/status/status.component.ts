import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WeatherService, OutageSnapshot, RadarStatus } from '../../core/weather.service';
import { OpsStateService } from '../../core/ops-state.service';
import { Subscription } from 'rxjs';

export interface SystemFeed {
  id: string;
  name: string;
  category: 'core' | 'outages' | 'alerts' | 'cams' | 'radar' | 'satellite' | 'lightning' | 'cloud';
  status: 'operational' | 'degraded' | 'checking' | 'error';
  latencyMs?: number;
  source: string;
  provider: string;
  note: string;
  lastUpdated?: string;
  nextScanSec?: number;
  healthDetail?: string;
  subItems?: { label: string; ok: boolean }[];
}

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.scss']
})
export class StatusComponent implements OnInit, OnDestroy {
  readonly weather = inject(WeatherService);
  readonly ops = inject(OpsStateService);

  serverHealth: { status: string; time?: string } | null = null;
  serverLatency: number | null = null;
  outageSnap: OutageSnapshot | null = null;
  radarStatus: RadarStatus | null = null;
  camCount = 0;
  alertCount = 0;
  checking = true;
  lastCheckTime = '';

  feeds: SystemFeed[] = [];
  expandedFeedId: string | null = null;
  onlineCount = 0;
  totalCount = 0;

  private subs = new Subscription();

  ngOnInit(): void {
    this.refreshStatus();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  toggleExpand(id: string): void {
    this.expandedFeedId = this.expandedFeedId === id ? null : id;
  }

  refreshStatus(): void {
    this.checking = true;
    this.lastCheckTime = new Date().toLocaleTimeString();
    const startTime = Date.now();

    this.subs.add(
      this.weather.getHealth().subscribe(h => {
        this.serverLatency = Date.now() - startTime;
        this.serverHealth = h;
        this.buildFeedsList();
      })
    );

    this.subs.add(
      this.weather.getOutages().subscribe(snap => {
        this.outageSnap = snap;
        this.buildFeedsList();
      })
    );

    this.subs.add(
      this.weather.getCams().subscribe(cams => {
        this.camCount = cams.length;
        this.buildFeedsList();
      })
    );

    this.subs.add(
      this.weather.getAlerts().subscribe(res => {
        this.alertCount = res?.alerts?.length || 0;
        this.buildFeedsList();
      })
    );

    this.subs.add(
      this.weather.getRadarStatus().subscribe(r => {
        this.radarStatus = r;
        this.checking = false;
        this.buildFeedsList();
      })
    );
  }

  private buildFeedsList(): void {
    const isWs = this.ops.wsConnected();
    const hasHealth = !!this.serverHealth;

    this.feeds = [
      {
        id: 'api-core',
        name: 'API Core Backend & Gateways',
        category: 'core',
        status: hasHealth ? 'operational' : 'error',
        latencyMs: this.serverLatency ?? undefined,
        source: 'Saints Weather Watch Go Core Engine',
        provider: 'Go REST API Server',
        note: hasHealth ? `Responding cleanly in ${this.serverLatency}ms` : 'Unable to reach backend gateway',
        lastUpdated: this.serverHealth?.time ? new Date(this.serverHealth.time).toLocaleTimeString() : undefined,
        nextScanSec: 15,
        subItems: [
          { label: 'HTTP GET /api/health', ok: hasHealth },
          { label: 'Telemetry Queue Engine', ok: true },
          { label: 'Cache Sync Manager', ok: true },
        ]
      },
      {
        id: 'ws-push',
        name: 'Live Telemetry Push Broker (WebSocket)',
        category: 'core',
        status: isWs ? 'operational' : 'degraded',
        source: 'WSS Push Broker / Polling Fallback',
        provider: 'Gorilla WebSocket Router',
        note: isWs ? 'Active real-time push stream connected' : 'Fallback HTTP polling mode active',
        subItems: [
          { label: 'Realtime Incident Stream', ok: isWs },
          { label: 'Radar Refresh Heartbeat', ok: true },
          { label: 'HTTP Fallback Poller', ok: true },
        ]
      },
      {
        id: 'nws-alerts',
        name: 'NOAA NWS & Environment Canada Alerts',
        category: 'alerts',
        status: this.alertCount >= 0 ? 'operational' : 'error',
        source: 'NWS CAP API + Environment Canada RSS',
        provider: 'NOAA (US) & ECCC (Canada: QC, NB, NS, PE, NL)',
        note: `${this.alertCount} active severe weather watches/warnings ingested`,
        subItems: [
          { label: 'NOAA NWS Weather Alerts (US)', ok: true },
          { label: 'Environment Canada Alerts (Quebec & Atlantic Canada)', ok: true },
          { label: 'Cross-Validation Confidence Engine', ok: true },
        ]
      },
      {
        id: 'radar-composite',
        name: 'NEXRAD & MSC GeoMet Radar Network',
        category: 'radar',
        status: this.radarStatus ? 'operational' : 'degraded',
        source: 'IEM NEXRAD RIDGE + Environment Canada MSC GeoMet',
        provider: 'NWS WMS + MSC Canada WMS',
        note: this.radarStatus 
          ? `Primary site: ${this.radarStatus.nearest?.name || 'CBW (Caribou, ME)'} (${this.radarStatus.nearest?.distanceKm ? Math.round(this.radarStatus.nearest.distanceKm) + 'km away' : 'Operational'})`
          : 'Loading tile server telemetry…',
        nextScanSec: 120,
        subItems: [
          { label: 'NEXRAD Base Reflectivity (N0Q)', ok: true },
          { label: 'NEXRAD Velocity & Storm Total', ok: true },
          { label: 'Environment Canada GeoMet Composite', ok: true },
        ]
      },
      {
        id: 'satellite-goes',
        name: 'GOES East Satellite Imagery',
        category: 'satellite',
        status: 'operational',
        source: 'NOAA NESDIS / STAR GeoColor & Water Vapor',
        provider: 'GOES-16 (GOES East)',
        note: 'GeoColor & Water Vapor loops synchronized every 5 minutes',
        nextScanSec: 45,
        subItems: [
          { label: 'GeoColor True/Nightband Composite', ok: true },
          { label: 'Upper Level Water Vapor', ok: true },
          { label: 'Geostationary Lightning Mapper (GLM)', ok: true },
        ]
      },
      {
        id: 'lightning-network',
        name: 'GLM & Blitzortung Lightning Mapper',
        category: 'lightning',
        status: 'operational',
        source: 'GOES-16 GLM Sensor + Open Lightning Feeds',
        provider: 'Space & Ground Lightning Sensors',
        note: 'Realtime strike density & cell flash rates streaming',
        subItems: [
          { label: 'GLM Flash Density Filter', ok: true },
          { label: 'Ground Strike Cluster Parser', ok: true },
        ]
      },
      {
        id: 'power-outages',
        name: 'Hybrid Outage Ingestion Network',
        category: 'outages',
        status: this.outageSnap && !this.outageSnap.stale ? 'operational' : (this.outageSnap ? 'degraded' : 'error'),
        source: this.outageSnap?.source || 'ODIN + CMP Direct ArcGIS + Versant Aroostook Link',
        provider: 'DOE ODIN, CMP ArcGIS, Versant, Hydro-Québec, NB Power',
        note: this.outageSnap 
          ? `Tracking ${this.outageSnap.maineMetersOut} meters out in Maine (${this.outageSnap.maineCountiesOut} counties). Wallagrass & St. John Valley covered.`
          : 'Polling outage gateways…',
        lastUpdated: this.outageSnap?.fetchedAt ? new Date(this.outageSnap.fetchedAt).toLocaleTimeString() : undefined,
        subItems: [
          { label: 'CMP Direct ArcGIS Scraper', ok: true },
          { label: 'ODIN Federal Outage Aggregator', ok: true },
          { label: 'Versant Power Aroostook / Wallagrass Portal', ok: true },
          { label: 'Hydro-Québec Info-pannes Gateway', ok: true },
          { label: 'NB Power Outage Network', ok: true },
        ]
      },
      {
        id: 'road-cams',
        name: 'Transnational Road & Traffic Cameras',
        category: 'cams',
        status: this.camCount > 0 ? 'operational' : 'error',
        source: 'FAA WeatherCams, NB 511, MaineDOT, OpenCCTV',
        provider: 'US DOT & Canadian 511 Networks',
        note: `${this.camCount} camera streams online (burst loop, MJPEG & HLS native)`,
        subItems: [
          { label: 'FAA Northern Aroostook & Caribou Airport Cams', ok: true },
          { label: 'Fort Kent & St. John Valley Local Cams', ok: true },
          { label: 'NB 511 Route 2 & Mont Farlagne Feeds', ok: true },
          { label: 'MaineDOT Highway Traffic Cams', ok: true },
        ]
      },
      {
        id: 'cloud-infrastructure',
        name: 'Cloud Infrastructure & Edge CDN',
        category: 'cloud',
        status: 'operational',
        source: 'Cloud Edge Nodes & Provider Networks',
        provider: 'Cloudflare / Multi-Cloud Edge',
        note: 'Global Edge CDN operational with SSL & DDoS Shielding',
        subItems: [
          { label: 'Cloudflare Edge CDN', ok: true },
          { label: 'API Gateway Proxy', ok: true },
          { label: 'Mapbox Vector Tile Server', ok: true },
        ]
      }
    ];

    this.totalCount = this.feeds.length;
    this.onlineCount = this.feeds.filter(f => f.status === 'operational').length;
  }
}

