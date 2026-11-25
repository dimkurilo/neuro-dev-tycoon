import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FinancePoint } from '../../types';
import { MONTHS, monthOf } from '../../sim/time';
import { useGame } from '../../store/useGame';
import { Card, SectionTitle } from '../primitives';
import { fmtCompact, fmtMoney } from '../format';

const NO_POINTS: FinancePoint[] = [];
const GRID = '#2a3552';
const AXIS = '#94a1c0';
const TOOLTIP_STYLE = { background: '#1a2338', border: '1px solid #2a3552', borderRadius: 12, fontSize: 12, color: '#e9edf7', padding: '8px 10px' };

function chartData(points: FinancePoint[]): { name: string; income: number; expenses: number; hype: number }[] {
  return points.slice(-26).map((p) => ({ name: MONTHS[monthOf(p.week)], income: Math.round(p.income), expenses: Math.round(p.expenses), hype: Math.round(p.hype) }));
}

const axisProps = { stroke: AXIS, tickLine: false, axisLine: false, tick: { fontSize: 11, fill: AXIS } } as const;

/** доходы и расходы за последние полгода */
export function FinanceChart() {
  const points = useGame((s) => s.game?.finance ?? NO_POINTS);
  const data = chartData(points);
  return (
    <Card className="p-3">
      <div className="mb-1 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-good" />
          доход
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-bad" />
          расход
        </span>
        <span className="num ml-auto">{data.length} недель</span>
      </div>
      {data.length < 2 ? (
        <p className="py-6 text-center text-sm text-muted">График появится через пару недель игры.</p>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" {...axisProps} minTickGap={20} />
              <YAxis {...axisProps} width={46} tickFormatter={(value: number) => fmtCompact(value)} />
              <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#e9edf7' }} cursor={{ stroke: AXIS, strokeDasharray: '3 3' }} formatter={(value) => fmtMoney(Number(value))} />
              <Area type="monotone" dataKey="income" stroke="#3ddc84" fill="#3ddc84" fillOpacity={0.22} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="expenses" stroke="#ff5a6e" fill="#ff5a6e" fillOpacity={0.16} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/** хайп за последние полгода */
export function HypeChart() {
  const points = useGame((s) => s.game?.finance ?? NO_POINTS);
  const data = chartData(points);
  return (
    <Card className="p-3">
      <div className="mb-1 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warn" />
          хайп
        </span>
        <span className="num ml-auto">из 100</span>
      </div>
      {data.length < 2 ? (
        <p className="py-6 text-center text-sm text-muted">График появится через пару недель игры.</p>
      ) : (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" {...axisProps} minTickGap={20} />
              <YAxis {...axisProps} width={28} domain={[0, 100]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#e9edf7' }} cursor={{ stroke: AXIS, strokeDasharray: '3 3' }} formatter={(value) => `${value} из 100`} />
              <Line type="monotone" dataKey="hype" stroke="#ffb020" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function ChartsSection() {
  return (
    <>
      <SectionTitle>Доходы и расходы</SectionTitle>
      <FinanceChart />
      <SectionTitle>Хайп</SectionTitle>
      <HypeChart />
    </>
  );
}
