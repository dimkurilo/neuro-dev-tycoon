// Общие типы игры: контент, состояние, события симуляции.

// ─── Базовые ───
export type Speed = 0 | 1 | 2 | 4;
export type TabId = 'project' | 'lab' | 'team' | 'office' | 'market' | 'more';
export type Screen = 'menu' | 'intro' | 'game' | 'gameover';
export type Tone = 'info' | 'good' | 'bad';

// ─── Поля разработки ───
export type FieldId =
  | 'architecture'
  | 'dataSources'
  | 'task'
  | 'dataset'
  | 'hyperparams'
  | 'augmentation'
  | 'loss'
  | 'alignment'
  | 'inference'
  | 'interface';

/** 0–2 — фазы разработки, 3 — стабилизация */
export type Phase = 0 | 1 | 2 | 3;

export interface FieldDef {
  id: FieldId;
  name: string;
  phase: 0 | 1 | 2;
  hint: string;
  /** вес поля при оценке баланса */
  weight: number;
}

// ─── Контент ───
export type Fit = 'ideal' | 'ok' | 'weird';
export type DomainGroup = 'vision' | 'language' | 'speech' | 'generative' | 'tabular' | 'science' | 'embodied' | 'creative';

export interface Domain {
  id: string;
  name: string;
  icon: string;
  group: DomainGroup;
  desc: string;
  research: string | null;
  year: number;
  /** сдвиг идеальной доли исследований по полям (−0.4…0.4) */
  bias: Record<FieldId, number>;
  /** парадигмы: идеальная и странная совместимость, остальное — норм */
  ideal: string[];
  weird: string[];
  /** приставка для генератора названий моделей */
  prefix: string;
}

export interface Paradigm {
  id: string;
  name: string;
  icon: string;
  desc: string;
  research: string | null;
  year: number;
  bias: Record<FieldId, number>;
}

export type ScaleId = 'pet' | 'product' | 'flagship';

export interface Scale {
  id: ScaleId;
  name: string;
  desc: string;
  /** недели на фазы 1–3 */
  weeks: [number, number, number];
  /** ожидаемые рынком очки в 2012 году */
  expected: number;
  research: string | null;
}

export interface Platform {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** разовая плата за лицензию */
  license: number;
  /** доля выручки, которая остаётся лаборатории */
  share: number;
  year: number;
  research: string | null;
  /** кривая install base: ключевые точки (год, охват 0–100) */
  curve: { year: number; reach: number }[];
}

export interface Gpu {
  id: string;
  name: string;
  vendor: string;
  year: number;
  license: number;
  /** множитель очков */
  compute: number;
  /** стоимость GPU-часов за неделю обучения (для масштаба «продукт») */
  weeklyCost: number;
  desc: string;
}

export type Severity = 'low' | 'mid' | 'high';
export type DegTag = 'data' | 'training' | 'safety' | 'serving' | 'product';

export interface DegradationType {
  id: string;
  name: string;
  desc: string;
  tag: DegTag;
  /** сродство к полям: откуда чаще всего вылезает */
  fields: Partial<Record<FieldId, number>>;
}

export interface Degradation {
  id: number;
  type: string;
  severity: Severity;
  /** 0…1 — доля исправленного */
  fixed: number;
}

export type QuoteBand = 'awful' | 'weak' | 'decent' | 'good' | 'great';
export type Complaint = 'balance' | 'bugs' | 'points' | 'novelty';

export interface Agency {
  id: string;
  name: string;
  short: string;
  desc: string;
  color: string;
  /** веса аспектов при выставлении оценки (сумма = 1) */
  weights: { quality: number; points: number; balance: number; bugs: number; novelty: number };
  /** систематическая строгость: минус — строже */
  tolerance: number;
  quotes: Record<QuoteBand, string[]>;
  complaints: Record<Complaint, string>;
}

// ─── Команда ───
export type RoleId = 'founder' | 'researcher' | 'ml_engineer' | 'data_engineer' | 'mlops';
export type LevelId = 'junior' | 'middle' | 'senior' | 'principal';

