import type { ReactNode } from 'react';

// Инлайн-SVG-иконки: штриховые, сетка 24×24, наследуют currentColor.
const ICONS = {
  // ── управление и навигация ──
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />,
  pause: <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none" />,
  ff2: <path d="M4 6v12l8-6zM12 6v12l8-6z" fill="currentColor" stroke="none" />,
  ff4: <path d="M2 7v10l6.5-5zM8.5 7v10l6.5-5zM15 7v10l7-5z" fill="currentColor" stroke="none" />,
  project: (
    <>
      <circle cx="5" cy="6" r="1.8" />
      <circle cx="5" cy="18" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="6" r="1.8" />
      <circle cx="19" cy="18" r="1.8" />
      <path d="M6.6 6.9l3.9 4.1M6.6 17.1l3.9-4.1M13.5 11l4-4.1M13.5 13l4 4.1" />
    </>
  ),
  lab: <path d="M9 3h6M10 3v6.2L4.8 18.4A1.2 1.2 0 0 0 5.9 20h12.2a1.2 1.2 0 0 0 1.1-1.6L14 9.2V3M7.5 14.5h9" />,
  team: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0M16 14.6a4.6 4.6 0 0 1 5 4.4" />
      <circle cx="17.5" cy="9" r="2.4" />
    </>
  ),
  office: <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2 21h20M7.5 8h3M7.5 12h3M7.5 16h3" />,
  market: <path d="M4 3v18h17M8 16v-5M12 16V7M16 16v-7M20 16V5" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
  home: <path d="M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-6h4v6" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),

  // ── статусы и деньги ──
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 6.5v11M14.8 8.8c-.6-.7-1.6-1.1-2.8-1.1-1.7 0-3 .9-3 2.1s1.2 1.8 3 2.1 3 .9 3 2.1-1.3 2.1-3 2.1c-1.2 0-2.2-.4-2.8-1.1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  spark: <path d="M12 3l2 6.2L20 11l-6 1.8L12 19l-2-6.2L4 11l6-1.8z" />,
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.3 5L4 16.7V20h3.3l5.4-5.4a4 4 0 0 0 5-5.3l-2.5 2.5-2.7-.8-.8-2.7z" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9.5" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  flat: <path d="M5 12h14" />,
  fire: <path d="M12 3c.8 3 5 5.2 5 10a5 5 0 0 1-10 0c0-2.2 1-3.8 2.6-5.4.3 1.6 1.2 2.4 2.4 2.4.3-2.6-.8-4.6 0-7z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  alert: <path d="M12 4l9 16H3zM12 10v4.5M12 17.5v.1" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.5v.1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13.5h9l1-13.5M10 11v6M14 11v6" />,
  bulb: <path d="M9 18h6M10 21h4M8.5 14.5a6 6 0 1 1 7 0c-.8.7-1.5 1.6-1.5 2.5h-4c0-.9-.7-1.8-1.5-2.5z" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
    </>
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.1M4.5 12h.1M4.5 18h.1" />,
  doc: <path d="M6.5 3h7.5l4.5 4.5V21h-12zM14 3v4.5h4.5M9 12h6M9 16h6" />,
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
      <path d="M9 4.5v-1h6v1M9 10h6M9 13.5h6M9 17h4" />
    </>
  ),
  save: <path d="M5 3h11l3 3v15H5zM8 3v5h7V3M8 14h8v7H8z" />,
  download: <path d="M12 4v11M7 10.5l5 5 5-5M4 20h16" />,
  upload: <path d="M12 16V5M7 9.5l5-5 5 5M4 20h16" />,
  hourglass: <path d="M6.5 3.5h11M6.5 20.5h11M7.5 3.5v3.5L12 12l4.5-5V3.5M7.5 20.5V17L12 12l4.5 5v3.5" />,
  key: (
    <>
      <circle cx="8" cy="14" r="4" />
      <path d="M11 11l9-9M17 5l2.5 2.5M14.5 7.5L17 10" />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.3 1.3M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.3-1.3" />,

  // ── ресурсы и техника ──
  chip: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5S9.5 5.8 12 3.5z" />
    </>
  ),
  cloud: <path d="M7 18.5a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.7 1.3A3.5 3.5 0 0 1 17 18.5z" />,
  phone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 5.5h3M11 18.5h2" />
    </>
  ),
  cube: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12L4 7.5M12 12v9" />,
  server: (
    <>
      <rect x="4" y="4" width="16" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="16" height="6.5" rx="1.5" />
      <path d="M7.5 7.2h.1M7.5 16.8h.1M16 7.2h1M16 16.8h1" />
    </>
  ),
  atom: (
    <>
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9" ry="3.8" />
      <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)" />
    </>
  ),
  wallet: (
    <>
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h12v2.5M3.5 7.5v10A2.5 2.5 0 0 0 6 20h14.5v-11H6A2.5 2.5 0 0 1 3.5 7.5z" />
      <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12.5" rx="2" />
      <path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M3.5 12.5h17M10.5 12.5v2h3v-2" />
    </>
  ),
  hand: <path d="M12 3v9M8.5 8.5L12 5l3.5 3.5M4.5 13.5v5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M4 13.5h4l1.5 1.5h5a1.3 1.3 0 0 1 0 2.6H9" />,
  crown: <path d="M3.5 8l4 4 4.5-6.5 4.5 6.5 4-4-1.5 10.5h-14zM5 20.5h14" />,
  gift: (
    <>
      <rect x="3.5" y="8.5" width="17" height="4" rx="1" />
      <path d="M5 12.5v8h14v-8M12 8.5v12M12 8.5c-1.5 0-4.5-.5-4.5-2.7C7.5 4 9 3.5 10 4c1.3.6 2 2.8 2 4.5 0-1.7.7-3.9 2-4.5 1-.5 2.5 0 2.5 1.8 0 2.2-3 2.7-4.5 2.7z" />
    </>
  ),
  percent: (
    <>
      <path d="M5.5 18.5l13-13" />
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
    </>
  ),
  megaphone: <path d="M3.5 10.5v3a1 1 0 0 0 1 1h2.5l5.5 4v-13l-5.5 4H4.5a1 1 0 0 0-1 1zM15.5 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" />,
  news: <path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 8h3v9a2 2 0 0 1-2 2M7 9h7M7 12.5h7M7 16h4" />,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 5.5H5v1A3.5 3.5 0 0 0 8.5 10M16 5.5h3v1a3.5 3.5 0 0 1-3.5 3.5M12 13v4M8.5 20h7M10 17h4" />,
  medal: (
    <>
      <circle cx="12" cy="14" r="5.5" />
      <path d="M8.5 9.5L6 3h4l2 4 2-4h4l-2.5 6.5" />
    </>
  ),
  trend: <path d="M3.5 17.5l6-6 3.5 3.5 7.5-8M15 6.5h5.5V12" />,
  pie: <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12zM14.5 2.8a8.5 8.5 0 0 1 6.7 6.7h-6.7z" />,
  pin: (
    <>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),

  // ── домены ──
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  filter: <path d="M4 5h16l-6 7.5V20l-4-2v-5.5z" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4 4 0 0 1 12 7.5 4 4 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10zM6.5 13h3l1.5-3 2 5 1.5-2.5h3" />,
  leaf: <path d="M5 19C5 9 11 4.5 20 4c.5 9-4 15-14 15M5 19c2-5 5.5-8.5 10-11" />,
  rocket: (
    <>
      <path d="M12 2.5c3.5 2 5 5.5 5 9.5 0 2-.5 4-1.5 5.5h-7c-1-1.5-1.5-3.5-1.5-5.5 0-4 1.5-7.5 5-9.5z" />
      <circle cx="12" cy="10" r="1.6" />
      <path d="M9 19.5c0 1.2 1.2 2 3 2s3-.8 3-2" />
    </>
  ),
  factory: <path d="M3.5 20.5V10l5 3v-3l5 3v-3l7 4v6.5zM3.5 20.5h17M6.5 16.5h1.5M11 16.5h1.5M15.5 16.5h1.5M17 7V3.5h2V10" />,
  text: <path d="M5 6V4h14v2M12 4v16M9 20h6" />,
  translate: <path d="M3.5 6h9M8 4v2M10.5 6c-.6 4-3.3 7.5-7 9.5M6 9.5c1.3 2.6 3.6 4.6 6.5 6M13 20l4.5-11L22 20M14.5 16.5h6" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16M8 20h8M4 7h16M6 7l-2.5 6h5zM18 7l-2.5 6h5" />
      <path d="M3.5 13a2.5 2.5 0 0 0 5 0M15.5 13a2.5 2.5 0 0 0 5 0" />
    </>
  ),
  grad: <path d="M2.5 9L12 4.5 21.5 9 12 13.5zM6.5 11.2V16c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.8M21.5 9v5.5" />,
  shield: <path d="M12 3l8 3v6c0 4.6-3.2 7.8-8 9.5-4.8-1.7-8-4.9-8-9.5V6z" />,
  shieldCheck: (
    <>
      <path d="M12 3l8 3v6c0 4.6-3.2 7.8-8 9.5-4.8-1.7-8-4.9-8-9.5V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  code: <path d="M8.5 7L4 12l4.5 5M15.5 7L20 12l-4.5 5M13.5 5l-3 14" />,
  pen: <path d="M4 20l1-4.5L16.5 4a1.5 1.5 0 0 1 2.1 0l1.4 1.4a1.5 1.5 0 0 1 0 2.1L8.5 19zM14 6.5l3.5 3.5M5 15.5l3.5 3.5" />,
  chat: (
    <>
      <path d="M4 5.5h16v11H10l-4.5 3.5v-3.5H4z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
    </>
  ),
  speaker: <path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" />,
  wave: <path d="M3 12h2l2-6 3 12 3-14 3 12 2-4h3" />,
  music: (
    <>
      <path d="M9 18V5.5l10-2V16" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M4.5 17l5-5 3.5 3.5 2.5-2.5 4.5 4.5" />
    </>
  ),
  film: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M3.5 9h17M3.5 15h17M8 4v16M16 4v16" />
    </>
  ),
  avatar: (
    <>
      <circle cx="12" cy="9" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0M12 2.5v2M20 9h-2M6 9H4" />
    </>
  ),
  bank: <path d="M3.5 9.5L12 4l8.5 5.5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3.5 17h17M3 20.5h18" />,
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17M3.5 12h17M6.2 6.2c3.2 3.4 3.2 8.2 0 11.6M17.8 6.2c-3.2 3.4-3.2 8.2 0 11.6" />
    </>
  ),
  thermo: (
    <>
      <path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z" />
      <path d="M12 9v7" />
    </>
  ),
  bolt: <path d="M13 3L5 13.5h5.5L10 21l8-10.5h-5.5z" />,
  mountain: <path d="M2.5 19L9 7.5l4 6.5 2.5-3.5L21.5 19zM8 10.5l1 1.5 1-1" />,
  flask: <path d="M9.5 3h5M10.5 3v6L5.2 18.2A1.3 1.3 0 0 0 6.4 20h11.2a1.3 1.3 0 0 0 1.2-1.8L13.5 9V3M8 14.5h8" />,
  dna: <path d="M7 3c0 5 10 7 10 12M17 3c0 5-10 7-10 12M7 15c0 3 .8 4.5 2 6M17 15c0 3-.8 4.5-2 6M8.5 7h7M8.5 17h7" />,
  bot: (
    <>
      <rect x="5" y="8" width="14" height="10" rx="2.5" />
      <path d="M12 8V4.5M9 4.5h6M9 13h.1M15 13h.1M9.5 21v-3M14.5 21v-3" />
    </>
  ),
  car: (
    <>
      <path d="M4 16v-4l2-5.5A1.5 1.5 0 0 1 7.4 5.5h9.2a1.5 1.5 0 0 1 1.4 1L20 12v4M3.5 16h17v3.5h-3V17.5h-8.5v2h-3zM7 12h10" />
      <circle cx="7.5" cy="13.8" r=".8" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="13.8" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  truck: (
    <>
      <path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.5v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  city: <path d="M3 21h18M5 21V9h6v12M11 21V4h7v17M13.5 7.5h2M13.5 11h2M13.5 14.5h2M7 12h1.5M7 15.5h1.5" />,
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="10" y="10" width="4" height="4" />
      <path d="M9 6V3M15 6V3M9 21v-3M15 21v-3M6 9H3M6 15H3M21 9h-3M21 15h-3" />
    </>
  ),
  sigma: <path d="M17 6.5V5H7l5.5 7L7 19h10v-1.5" />,
  gamepad: (
    <>
      <path d="M7 8h10a4.5 4.5 0 0 1 4.4 5.4l-.8 4a2.3 2.3 0 0 1-4 .9L14.5 16h-5l-2.1 2.3a2.3 2.3 0 0 1-4-.9l-.8-4A4.5 4.5 0 0 1 7 8z" />
      <path d="M8 11v3M6.5 12.5h3M15.5 11.5h.1M17.5 13.5h.1" />
    </>
  ),
  pulse: <path d="M3 12h4l2-5.5 4 11 2-5.5h6" />,
  ruler: (
    <>
      <path d="M4 15.5L15.5 4 20 8.5 8.5 20z" />
      <path d="M8 12l1.5 1.5M10.5 9.5L12 11M13 7l1.5 1.5" />
    </>
  ),

  // ── парадигмы ──
  layers: <path d="M12 3.5l9 4.5-9 4.5-9-4.5zM3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5" />,
  grid: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9.33h16M4 14.66h16M9.33 4v16M14.66 4v16" />
    </>
  ),
  loop: <path d="M17 3.5l3 3-3 3M20 6.5H8a4.5 4.5 0 0 0-4.5 4.5M7 20.5l-3-3 3-3M4 17.5h12a4.5 4.5 0 0 0 4.5-4.5" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  compare: (
    <>
      <circle cx="9" cy="12" r="5.5" />
      <circle cx="15" cy="12" r="5.5" />
    </>
  ),
  droplet: <path d="M12 3.5s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  flag: <path d="M5 21V4M5 4.5h12l-2.5 4 2.5 4H5" />,
  nodes: (
    <>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5.5" cy="18" r="2" />
      <circle cx="18.5" cy="18" r="2" />
      <path d="M11 7l-4 9M13 7l4 9M7.5 18h9" />
    </>
  ),
  braces: <path d="M8.5 4c-2 0-2.5 1-2.5 2.5v3c0 1.5-.7 2.5-2 2.5 1.3 0 2 1 2 2.5v3c0 1.5.5 2.5 2.5 2.5M15.5 4c2 0 2.5 1 2.5 2.5v3c0 1.5.7 2.5 2 2.5-1.3 0-2 1-2 2.5v3c0 1.5-.5 2.5-2.5 2.5" />,
  tree: (
    <>
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="6" cy="18.5" r="2.2" />
      <circle cx="18" cy="18.5" r="2.2" />
      <path d="M12 7.2v3.3M12 10.5l-5 6.5M12 10.5l5 6.5" />
    </>
  ),
  curve: <path d="M3.5 19.5h17M4 19.5c3 0 4-13 8-13s5 13 8 13M12 4v3" />,
  blend: (
    <>
      <rect x="4" y="4" width="10" height="10" rx="2" />
      <rect x="10" y="10" width="10" height="10" rx="2" />
    </>
  ),
  mix: (
    <>
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
      <rect x="8.5" y="4" width="7" height="7" rx="1.2" />
    </>
  ),
  stack: <path d="M12 3l7 3.5-7 3.5-7-3.5zM5 11l7 3.5 7-3.5M5 15l7 3.5 7-3.5" />,

  // ── офисные объекты и бусты ──
  coffee: <path d="M4 8.5h12v6a4.5 4.5 0 0 1-4.5 4.5h-3A4.5 4.5 0 0 1 4 14.5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M7.5 3v2.5M11 3v2.5" />,
  pizza: (
    <>
      <path d="M12 3L3 20a1 1 0 0 0 1.3 1.3L21.5 12.5A1 1 0 0 0 21 10.8L13.4 3.3A1 1 0 0 0 12 3z" />
      <circle cx="10.5" cy="11" r="1.2" />
      <circle cx="13" cy="15.5" r="1.2" />
      <circle cx="8" cy="16" r="1.2" />
    </>
  ),
  bed: <path d="M3 6v13.5M3 16.5h18v3M3 12.5h18v4M6.5 12.5V10h5v2.5M14 12.5v-1a2 2 0 0 1 2-2h2a3 3 0 0 1 3 3" />,
  plant: <path d="M7.5 13.5h9l-1 8h-7zM12 13.5V8M12 8C12 5 9.5 3.5 6 3.5c0 3.5 2.5 4.5 6 4.5zM12 10c0-3 2.5-4.5 6-4.5 0 3.5-2.5 4.5-6 4.5z" />,
  board: (
    <>
      <rect x="3.5" y="4" width="17" height="11" rx="1.5" />
      <path d="M12 15v5M8.5 20h7M7 8h5M7 11h8M15.5 8h1.5" />
    </>
  ),
  sofa: <path d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11M3.5 13a2 2 0 0 1 4 0v1h9v-1a2 2 0 0 1 4 0v4.5h-17zM5 18.5V20M19 18.5V20" />,
  library: <path d="M4 4h3v15H4zM9 4h3v15H9zM14.2 4.8l2.9-.8 3.8 14.5-2.9.8zM3 20.5h18" />,
  dumbbell: <path d="M8 12h8M3 10v4M6.5 7.5v9M17.5 7.5v9M21 10v4M6.5 12h11" />,
  door: <path d="M5 21V4.5h11V21M16 12h3v9M3 21h18M12.5 12.5v.1" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? 'h-5 w-5'}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}
