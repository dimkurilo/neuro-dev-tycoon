import { useState } from 'react';
import { Rng, randomSeed } from '../../sim/rng';
import { INTRO_SLIDES, type IntroSlide } from '../../data/intro';
import { suggestCompanyName, suggestFounderName } from '../../data/names';
import { useGame } from '../../store/useGame';
import { Btn, cn } from '../primitives';

const ART_STROKE = '#2f3c5e';

function Art({ kind }: { kind: IntroSlide['art'] }) {
  if (kind === 'garage') {
    return (
      <svg viewBox="0 0 320 180" className="h-auto w-full" aria-hidden="true">
        <rect width="320" height="180" rx="20" fill="#0e1424" />
        <rect x="70" y="42" width="180" height="118" rx="8" fill="#161e33" stroke={ART_STROKE} />
        {[62, 76, 90, 104].map((y) => (
          <line key={y} x1="80" y1={y} x2="240" y2={y} stroke={ART_STROKE} strokeWidth="3" strokeLinecap="round" />
        ))}
        <polygon points="160,34 118,128 202,128" fill="#ffb020" fillOpacity="0.07" />
        <line x1="160" y1="12" x2="160" y2="28" stroke={ART_STROKE} strokeWidth="2" />
        <circle cx="160" cy="33" r="6" fill="#ffb020" />
        <rect x="104" y="118" width="112" height="8" rx="4" fill="#3b4a75" />
        <rect x="112" y="126" width="6" height="30" fill="#3b4a75" />
        <rect x="202" y="126" width="6" height="30" fill="#3b4a75" />
        <rect x="134" y="82" width="52" height="36" rx="4" fill="#0b0f1a" stroke="#8b7bff" strokeWidth="2" />
        <polygon points="128,118 192,118 184,110 136,110" fill="#4a5890" />
        <ellipse cx="160" cy="100" rx="46" ry="26" fill="#8b7bff" fillOpacity="0.16" />
        <polyline points="140,108 148,102 154,106 160,96 168,100 174,90 180,92" fill="none" stroke="#b89dff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === 'graph') {
    return (
      <svg viewBox="0 0 320 180" className="h-auto w-full" aria-hidden="true">
        <rect width="320" height="180" rx="20" fill="#0e1424" />
        <line x1="48" y1="28" x2="48" y2="146" stroke={ART_STROKE} strokeWidth="2" strokeLinecap="round" />
        <line x1="48" y1="146" x2="282" y2="146" stroke={ART_STROKE} strokeWidth="2" strokeLinecap="round" />
        <path d="M56 44 C 96 46, 112 96, 150 108 S 232 124, 274 128" fill="none" stroke="#ff5a6e" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" />
        <path d="M56 132 C 110 130, 150 110, 190 78 S 250 44, 276 38" fill="none" stroke="#3ddc84" strokeWidth="3" strokeLinecap="round" />
        <circle cx="274" cy="128" r="5" fill="#ff5a6e" />
        <circle cx="276" cy="38" r="5" fill="#3ddc84" />
      </svg>
    );
  }
  if (kind === 'team') {
    return (
      <svg viewBox="0 0 320 180" className="h-auto w-full" aria-hidden="true">
        <rect width="320" height="180" rx="20" fill="#0e1424" />
        <rect x="76" y="18" width="168" height="78" rx="8" fill="#161e33" stroke={ART_STROKE} />
        <line x1="110" y1="44" x2="160" y2="36" stroke="#8b7bff" strokeWidth="1.5" />
        <line x1="160" y1="36" x2="210" y2="56" stroke="#8b7bff" strokeWidth="1.5" />
        <line x1="110" y1="44" x2="142" y2="78" stroke="#41d4f0" strokeWidth="1.5" />
        <line x1="142" y1="78" x2="210" y2="56" stroke="#41d4f0" strokeWidth="1.5" />
        <circle cx="110" cy="44" r="6" fill="#b89dff" />
        <circle cx="160" cy="36" r="6" fill="#b89dff" />
        <circle cx="210" cy="56" r="6" fill="#41d4f0" />
        <circle cx="142" cy="78" r="6" fill="#41d4f0" />
        {[
          [92, '#f2a65a'], [160, '#6aa9ff'], [228, '#5ad1a5'],
        ].map(([x, c]) => (
          <g key={x}>
            <circle cx={x} cy="122" r="13" fill={String(c)} />
            <path d={`M${Number(x) - 22} 166 a22 22 0 0 1 44 0z`} fill={String(c)} />
          </g>
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 320 180" className="h-auto w-full" aria-hidden="true">
      <rect width="320" height="180" rx="20" fill="#0e1424" />
      {[
        [36, 104, 34, 56], [78, 80, 30, 80], [114, 120, 26, 40], [148, 64, 36, 96], [190, 96, 28, 64], [224, 52, 34, 108], [264, 110, 30, 50],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="4" fill="#1a2338" stroke={ART_STROKE} />
      ))}
      {[
        [52, 118], [90, 96], [126, 134], [166, 80], [204, 112], [240, 68], [278, 124],
      ].map(([x, y], i) => (
        <circle key={i} cx={String(x)} cy={String(y)} r="2.6" fill="#ffb020" />
      ))}
      <polyline points="52,34 110,22 166,40 222,16 280,30" fill="none" stroke="#8b7bff" strokeWidth="1.5" strokeOpacity="0.7" />
      {[
        [52, 34], [110, 22], [166, 40], [222, 16], [280, 30],
      ].map(([x, y], i) => (
        <circle key={i} cx={String(x)} cy={String(y)} r="4" fill="#b89dff" />
      ))}
      <line x1="52" y1="34" x2="52" y2="118" stroke="#8b7bff" strokeOpacity="0.3" />
      <line x1="166" y1="40" x2="166" y2="80" stroke="#8b7bff" strokeOpacity="0.3" />
      <line x1="240" y1="26" x2="240" y2="68" stroke="#8b7bff" strokeOpacity="0.3" />
    </svg>
  );
}

export function Intro() {
  const startGame = useGame((s) => s.startGame);
  const toMenu = useGame((s) => s.toMenu);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => randomSeed());
  const [company, setCompany] = useState(() => suggestCompanyName(new Rng(seed)));
  const [founder, setFounder] = useState(() => suggestFounderName(new Rng(seed ^ 0x9e3779b9)));
  const slide = INTRO_SLIDES[index];
  const last = index === INTRO_SLIDES.length - 1;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 safe-top safe-bottom">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" aria-hidden="true">
          {INTRO_SLIDES.map((_, i) => (
            <span key={i} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-accent' : 'w-1.5 bg-line')} />
          ))}
        </div>
        <Btn variant="ghost" onClick={toMenu} className="-mr-2">
          Пропустить
        </Btn>
      </div>

      <div key={index} className="mt-4 animate-fade-in">
        <Art kind={slide.art} />
        <h2 className="mt-5 text-2xl leading-tight font-bold">{slide.title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{slide.text}</p>
      </div>

      <div className="mt-auto pt-5">
        {last && (
          <div className="mb-4 flex flex-col gap-2">
            <label className="text-xs font-semibold tracking-wide text-muted uppercase">
              Ваше имя
              <input value={founder} onChange={(e) => setFounder(e.target.value)} maxLength={28} className="field mt-1 text-[15px] font-normal normal-case tracking-normal text-text" />
            </label>
            <label className="text-xs font-semibold tracking-wide text-muted uppercase">
              Название лаборатории
              <div className="mt-1 flex gap-2">
                <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={28} className="field min-w-0 flex-1 text-[15px] font-normal normal-case tracking-normal text-text" />
                <Btn aria-label="Другое название" onClick={() => setCompany(suggestCompanyName(new Rng(seed + index + Date.now())))} className="px-3">
                  <span className="text-base">↻</span>
                </Btn>
              </div>
            </label>
          </div>
        )}
        <Btn variant="primary" full onClick={() => (last ? startGame(company, founder) : setIndex((i) => i + 1))}>
          {last ? 'Открыть лабораторию' : 'Дальше'}
        </Btn>
      </div>
    </div>
  );
}