export interface Staff {
  id: string;
  name: string;
  role: RoleId;
  level: LevelId;
  research: number;
  engineering: number;
  speed: number;
  /** зарплата в неделю */
  salary: number;
  /** 0–100 */
  burnout: number;
  /** 0–100: доля исследований в личном фокусе */
  focus: number;
  onProject: boolean;
  founder: boolean;
  vacationWeeks: number;
  training: { courseId: string; weeksLeft: number } | null;
  /** индекс клетки стола в офисе */
  desk: number | null;
  hiredWeek: number;
  burnouts: number;
  color: string;
}

export interface Candidate {
  id: string;
  name: string;
  role: RoleId;
  level: LevelId;
  research: number;
  engineering: number;
  speed: number;
  salary: number;
  color: string;
}

// ─── Проект ───
export type ProjectKind = 'model' | 'expansion' | 'framework';
export type ExpansionType = 'v2' | 'xl' | 'mini' | 'finetune';

export interface Project {
  id: number;
  kind: ProjectKind;
  name: string;
  domain: string;
  paradigm: string;
  platform: string;
  scale: ScaleId;
  gpu: string;
  phase: Phase;
  weekInPhase: number;
  weeksPerPhase: [number, number, number];
  /** 0–100: доля исследований в поле */
  sliders: Record<FieldId, number>;
  fields: Record<FieldId, { research: number; engineering: number }>;
  degradations: Degradation[];
  nextDegradationId: number;
  contractId: number | null;
  startedWeek: number;
  /** потрачено на GPU-часы */
  spent: number;
  /** очки, набранные за последнюю неделю (для интерфейса) */
  lastPoints: number;
  /** для версий моделей */
  baseModelId: number | null;
  expansion: ExpansionType | null;
  /** для проекта фреймворка: фичи новой версии */
  features: string[];
}

// ─── Релиз ───
export interface Review {
  agency: string;
  score: number;
  quote: string;
}

export interface QualityReport {
  points: number;
  expected: number;
  ratio: number;
  pointsScore: number;
  deviation: number;
  balanceFactor: number;
  fit: Fit;
  fitFactor: number;
  noveltyUses: number;
  noveltyFactor: number;
  hypeFactor: number;
  trendFactor: number;
  degradationPenalty: number;
  quality: number;
}

export interface ModelVersion {
  type: ExpansionType;
  name: string;
  rating: number;
  week: number;
}

export interface SalesWave {
  startWeek: number;
  potential: number;
}

export interface ReleasedModel {
  id: number;
  name: string;
  domain: string;
  paradigm: string;
  platform: string;
  scale: ScaleId;
  releasedWeek: number;
  rating: number;
  quality: number;
  reviews: Review[];
  report: QualityReport;
  waves: SalesWave[];
  /** выручка по неделям с момента релиза */
  weekly: number[];
  totalRevenue: number;
  lastRevenue: number;
  fansGained: number;
  versions: ModelVersion[];
  baseId: number | null;
  versionType: ExpansionType | null;
}

// ─── Лаборатория ───
export type ResearchKind = 'paradigm' | 'domain' | 'framework' | 'office' | 'course' | 'scale' | 'team' | 'marketing' | 'contract' | 'special';

export interface ResearchEffects {
  paradigms?: string[];
  domains?: string[];
  features?: string[];
  courses?: string[];
  offices?: string[];
  modules?: string[];
  scales?: string[];
  campaigns?: string[];
  boosts?: string[];
  /** аддитивные бонусы к множителям, например speed: 0.1 → +10 % */
  speed?: number;
  quality?: number;
  rp?: number;
  bugReduce?: number;
  bugTags?: Partial<Record<DegTag, number>>;
  fixRate?: number;
  burnout?: number;
  gpuCost?: number;
  revenue?: number;
  maxContracts?: number;
  /** 0 — скрыто, 1 — подсказки для фазы 1, 2 — для всех фаз */
  revealBalance?: number;
  revealFit?: boolean;
}

export interface ResearchNode {
  id: string;
  name: string;
  desc: string;
  icon: string;
  kind: ResearchKind;
  tier: number;
  row: number;
  cost: number;
  requires: string[];
  year: number;
  weeks: number;
  effects: ResearchEffects;
}

// ─── Фреймворк ───
export interface FeatureAffinity {
  domains?: string[];
  groups?: DomainGroup[];
  paradigms?: string[];
}

