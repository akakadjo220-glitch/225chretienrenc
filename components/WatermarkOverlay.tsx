import React from 'react';

interface WatermarkOverlayProps {
  userName?: string;
  phone?: string;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ userName, phone }) => {
  const label = `225 CHRÉTIEN • CONFIDENTIEL • ${userName || phone || 'MEMBRE VÉRIFIÉ'}`;

  return (
    <div className="fixed inset-0 pointer-events-none z-[80] overflow-hidden select-none opacity-[0.06] mix-blend-multiply">
      <div className="absolute inset-0 flex flex-wrap gap-12 p-8 transform -rotate-12 scale-125 items-center justify-center">
        {Array.from({ length: 40 }).map((_, idx) => (
          <span
            key={idx}
            className="text-slate-900 font-mono font-black text-xs tracking-widest whitespace-nowrap uppercase"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};
