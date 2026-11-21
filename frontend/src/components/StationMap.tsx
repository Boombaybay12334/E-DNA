import { useState } from 'react';
import type { SampleType } from '../types';
import { formatCoords } from '../lib/sampleTypes';
import { IconCheck, IconCopy, IconExternal, IconPin } from './icons';

interface Props {
  type: SampleType;
  lat: number;
  lon: number;
  locality: string;
}

export function StationMap({ type, lat, lon, locality }: Props) {
  const [copied, setCopied] = useState(false);
  const coordString = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=10/${lat}/${lon}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coordString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`station-map-card map-theme-${type}`}>
      <div className="map-card-header">
        <div className="station-badge">
          <span className="station-icon"><IconPin size={13} /></span>
          <span>Sampling Station</span>
        </div>
        <div className="map-actions">
          <button
            type="button"
            className="coord-copy-btn"
            onClick={handleCopy}
            title="Copy coordinates to clipboard"
          >
            {copied ? <><IconCheck size={11} /> Copied</> : <><IconCopy size={11} /> Copy</>}
          </button>
          <a
            href={osmUrl}
            target="_blank"
            rel="noreferrer"
            className="map-ext-link"
            title="Open in OpenStreetMap ↗"
          >
            Maps <IconExternal size={11} />
          </a>
        </div>
      </div>

      <div className="map-visual-container">
        <svg
          viewBox="0 0 320 180"
          className="station-svg"
          role="img"
          aria-label={`Geospatial station at ${formatCoords(lat, lon)}`}
        >
          <defs>
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c2340" />
              <stop offset="50%" stopColor="#133e68" />
              <stop offset="100%" stopColor="#08182b" />
            </linearGradient>

            <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2c2416" />
              <stop offset="50%" stopColor="#3d3220" />
              <stop offset="100%" stopColor="#201a10" />
            </linearGradient>

            <linearGradient id="sedimentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Depth contours */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Map Canvas */}
          <rect
            width="320"
            height="180"
            rx="8"
            fill={type === 'water' ? 'url(#waterGrad)' : type === 'soil' ? 'url(#soilGrad)' : 'url(#sedimentGrad)'}
          />

          {/* Bathymetry / Elevation Isoline Contours */}
          <g className="map-contours" opacity="0.35" stroke="#60a5fa" fill="none" strokeWidth="1">
            <path d="M-20,40 C60,20 120,90 200,60 C260,30 310,80 340,50" />
            <path d="M-20,90 C50,70 140,140 220,100 C270,70 300,120 340,90" />
            <path d="M-20,130 C40,110 110,160 180,140 C250,110 290,150 340,130" />
            <ellipse cx="160" cy="90" rx="90" ry="50" strokeDasharray="3 3" opacity="0.4" />
            <ellipse cx="160" cy="90" rx="55" ry="32" strokeDasharray="2 2" opacity="0.6" />
          </g>

          {/* Graticule Grid Lines */}
          <g className="map-graticule" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8">
            <line x1="80" y1="0" x2="80" y2="180" strokeDasharray="2 2" />
            <line x1="160" y1="0" x2="160" y2="180" strokeDasharray="2 2" />
            <line x1="240" y1="0" x2="240" y2="180" strokeDasharray="2 2" />
            <line x1="0" y1="45" x2="320" y2="45" strokeDasharray="2 2" />
            <line x1="0" y1="90" x2="320" y2="90" strokeDasharray="2 2" />
            <line x1="0" y1="135" x2="320" y2="135" strokeDasharray="2 2" />
          </g>

          {/* Station Pin with Radar Pulse */}
          <g transform="translate(160, 90)">
            {/* Animated Radar Rings */}
            <circle r="22" className="radar-pulse-ring" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.4" />
            <circle r="12" fill="none" stroke="#0284c7" strokeWidth="1.5" opacity="0.7" />
            <circle r="6" fill="#38bdf8" filter="url(#glow)" />
            <circle r="3" fill="#ffffff" />
          </g>

          {/* Coordinates Overlay Bar */}
          <rect x="10" y="148" width="300" height="24" rx="4" fill="rgba(15, 23, 42, 0.75)" />
          <text x="20" y="164" fill="#94a3b8" fontSize="10" fontFamily="system-ui, sans-serif">
            STATION LOC:
          </text>
          <text x="96" y="164" fill="#f8fafc" fontSize="10" fontFamily="ui-monospace, monospace" fontWeight="600">
            {formatCoords(lat, lon)}
          </text>
        </svg>
      </div>

      <div className="station-footer">
        <span className="station-locality" title={locality}>
          <IconPin size={11} /> {locality}
        </span>
        <span className="station-coords-raw mono">{coordString}</span>
      </div>
    </div>
  );
}
