import { useEffect, useMemo, useState } from 'react';
import type { Modal } from '../types';
import { ACHIEVEMENTS } from '../data/achievements';
import { useGame } from '../store/useGame';
import { Icon } from './icons';
import { Btn, Notice, Sheet, cn } from './primitives';
import { copyText, downloadText, fmt1 } from './format';
import { formatDate } from '../sim/time';
import { CATEGORY_META } from './meta';

export function ModalHost() {
  const modal = useGame((s) => s.ui.modal);
  const close = useGame((s) => s.closeModal);
  if (!modal) return null;
  switch (modal.kind) {
    case 'news':
      return <NewsModal newsId={modal.newsId} onClose={close} />;
    case 'release':
      return <ReleaseModal modelId={modal.modelId} onClose={close} />;
    case 'insolvency':
      return <InsolvencyModal weeksLeft={modal.weeksLeft} onClose={close} />;
    case 'achievement':
      return <AchievementModal id={modal.id} onClose={close} />;
    case 'save':
      return <SaveSheet onClose={close} />;
    case 'confirm':
      return <ConfirmModal {...modal} onClose={close} />;
  }
}

/** если данные для модалки пропали (старый сейв) — просто закрываем, чтобы не запереть игру */
function useAutoClose(missing: boolean): void {
  const close = useGame((s) => s.closeModal);
  useEffect(() => {
    if (missing) close();
  }, [missing, close]);
}

export function NewsModal({ newsId, onClose }: { newsId: number; onClose: () => void }) {
  const item = useGame((s) => s.game?.news.find((n) => n.id === newsId));
  useAutoClose(!item);
  if (!item) return null;
  const meta = CATEGORY_META[item.category];
  return (
    <Sheet title="Новости" onClose={onClose} footer={<Btn variant="primary" full onClick={onClose}>Понятно</Btn>}>
      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: meta.color }}>
        <Icon name={meta.icon} className="h-4 w-4" />
        {meta.label}
        <span className="ml-auto text-muted">{formatDate(item.week)}</span>
      </div>
      <h3 className="mt-3 text-xl leading-snug font-bold">{item.title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed">{item.text}</p>
      {item.effects.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          {item.effects.map((e, i) => (
            <Notice key={i} tone="info" icon="trend">
              {e}
            </Notice>
          ))}
        </div>
      )}
    </Sheet>
  );
}

