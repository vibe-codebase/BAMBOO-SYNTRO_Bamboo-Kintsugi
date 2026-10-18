type P = { size?: number };
const s = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const Pause = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 6.5v11M15 6.5v11" /></svg>;
export const Back = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>;
export const Next = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>;
export const Restart = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4.5v3.5h3.5" /></svg>;
export const Gear = ({ size }: P) => (
  <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></svg>
);
/** A tea bowl. */
export const Bowl = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M3.5 8.5h17c0 5-3.5 8.5-8.5 8.5S3.5 13.5 3.5 8.5z" /><path d="M9.5 17v2.5h5V17" /><ellipse cx="12" cy="8.5" rx="8.5" ry="1.6" /></svg>;
/** A shelf of pots, for the level list. */
export const Shelf = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M3 19.5h18" /><path d="M5 19.5c-.5-3 0-5.5 2-6.5h1.5c2 1 2.5 3.5 2 6.5" /><path d="M13.5 19.5c-.3-1.5 0-3 1.5-3.6h3c1.5.6 1.8 2.1 1.5 3.6" /><path d="M7 13V10.5h1.5V13" /></svg>;
/** A lamp: a hint. */
export const Lamp = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg>;
/** Stars are gold-mended bowls. */
export const Gold = ({ size = 22, on }: P & { on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    {on && <circle cx="12" cy="12" r="11" fill="rgba(240,190,90,.18)" />}
    <path d="M3.5 9h17c0 5-3.5 8.3-8.5 8.3S3.5 14 3.5 9z" fill={on ? '#2b1f18' : 'none'} stroke={on ? '#c79a4a' : 'rgba(255,255,255,.4)'} strokeWidth="1.3" />
    <path d="M9.6 17.2v2.3h4.8v-2.3" fill="none" stroke={on ? '#c79a4a' : 'rgba(255,255,255,.4)'} strokeWidth="1.3" />
    {on && <path d="M8 9.2l1.6 2.6-1 2.2 2.3 1.6M14.5 9.2l-.6 2.3 2.4 1.4" fill="none" stroke="#f4cf6e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>
);
/** A drop of spilled lacquer. */
export const Drop = ({ size = 16, on }: P & { on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M12 3.5c3.2 4.4 5.2 7.4 5.2 10.2a5.2 5.2 0 0 1-10.4 0c0-2.8 2-5.8 5.2-10.2z" fill={on ? '#8e2b1c' : 'none'} stroke={on ? '#c24a32' : 'rgba(255,255,255,.35)'} strokeWidth="1.5" />
    {on && <ellipse cx="10.2" cy="12.5" rx="1.2" ry="2" fill="rgba(255,255,255,.35)" />}
  </svg>
);
