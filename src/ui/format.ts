/** «70 000» — с неразрывными пробелами */
export function fmtInt(n: number): string {
  const rounded = Math.round(Math.abs(n));
  const body = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return (n < 0 ? '−' : '') + body;
}

/** «1,2 млн», «45 тыс.», «980» */
export function fmtCompact(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1e9) return `${sign}${fmt1(a / 1e9)} млрд`;
  if (a >= 1e6) return `${sign}${fmt1(a / 1e6)} млн`;
  if (a >= 1e4) return `${sign}${Math.round(a / 1e3)} тыс.`;
  return `${sign}${fmtInt(a)}`;
}

/** «70 тыс. Cr» */
export function fmtMoney(n: number): string {
  return `${fmtCompact(n)} Cr`;
}

/** «+1,2 тыс.» / «−980» */
export function fmtSigned(n: number): string {
  if (Math.abs(Math.round(n)) === 0) return '0';
  return `${n > 0 ? '+' : '−'}${fmtCompact(Math.abs(n))}`;
}

/** одно знаком после запятой */
export function fmt1(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

export function plural(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(Math.round(n)) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

/** «5 недель» */
export function fmtCount(n: number, forms: readonly [string, string, string]): string {
  return `${fmtInt(n)} ${plural(n, forms)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '');
}

/** итоговая длительность «4 года 12 недель» */
export function fmtDuration(weeks: number): string {
  const years = Math.floor(weeks / 52);
  const rest = weeks % 52;
  if (years === 0) return fmtCount(rest, ['неделя', 'недели', 'недель']);
  const y = `${years} ${plural(years, ['год', 'года', 'лет'])}`;
  return rest > 0 ? `${y} ${fmtCount(rest, ['неделя', 'недели', 'недель'])}` : y;
}

export function downloadText(filename: string, text: string, mime = 'application/json'): boolean {
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* file:// без прав на буфер — пробуем выделение */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