export interface Feature {
  id: string;
  name: string;
  icon: string;
  desc: string;
  research: string;
  weeks: number;
  cost: number;
  speed?: number;
  quality?: number;
  bugReduce?: number;
  bugTags?: Partial<Record<DegTag, number>>;
  gpuCost?: number;
  rp?: number;
  platforms?: string[];
  affinity?: FeatureAffinity;
  /** нужна для соответствующих типов версий моделей */
  expansion?: ExpansionType;
}

// ─── Рынок ───
export interface ContractTemplate {
  id: string;
  client: string;
  title: string;
  text: string;
  domain: string;
  paradigm: string | null;
  platform: string | null;
  scale: ScaleId | null;
  /** недель на выполнение */
  weeks: number;
  pay: number;
  penalty: number;
  minRating: number;
}

export interface ContractOffer {
  uid: number;
  templateId: string;
  client: string;
  title: string;
  text: string;
  domain: string;
  paradigm: string | null;
  platform: string | null;
  scale: ScaleId | null;
  weeks: number;
  pay: number;
  penalty: number;
  minRating: number;
  offeredWeek: number;
  expiresWeek: number;
}

export interface ActiveContract extends ContractOffer {
  takenWeek: number;
  deadlineWeek: number;
}

export interface InvestorOffer {
  id: number;
  investor: string;
  desc: string;
  amount: number;
  share: number;
  weeks: number;
  expiresWeek: number;
}

export interface InvestorDeal {
  investor: string;
  amount: number;
  share: number;
  startWeek: number;
  endWeek: number;
  paid: number;
}

export interface GrantOffer {
  id: number;
  fund: string;
  title: string;
  desc: string;
  amount: number;
  domain: string | null;
  minRating: number;
  weeks: number;
  expiresWeek: number;
}

export interface ActiveGrant {
  id: number;
  fund: string;
  title: string;
  amount: number;
  domain: string | null;
  minRating: number;
  takenWeek: number;
  deadlineWeek: number;
  status: 'open' | 'done' | 'failed';
}

export interface CampaignDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  weeks: number;
  hype: number;
  fans: number;
  rp: number;
  research: string | null;
  minFans: number;
}

export interface ActiveCampaign {
  id: string;
  startedWeek: number;
  endsWeek: number;
}

export interface BoostDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  weeks: number;
  research: string | null;
  speed?: number;
  rp?: number;
  points?: number;
  burnout?: number;
  burnoutRate?: number;
  gpuCost?: number;
  /** разовое действие */
  instant?: 'fix' | 'rp' | 'candidates';
  instantValue?: number;
}

export interface ActiveBoost {
  id: string;
  endsWeek: number;
}

export interface CourseDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  weeks: number;
  research?: number;
  engineering?: number;
  speed?: number;
  maxLevel?: LevelId;
}

export interface Loan {
  id: number;
  balance: number;
  rate: number;
  takenWeek: number;
}

// ─── Офис ───
export interface OfficeModuleDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  upkeep: number;
  research: string;
  max: number;
  minOffice: number;
  effect: { speed?: number; research?: number; engineering?: number; burnout?: number; rp?: number };
}

export interface OfficeObject {
  uid: number;
  id: string;
  tile: number;
}

// ─── События ───
export type EventCategory = 'research' | 'market' | 'platform' | 'gpu' | 'regulation' | 'industry' | 'hype';

export type EventEffect =
  | { type: 'unlock'; paradigms?: string[]; platforms?: string[]; gpus?: string[] }
  | { type: 'discount'; research: string[]; mult: number }
  | { type: 'trend'; domain: string; mult: number; weeks: number }
  | { type: 'market'; mult: number; weeks: number }
  | { type: 'rp'; amount: number }
  | { type: 'fans'; amount: number }
  | { type: 'gpuCost'; mult: number }
  | { type: 'revenue'; mult: number }
  | { type: 'compliance'; amount: number; domains: string[] };

export interface GameEvent {
  id: string;
  week: number;
  category: EventCategory;
  title: string;
  text: string;
  effects: EventEffect[];
}

export interface Trend {
  id: string;
  domain: string;
  mult: number;
  untilWeek: number;
  label: string;
}