export function ReleaseModal({ modelId, onClose }: { modelId: number; onClose: () => void }) {
  const model = useGame((s) => s.game?.models.find((m) => m.id === modelId));
  useAutoClose(!model);
  if (!model) return null;
  return (
    <Sheet title="Оценки" onClose={onClose} footer={<Btn variant="primary" full onClick={onClose}>К продажам</Btn>}>
      <div className="text-center">
        <div className="text-sm text-muted">Средняя оценка «{model.name}»</div>
        <div className="num text-5xl font-extrabold text-accent">{fmt1(model.rating)}</div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {model.reviews.map((r) => (
          <div key={r.agency} className="rounded-xl border border-line bg-panel2 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{r.agency}</span>
              <span className="num text-lg font-bold">{fmt1(r.score)}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{r.quote}</p>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

export function InsolvencyModal({ weeksLeft, onClose }: { weeksLeft: number; onClose: () => void }) {
  return (
    <Sheet title="Баланс в минусе" onClose={onClose} footer={<Btn variant="primary" full onClick={onClose}>Разобраться</Btn>}>
      <Notice tone="bad" icon="alert">
        На счету лаборатории отрицательный баланс. Если через {weeksLeft} {weeksLeft === 1 ? 'неделю' : 'недели'} деньги не появятся, суд признает лабораторию банкротом.
      </Notice>
      <p className="mt-3 text-sm text-muted">Возьмите кредит на вкладке «Рынок», выполните контракт или сократите расходы на команду и офис.</p>
    </Sheet>
  );
}

export function AchievementModal({ id, onClose }: { id: string; onClose: () => void }) {
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  useAutoClose(!def);
  if (!def) return null;
  return (
    <Sheet title="Достижение" onClose={onClose} footer={<Btn variant="primary" full onClick={onClose}>Отлично</Btn>}>
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex h-24 w-24 animate-pop items-center justify-center rounded-3xl bg-warn/15 text-warn">
          <Icon name={def.icon} className="h-12 w-12" />
        </span>
        <div className="text-xl font-bold">{def.name}</div>
        <p className="text-sm text-muted">{def.desc}</p>
      </div>
    </Sheet>
  );
}

export function ConfirmModal({ title, text, confirmLabel, danger, onConfirm, onClose }: Extract<Modal, { kind: 'confirm' }> & { onClose: () => void }) {
  return (
    <Sheet title={title} onClose={onClose} footer={
      <div className="flex gap-2">
        <Btn variant="ghost" className="flex-1" onClick={onClose}>Отмена</Btn>
        <Btn variant={danger ? 'danger' : 'primary'} className="flex-1" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Btn>
      </div>
    }>
      <p className="text-[15px] leading-relaxed">{text}</p>
    </Sheet>
  );
}

export function SaveSheet({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game);
  const exportSave = useGame((s) => s.exportSave);
  const importSave = useGame((s) => s.importSave);
  const toast = useGame((s) => s.toast);
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const code = useMemo(() => (mode === 'export' ? (exportSave() ?? '') : ''), [mode, exportSave]);

  const copy = async () => {
    const ok = await copyText(code);
    toast(ok ? 'Код сейва скопирован' : 'Не удалось скопировать — выделите текст вручную', ok ? 'good' : 'bad');
  };

  const download = () => {
    const ok = downloadText(`neuro-lab-tycoon-${game ? game.companyName.replace(/\s+/g, '-').toLowerCase() : 'save'}.json`, code);
    toast(ok ? 'Файл сейва сохранён' : 'Не удалось скачать — скопируйте код', ok ? 'good' : 'bad');
  };

  const load = () => {
    const res = importSave(text.trim());
    if (!res.ok) setError(res.error);
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const content = await file.text();
      const res = importSave(content);
      if (!res.ok) setError(res.error);
    } catch {
      setError('Не удалось прочитать файл.');
    }
  };

  return (
    <Sheet title="Сохранение" onClose={onClose}>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-panel2 p-1" role="tablist">
        {(['export', 'import'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(''); }} className={cn('min-h-11 rounded-[10px] text-[15px] font-medium transition-colors', mode === m ? 'bg-accent text-[#15102e]' : 'text-muted active:bg-panel3')}>
            {m === 'export' ? 'Экспорт' : 'Импорт'}
          </button>
        ))}
      </div>

      {mode === 'export' ? (
        <div className="mt-3 flex flex-col gap-2">
          <Notice tone="info" icon="info">Код содержит всю партию. Перешлите его файлом или текстом — на другом устройстве вставьте его во вкладке «Импорт».</Notice>
          <textarea readOnly value={game ? code : ''} aria-label="Код сейва" className="field h-40 resize-none font-mono text-[11px] leading-snug text-muted" />
          <Btn variant="primary" full icon="copy" disabled={!game} onClick={copy}>Скопировать код</Btn>
          <Btn full icon="download" disabled={!game} onClick={download}>Скачать файл</Btn>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {error && <Notice tone="bad" icon="alert">{error}</Notice>}
          <textarea value={text} onChange={(e) => { setText(e.target.value); setError(''); }} placeholder="Вставьте код сейва…" aria-label="Код сейва для загрузки" className="field h-40 resize-none font-mono text-[11px] leading-snug" />
          <Btn variant="primary" full icon="upload" disabled={!text.trim()} onClick={load}>Загрузить сейв</Btn>
          <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-panel2 px-4 text-[15px] font-medium text-text">
            <Icon name="doc" className="h-5 w-5" />
            Выбрать файл
            <input type="file" accept=".json,application/json,.txt" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
          </label>
          <Notice tone="warn" icon="alert">Текущая партия будет заменена.</Notice>
        </div>
      )}
    </Sheet>
  );
}
