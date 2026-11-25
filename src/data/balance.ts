// Все числа баланса игры собраны здесь. Логика в src/sim/* только читает их.
export const BALANCE = {
  time: {
    /** реальных миллисекунд на игровую неделю на скорости 1× */
    weekMs: 2400,
    intervalMs: 100,
    /** максимум недель за один шаг движка — защита от скачка после сворачивания вкладки */
    maxTicksPerStep: 3,
  },
  start: {
    money: 70000,
  },
  growth: {
    /** рынок: охват платформ, вес хайпа и цитирований */
    market: 1.16,
    /** зарплаты кандидатов */
    salary: 1.08,
    /** кампании, курсы, бусты, лицензии */
    cost: 1.05,
    /** ожидания рынка по очкам качества */
    expectations: 1.19,
  },
  team: {
    /** доля стата, работающая независимо от фокуса сотрудника */
    focusBase: 0.35,
    speedFloor: 0.6,
    speedRange: 0.8,
    powerDivisor: 3,
    /** усиление пула при совпадении фокуса команды и слайдера */
    compositionBoost: 2,
    compositionCap: 1.5,
    statCap: 100,
    /** особенности ролей (n — сколько таких сотрудников в команде проекта) */
    roles: {
      /** ресечер: во столько раз больше исследовательских очков */
      researcherRp: 1.5,
      /** дата-инженер: −roleData за каждого к деградациям с данными, не ниже roleDataCap */
      dataBug: 0.08,
      dataBugCap: 0.32,
      /** MLOps: −roleGpu к цене GPU-часов и +roleSpeed к скорости за каждого */
      gpuCost: 0.06,
      gpuCostCap: 0.25,
      speed: 0.04,
      speedCap: 0.16,
      /** ML-инженер: +roleFix к скорости исправления за каждого */
      fix: 0.08,
      fixCap: 0.32,
    },
    burnoutFrom: 40,
    burnoutPenalty: 0.5,
    burnoutPerWeek: 1.6,
    burnoutIdleRecover: 3,
    highBurnout: 85,
    quitChance: 0.04,
    forcedVacationWeeks: 3,
    vacationWeeks: 4,
    severanceWeeks: 4,
    candidateCount: 4,
    candidateRefresh: 8,
    jobPostCost: 2000,
    /** исследовательских очков за неделю: research × rpPerResearch × (на проекте ? rpOnProject : 1) */
    rpPerResearch: 0.06,
    rpOnProject: 0.5,
  },
  project: {
    /** суммарные очки за неделю = pointsPerWeek × мощность команды × GPU × фреймворк */
    pointsPerWeek: 10,
    /** ожидаемые новые деградации за неделю при качестве «вровень с рынком» */
    degradationRate: 0.3,
    severityPoints: { low: 1, mid: 2, high: 3.5 },
    severityShare: [0.5, 0.35, 0.15],
    /** очки исправления за неделю = fixBase + fixPerPower × мощность / fixReferencePower */
    fixBase: 1,
    fixPerPower: 0.2,
    fixReferencePower: 11.25,
    stabilizationGpuShare: 0.3,
    /** прибавка к качеству от функции фреймворка, предназначенной для платформы проекта */
    platformFeatureBonus: 0.05,
    scaleGpuShare: { pet: 0.4, product: 1, flagship: 2.5 },
  },
  quality: {
    /** pointsScore = 10 × (1 − e^(−pointCurve × ratio)); ratio 1 → 7.4, ratio 2 → 9.3 */
    pointCurve: 1.35,
    /** идеальная доля исследований в поле = shareBase + сдвиги домена и парадигмы, в границах shareMin…shareMax */
    shareBase: 0.5,
    shareMin: 0.12,
    shareMax: 0.88,
    /** доля оценки, теряемая при среднем отклонении balanceScale; при меньшем отклонении штраф пропорционален */
    balancePenalty: 0.45,
    balanceScale: 0.5,
    fit: { ideal: 1, ok: 0.85, weird: 0.68 },
    /** множитель новизны по числу прошлых релизов с той же парой домен×парадигма */
    novelty: [1.12, 1.06, 1, 1, 0.96, 0.96, 0.92],
    hypeEffect: 0.06,
    trendEffect: 0.05,
    degradationPenalty: { low: 0.15, mid: 0.35, high: 0.7 },
    degradationPenaltyCap: 3,
  },
  reviews: {
    /** среднеквадратичный разброс оценки агентства */
    noise: 0.55,
    min: 1,
    max: 10,
  },
  sales: {
    /** форма кривой продаж: (t+1)^shapeA × e^(−shapeB×t), пик на 2–3-й неделе */
    shapeA: 1.6,
    shapeB: 0.45,
    reachMoney: 1600,
    fanMoney: 120,
    hypeMoney: 500,
    ratingFloor: 1.5,
    ratingSpan: 8.5,
    ratingPower: 2.6,
    ratingMinFactor: 0.02,
    /** сколько недель модель приносит выручку */
    activeWeeks: 78,
  },
  fans: {
    perRatingPoint: 30,
    ratingBase: 3.5,
    perHype: 0.3,
    weeklyDecay: 0.006,
    decayAfterWeeks: 26,
  },
  hype: {
    base: 10,
    decayPerWeek: 3,
    afterRelease: 0.2,
  },
  finance: {
    /** недель подряд с отрицательным балансом до банкротства */
    insolvencyLimit: 3,
    loanMaxBase: 150000,
    loanMaxPerFan: 40,
    loanRateWeekly: 0.004,
    investorShare: 0.3,
    investorWeeks: 104,
  },
  office: {
    /** доля текущей цены, которую возвращают при продаже объекта */
    sellShare: 0.5,
    /** во сколько раз объекты могут замедлить выгорание — не медленнее */
    burnoutFloor: 0.2,
  },
  market: {
    /** шанс нового предложения контракта за неделю */
    contractOfferChance: 0.35,
    contractOfferMax: 4,
    contractOfferWeeks: 10,
    contractBaseMult: 14,
    contractPenaltyShare: 0.35,
    investorEveryWeeks: 40,
    grantEveryWeeks: 26,
    grantMaxActive: 2,
    /** показатель степени, с которым растут цены контрактов и грантов (1 — как рынок) */
    dealGrowthExp: 0.8,
    /** множитель доли инвестора к его предложению */
    investorMin: 40000,
    investorWeeksOfRevenue: 78,
    grantMin: 25000,
    /** средний интервал между релизами одной лаборатории-конкурента, недель */
    labReleaseEvery: 30,
    labRatingNoise: 0.7,
    leaderboardWeeks: 104,
    chartSize: 10,
    newsLimit: 300,
    financeHistory: 260,
  },
} as const;

export type Balance = typeof BALANCE;