export interface MarketMod {
  id: string;
  mult: number;
  untilWeek: number | null;
  label: string;
}

// ─── Конкуренты ───
export interface Lab {
  id: string;
  name: string;
  color: string;
  /** сила: сдвиг оценки */
  bias: number;
  domains: string[];
}

export interface CompetitorModel {
  id: number;
  name: string;
  lab: string;
  domain: string;
  rating: number;
  week: number;
  lastRevenue: number;
}

// ─── Журналы ───
export interface NewsItem {
  id: number;
  week: number;
  category: EventCategory;
  title: string;
  text: string;
  effects: string[];
}

export interface InboxItem {
  id: number;
  week: number;
  title: string;
  text: string;
  tone: Tone;
}

export interface FinancePoint {
  week: number;
  income: number;
  expenses: number;
  hype: number;
  fans: number;
}

export interface ComboMemory {
  times: number;
  fit: Fit;
  bestRating: number;
}

export interface Stats {
  releases: number;
  totalRevenue: number;
  totalExpenses: number;
  bestRating: number;
  bestModel: string;
  contractsDone: number;
  contractsFailed: number;
  hired: number;
  quit: number;
  researchDone: number;
  campaigns: number;
  frameworksBuilt: number;
  versionsMade: number;
  peakFans: number;
  peakMoney: number;
  worstWeeklyLoss: number;
  lowRatedReleases: number;
  perfectReleases: number;
  lowRatedWeeks: number;
}

// ─── Состояние ───
export interface GameState {
  seed: number;
  rng: number;
  companyName: string;
  founderName: string;
  accent: string;
  week: number;
  speed: Speed;
  money: number;
  fans: number;
  hype: number;
  rp: number;
  office: string;
  staff: Staff[];
  candidates: Candidate[];
  candidateRefreshIn: number;
  nextStaffId: number;
  project: Project | null;
  nextProjectId: number;
  models: ReleasedModel[];
  nextModelId: number;
  research: { done: string[]; current: string | null; progress: number; discounts: string[] };
  framework: { version: number; name: string; features: string[] };
  platforms: string[];
  gpus: string[];
  gpu: string;
  campaign: ActiveCampaign | null;
  campaignsDone: string[];
  contracts: { offers: ContractOffer[]; active: ActiveContract[]; nextUid: number; offerCooldown: number };
  investorOffer: InvestorOffer | null;
  investor: InvestorDeal | null;
  investorCooldown: number;
  grantOffers: GrantOffer[];
  grants: ActiveGrant[];
  nextDealId: number;
  loans: Loan[];
  nextLoanId: number;
  boosts: ActiveBoost[];
  objects: OfficeObject[];
  nextObjectUid: number;
  trends: Trend[];
  marketMods: MarketMod[];
  seenEvents: string[];
  gpuCostMult: number;
  revenueMult: number;
  compliance: { amount: number; domains: string[] }[];
  labs: Lab[];
  competitors: CompetitorModel[];
  nextCompetitorId: number;
  news: NewsItem[];
  inbox: InboxItem[];
  nextNewsId: number;
  finance: FinancePoint[];
  comboMemory: Record<string, ComboMemory>;
  achievements: string[];
  stats: Stats;
  insolvency: number;
  gameover: { reason: string; week: number } | null;
  tutorial: { active: boolean; step: number };
}

// ─── Результаты шага симуляции ───
export type SimEvent =
  | { type: 'toast'; text: string; tone: Tone }
  | { type: 'news'; newsId: number }
  | { type: 'release'; modelId: number }
  | { type: 'insolvency'; weeksLeft: number }
  | { type: 'achievement'; id: string }
  | { type: 'gameover' };

export interface SimResult {
  state: GameState;
  events: SimEvent[];
}

// ─── Интерфейс (не сохраняется) ───
export type Modal =
  | { kind: 'news'; newsId: number }
  | { kind: 'release'; modelId: number }
  | { kind: 'insolvency'; weeksLeft: number }
  | { kind: 'achievement'; id: string }
  | { kind: 'save' }
  | { kind: 'confirm'; title: string; text: string; confirmLabel: string; danger?: boolean; onConfirm: () => void };

export interface Toast {
  id: number;
  text: string;
  tone: Tone;
}
