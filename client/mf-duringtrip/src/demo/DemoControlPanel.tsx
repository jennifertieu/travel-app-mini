import { useState } from 'react';
import { SEOUL_LOCATIONS, useDemoContext } from './DemoContext';

const MIN_MINUTES = 0;    // 6:00 AM
const MAX_MINUTES = 1080; // 12:00 AM (midnight)
const STEP_MINUTES = 15;

function minutesSince6amToDate(minutes: number): Date {
  const d = new Date();
  const total = 6 * 60 + minutes;
  d.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return d;
}

function dateToMinutesSince6am(date: Date): number {
  return Math.max(MIN_MINUTES, date.getHours() * 60 + date.getMinutes() - 6 * 60);
}

function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

export function DemoControlPanel() {
  const { isDemo, demoTime, demoLocation, tripLocations, setDemoTime, setDemoLocation, resetDemo } =
    useDemoContext();
  const [collapsed, setCollapsed] = useState(false);

  if (!isDemo) return null;

  const sliderValue = dateToMinutesSince6am(demoTime);

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    const loc = [...tripLocations, ...SEOUL_LOCATIONS].find((l) => l.name === name);
    if (loc) setDemoLocation(loc);
  };

  return (
    <div className="fixed bottom-20 left-4 z-50 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl text-white text-xs w-56 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700">
        <span className="font-bold tracking-widest text-amber-400 text-[10px] uppercase">
          Demo Controls
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-neutral-400 hover:text-white leading-none"
          aria-label={collapsed ? 'Expand demo controls' : 'Collapse demo controls'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 py-3 space-y-4">
          {/* Time slider */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-neutral-400">Time</span>
              <span className="font-semibold tabular-nums">{formatTime(demoTime)}</span>
            </div>
            <input
              type="range"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={STEP_MINUTES}
              value={sliderValue}
              onChange={(e) => setDemoTime(minutesSince6amToDate(Number(e.target.value)))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-neutral-500 mt-0.5">
              <span>6 AM</span>
              <span>12 AM</span>
            </div>
          </div>

          {/* Location dropdown */}
          <div>
            <div className="mb-1.5 text-neutral-400">Location</div>
            <select
              value={demoLocation.name}
              onChange={handleLocationChange}
              className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-white cursor-pointer"
            >
              {tripLocations.length > 0 && (
                <optgroup label="Trip Activities">
                  {tripLocations.map((loc) => (
                    <option key={`trip-${loc.name}`} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Seoul Presets">
                {SEOUL_LOCATIONS.map((loc) => (
                  <option key={`preset-${loc.name}`} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Reset */}
          <button
            type="button"
            onClick={resetDemo}
            className="w-full py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 text-[10px] uppercase tracking-widest transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
