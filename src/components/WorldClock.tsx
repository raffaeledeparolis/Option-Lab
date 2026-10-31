import React, { useState, useEffect } from 'react';

interface WorldClockProps {
  city: string;
  timeZone: string;
  tzAbbr: string;
  marketHours: { openHour: number; closeHour: number }; // In local market time
  size?: number; // clock face diameter, default 110px (reduced size as requested)
}

export const WorldClock: React.FC<WorldClockProps> = ({
  city,
  timeZone,
  tzAbbr,
  marketHours,
  size = 110,
}) => {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time in the target timezone
  const getZonedParts = () => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      });
      const parts = formatter.formatToParts(time);
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
      const second = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);
      return { hour, minute, second };
    } catch {
      const h = time.getUTCHours();
      const m = time.getUTCMinutes();
      const s = time.getUTCSeconds();
      return { hour: h, minute: m, second: s };
    }
  };

  const { hour, minute, second } = getZonedParts();

  // Determine if session is open
  const dayOfWeek = new Date().toLocaleDateString('en-US', { timeZone, weekday: 'short' });
  const isWeekend = dayOfWeek === 'Sat' || dayOfWeek === 'Sun';
  const isOpen = !isWeekend && hour >= marketHours.openHour && hour < marketHours.closeHour;

  // Hand angles
  const secondAngle = (second / 60) * 360;
  const minuteAngle = ((minute + second / 60) / 60) * 360;
  const hourAngle = (((hour % 12) + minute / 60) / 12) * 360;

  const radius = size / 2;
  const center = radius;

  // Formatted digital time string
  const digitalTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center">
      {/* City Title */}
      <div className="mb-2 text-center">
        <h4 className="text-xs sm:text-sm font-bold tracking-wider text-slate-100 uppercase">
          {city}
        </h4>
      </div>

      {/* Analog Clock Dial (Reduced Size as requested) */}
      <div
        className="relative rounded-full flex items-center justify-center border border-slate-700/60 shadow-[0_0_20px_rgba(15,23,42,0.8)]"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: 'radial-gradient(circle, rgba(15,23,42,0.9) 0%, rgba(8,14,28,0.95) 100%)',
        }}
      >
        <svg width={size} height={size} className="overflow-visible">
          {/* Outer circle border glow */}
          <circle
            cx={center}
            cy={center}
            r={radius - 2}
            fill="none"
            stroke="rgba(56, 189, 248, 0.2)"
            strokeWidth="1.5"
          />

          {/* Hour tick marks */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const isMain = i % 3 === 0;
            const rInner = radius - (isMain ? 9 : 6);
            const rOuter = radius - 3;
            const x1 = center + rInner * Math.sin(angle);
            const y1 = center - rInner * Math.cos(angle);
            const x2 = center + rOuter * Math.sin(angle);
            const y2 = center - rOuter * Math.cos(angle);

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMain ? 'rgba(224, 242, 254, 0.7)' : 'rgba(148, 163, 184, 0.35)'}
                strokeWidth={isMain ? 1.5 : 0.9}
                strokeLinecap="round"
              />
            );
          })}

          {/* Hour Hand */}
          <line
            x1={center}
            y1={center}
            x2={center + (radius * 0.48) * Math.sin((hourAngle * Math.PI) / 180)}
            y2={center - (radius * 0.48) * Math.cos((hourAngle * Math.PI) / 180)}
            stroke="rgba(241, 245, 249, 0.9)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Minute Hand */}
          <line
            x1={center}
            y1={center}
            x2={center + (radius * 0.72) * Math.sin((minuteAngle * Math.PI) / 180)}
            y2={center - (radius * 0.72) * Math.cos((minuteAngle * Math.PI) / 180)}
            stroke="rgba(203, 213, 225, 0.9)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Second Hand (Cyan accent with counterweight) */}
          <line
            x1={center - (radius * 0.16) * Math.sin((secondAngle * Math.PI) / 180)}
            y1={center + (radius * 0.16) * Math.cos((secondAngle * Math.PI) / 180)}
            x2={center + (radius * 0.78) * Math.sin((secondAngle * Math.PI) / 180)}
            y2={center - (radius * 0.78) * Math.cos((secondAngle * Math.PI) / 180)}
            stroke="#38bdf8"
            strokeWidth="1.0"
            strokeLinecap="round"
          />

          {/* Center Pivot Dot */}
          <circle cx={center} cy={center} r={3} fill="#38bdf8" />
          <circle cx={center} cy={center} r={1.2} fill="#0f172a" />
        </svg>
      </div>

      {/* Digital Time & Timezone code */}
      <div className="mt-2 text-center">
        <div className="text-sm font-bold font-mono tracking-tight text-slate-100">
          {digitalTimeStr}
        </div>
        <div className="text-[10px] font-mono text-slate-400 font-semibold tracking-wider">
          {tzAbbr}
        </div>
      </div>

      {/* Market Status Pill */}
      <div className="mt-1 flex items-center gap-1">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
          }`}
        />
        <span
          className={`text-[9px] font-mono font-medium uppercase ${
            isOpen ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          {isOpen ? 'Aperto' : 'Chiuso'}
        </span>
      </div>
    </div>
  );
};
