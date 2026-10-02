import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';

export interface MapCoordinatesHandle {
  update: (lng: number, lat: number, inside: boolean) => void;
}

// Pointer movement updates this small readout, never the map or application tree.
export default function MapCoordinates({ ref }: { ref: Ref<MapCoordinatesHandle> }) {
  const [coord, setCoord] = useState<{ lng: string; lat: string } | null>(null);
  const pending = useRef<typeof coord>(null);
  const frame = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    update(lng, lat, inside) {
      pending.current = inside ? { lng: lng.toFixed(2), lat: lat.toFixed(2) } : null;
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const next = pending.current;
        setCoord((current) => current?.lng === next?.lng && current?.lat === next?.lat ? current : next);
      });
    },
  }), []);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  return (
    <div className="hidden md:flex items-center gap-2">
      <span className="text-[#b49a63]/80">经纬</span>
      {coord ? <>
        <span className="border border-[#d8cfb7]/10 bg-[#d8cfb7]/5 px-1.5 py-0.5 text-[#d8cfb7]">N {coord.lat}°</span>
        <span className="border border-[#b49a63]/25 bg-[#b49a63]/10 px-1.5 py-0.5 text-[#d8cfb7]">E {coord.lng}°</span>
      </> : <span className="text-[#efe6cf]/60">— 将指针移至国土之上 —</span>}
    </div>
  );
}
