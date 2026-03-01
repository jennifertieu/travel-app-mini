import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { SEOUL_LOCATIONS, useDemoContext } from './DemoContext';

const MIN_MINUTES = 0;    // 6:00 AM
const MAX_MINUTES = 1080; // 12:00 AM (midnight)
const STEP_MINUTES = 15;

function setTimeOnDate(base: Date, minutesSince6am: number): Date {
  const d = new Date(base);
  const total = 6 * 60 + minutesSince6am;
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

function formatDemoDate(date: Date): string {
  try {
    const pad = (n: number) => String(n).padStart(2, '0');
    const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return format(parseISO(iso), 'EEE, MMM d');
  } catch {
    return '';
  }
}

// Current local date string of a Date (YYYY-MM-DD)
function localDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function DemoBanner() {
  const { isDemo, demoTime, demoLocation, tripLocations, tripDays, setDemoTime, setDemoLocation, resetDemo } =
    useDemoContext();
  const [open, setOpen] = useState(false);

  if (!isDemo) return null;

  const sliderValue = dateToMinutesSince6am(demoTime);
  const currentDateStr = localDateStr(demoTime);

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dateStr = e.target.value;
    const [year, month, day] = dateStr.split('-').map(Number);
    const newDate = new Date(demoTime);
    newDate.setFullYear(year, month - 1, day);
    setDemoTime(newDate);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    const loc = [...tripLocations, ...SEOUL_LOCATIONS].find((l) => l.name === name);
    if (!loc) return;
    setDemoLocation(loc);
    // Sync date + time when selecting a scheduled trip activity
    if (loc.date != null && loc.startMinutes != null) {
      const [year, month, day] = loc.date.split('-').map(Number);
      const newDate = new Date(demoTime);
      newDate.setFullYear(year, month - 1, day);
      newDate.setHours(Math.floor(loc.startMinutes / 60), loc.startMinutes % 60, 0, 0);
      setDemoTime(newDate);
    }
  };

  return (
    <div className="w-full bg-amber-500 text-black z-50 shrink-0">
      {/* Banner row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2 py-1 px-4 text-[11px] font-bold tracking-wider"
      >
        <span>DEMO MODE — {demoLocation.name} · {formatDemoDate(demoTime)} {formatTime(demoTime)}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expandable controls */}
      {open && (
        <div className="border-t border-amber-600 px-4 py-3 flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-amber-400">
          {/* Date */}
          {tripDays.length > 0 && (
            <div className="w-full sm:w-44 shrink-0">
              <div className="text-[10px] font-semibold mb-1">Date</div>
              <select
                value={currentDateStr}
                onChange={handleDayChange}
                className="w-full bg-amber-300 border border-amber-600 rounded px-2 py-1 text-xs text-black cursor-pointer"
              >
                {tripDays.map((d) => (
                  <option key={d.date} value={d.date}>
                    Day {d.day} · {format(parseISO(d.date), 'EEE, MMM d')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time */}
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <div className="flex justify-between mb-1 text-[10px] font-semibold">
              <span>Time</span>
              <span>{formatTime(demoTime)}</span>
            </div>
            <input
              type="range"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={STEP_MINUTES}
              value={sliderValue}
              onChange={(e) => setDemoTime(setTimeOnDate(demoTime, Number(e.target.value)))}
              className="w-full accent-black cursor-pointer"
            />
            <div className="flex justify-between text-[9px] mt-0.5 opacity-70">
              <span>6 AM</span>
              <span>12 AM</span>
            </div>
          </div>

          {/* Location */}
          <div className="w-full sm:w-48 shrink-0">
            <div className="text-[10px] font-semibold mb-1">Location</div>
            <select
              value={demoLocation.name}
              onChange={handleLocationChange}
              className="w-full bg-amber-300 border border-amber-600 rounded px-2 py-1 text-xs text-black cursor-pointer"
            >
              {tripLocations.length > 0 && (() => {
                // Group locations by day
                const byDay = new Map<number, typeof tripLocations>();
                const noDayLocs: typeof tripLocations = [];
                for (const loc of tripLocations) {
                  if (loc.day != null) {
                    if (!byDay.has(loc.day)) byDay.set(loc.day, []);
                    byDay.get(loc.day)!.push(loc);
                  } else {
                    noDayLocs.push(loc);
                  }
                }
                const sortedDays = [...byDay.keys()].sort((a, b) => a - b);
                return (
                  <>
                    {sortedDays.map((dayNum) => {
                      const locs = byDay.get(dayNum)!;
                      const dateLabel = locs[0].date
                        ? format(parseISO(locs[0].date), 'EEE, MMM d')
                        : '';
                      return (
                        <optgroup key={`day-${dayNum}`} label={`Day ${dayNum}${dateLabel ? ` · ${dateLabel}` : ''}`}>
                          {locs.map((loc) => (
                            <option key={`trip-${loc.name}`} value={loc.name}>
                              {loc.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                    {noDayLocs.length > 0 && (
                      <optgroup label="Trip Activities">
                        {noDayLocs.map((loc) => (
                          <option key={`trip-${loc.name}`} value={loc.name}>
                            {loc.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                );
              })()}
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
            className="shrink-0 px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 text-black text-[10px] font-bold uppercase tracking-widest transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
