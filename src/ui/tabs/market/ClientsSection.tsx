import type { ReactNode } from 'react';
import type { ActiveContract, ContractOffer, GameState } from '../../../types';
import { domainById } from '../../../data/domains';
import { paradigmById } from '../../../data/paradigms';
import { platformById } from '../../../data/platforms';
import { scaleById } from '../../../data/compat';
import { investorOpen, grantOpen } from '../../../sim/contracts';
import { maxContracts } from '../../../sim/perks';
import { useGame } from '../../../store/useGame';
import { Btn, Card, Chip, DefList, IconBox, Notice, SectionTitle, cn } from '../../primitives';
import { useRun } from '../../useRun';
import { fmt1, fmtCount, fmtMoney } from '../../format';

const WEEKS = ['неделю', 'недели', 'недель'] as const;

/** требования заказа: что именно нужно выпустить */
function Requirements({ item }: { item: Pick<ContractOffer, 'domain' | 'paradigm' | 'platform' | 'scale' | 'minRating'> }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <Chip icon={domainById(item.domain).icon}>{domainById(item.domain).name}</Chip>
      {item.paradigm && <Chip icon={paradigmById(item.paradigm).icon}>{paradigmById(item.paradigm).name}</Chip>}
      {item.platform && <Chip icon="cloud">{platformById(item.platform).name}</Chip>}
      {item.scale && <Chip icon="trend">{scaleById(item.scale).name}</Chip>}
      <Chip tone="accent">оценка от {fmt1(item.minRating)}</Chip>
    </div>
  );
}

/** карточка заказа: предложение или заказ в работе; left — сколько недель осталось */
function DealCard({ item, active, left, action }: { item: ContractOffer; active: boolean; left: number; action?: ReactNode }) {
  const leftWeeks = Math.max(0, left);
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <IconBox icon="briefcase" tone={active ? 'accent' : 'muted'} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] leading-snug font-semibold">{item.title}</div>
          <div className="text-xs text-muted">{item.client}</div>
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
      <Requirements item={item} />
      <div className="num mt-2 grid grid-cols-3 gap-2 text-xs text-muted">
        <div>
          Оплата
          <div className="text-sm font-semibold text-good">{fmtMoney(item.pay)}</div>
        </div>
        <div>
          Неустойка
          <div className="text-sm font-semibold text-bad">{fmtMoney(item.penalty)}</div>
        </div>
        <div>
          {active ? 'Осталось' : 'Действует'}
          <div className={cn('text-sm font-semibold', active && leftWeeks <= 3 ? 'text-warn' : 'text-text')}>{fmtCount(leftWeeks, WEEKS)}</div>
        </div>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}

function InvestorCard({ game, offer, onAccept, onReject }: { game: GameState; offer: NonNullable<GameState['investorOffer']>; onAccept: () => void; onReject: () => void }) {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <IconBox icon="hand" tone="good" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">{offer.investor}</div>
          <div className="text-xs text-muted">{offer.desc}</div>
        </div>
      </div>
      <DefList
        className="mt-2"
        rows={[
          ['Деньги сразу', fmtMoney(offer.amount)],
          ['Доля выручки', `${Math.round(offer.share * 100)}%`],
          ['Срок доли', fmtCount(offer.weeks, WEEKS)],
          ['Предложение действует', fmtCount(Math.max(0, offer.expiresWeek - game.week), WEEKS)],
        ]}
      />
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Btn className="col-span-2" variant="primary" icon="hand" onClick={onAccept}>
          Принять деньги
        </Btn>
        <Btn onClick={onReject}>Отклонить</Btn>
      </div>
    </Card>
  );
}

interface GrantLike {
  title: string;
  fund: string;
  amount: number;
  desc?: string;
  domain: string | null;
  minRating: number;
}

/** карточка гранта: предложение или взятый грант; left — недель до конца срока */
function GrantCard({ grant, active, left, action }: { grant: GrantLike; active: boolean; left: number; action?: ReactNode }) {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <IconBox icon="gift" tone="good" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] leading-snug font-semibold">{grant.title}</div>
          <div className="text-xs text-muted">{grant.fund}</div>
        </div>
      </div>
      {grant.desc && <p className="mt-2 text-sm leading-relaxed text-muted">{grant.desc}</p>}
      <DefList
        className="mt-2"
        rows={[
          ['Выплата', fmtMoney(grant.amount)],
          ['Условие', `${grant.domain ? domainById(grant.domain).name : 'любой домен'} · оценка от ${fmt1(grant.minRating)}`],
          [active ? 'Выпустить за' : 'Срок после принятия', fmtCount(Math.max(0, left), WEEKS)],
        ]}
      />
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}

/** заказы клиентов, инвесторы и гранты */
export function ClientsSection() {
  const game = useGame((s) => s.game);
  const takeContract = useGame((s) => s.takeContract);
  const dropContract = useGame((s) => s.dropContract);
  const acceptInvestor = useGame((s) => s.acceptInvestor);
  const rejectInvestor = useGame((s) => s.rejectInvestor);
  const acceptGrant = useGame((s) => s.acceptGrant);
  const openModal = useGame((s) => s.openModal);
  const toast = useGame((s) => s.toast);
  const run = useRun();
  if (!game) return null;

  const active = game.contracts.active;
  const offers = game.contracts.offers;
  const limit = maxContracts(game);
  const full = active.length >= limit;
  const openGrants = game.grants.filter((g) => g.status === 'open');
  const maxOpenGrants = openGrants.length >= 2;
  const dealsOpen = investorOpen(game) || grantOpen(game);

  const refuse = (contract: ActiveContract) =>
    openModal({
      kind: 'confirm',
      title: 'Отказаться от заказа',
      text: `Клиент получит неустойку ${fmtMoney(contract.penalty)}.`,
      confirmLabel: 'Отказаться',
      danger: true,
      onConfirm: () => run(() => dropContract(contract.uid), `Заказ «${contract.title}» отменён`),
    });

  return (
    <div>
      {active.length > 0 && (
        <>
          <SectionTitle
            action={
              <span className="num text-xs text-muted">
                {active.length} из {limit}
              </span>
            }
          >
            В работе
          </SectionTitle>
          <div className="flex flex-col gap-2">
            {active.map((contract) => (
              <DealCard
                key={contract.uid}
                item={contract}
                active
                left={contract.deadlineWeek - game.week}
                action={
                  game.project?.contractId === contract.uid ? (
                    <Notice tone="info" icon="wrench">
                      Модель под этот заказ уже в разработке.
                    </Notice>
                  ) : (
                    <Btn variant="ghost" icon="close" className="text-bad" onClick={() => refuse(contract)}>
                      Отказаться · неустойка {fmtMoney(contract.penalty)}
                    </Btn>
                  )
                }
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Выберите заказ при создании модели — он будет оплачен после релиза, если оценка достаточно высока.</p>
        </>
      )}

      <SectionTitle>Предложения клиентов</SectionTitle>
      {offers.length === 0 ? (
        <Card className="p-3 text-sm text-muted">Новых заказов нет. Предложения приходят сами каждые несколько недель.</Card>
      ) : (
        <div className="flex flex-col gap-2">
          {offers.map((offer) => (
            <DealCard
              key={offer.uid}
              item={offer}
              active={false}
              left={offer.expiresWeek - game.week}
              action={
                <Btn variant="primary" full icon="briefcase" disabled={full} onClick={() => run(() => takeContract(offer.uid), `Заказ «${offer.title}» взят в работу`)}>
                  {full ? 'Лимит заказов достигнут' : 'Взять заказ'}
                </Btn>
              }
            />
          ))}
        </div>
      )}

      {dealsOpen && (
        <>
          <SectionTitle>Инвестор</SectionTitle>
          {game.investor && (
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <IconBox icon="hand" tone="good" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{game.investor.investor}</div>
                  <div className="num text-xs text-muted">
                    доля {Math.round(game.investor.share * 100)}% выручки · уже выплачено {fmtMoney(game.investor.paid)}
                  </div>
                </div>
              </div>
              <p className="num mt-2 text-sm text-muted">
                Инвестор внёс {fmtMoney(game.investor.amount)}. Доля закончится через {fmtCount(Math.max(0, game.investor.endWeek - game.week), WEEKS)}.
              </p>
            </Card>
          )}
          {!game.investor && game.investorOffer && (
            <InvestorCard
              game={game}
              offer={game.investorOffer}
              onAccept={() => run(() => acceptInvestor(), 'Деньги инвестора зачислены')}
              onReject={() => {
                rejectInvestor();
                toast('Предложение инвестора отклонено');
              }}
            />
          )}
          {!game.investor && !game.investorOffer && <p className="text-sm text-muted">Инвестор появится, когда лаборатория кому-нибудь станет интересна.</p>}

          <SectionTitle>Гранты</SectionTitle>
          {openGrants.length > 0 && (
            <div className="mb-2 flex flex-col gap-2">
              {openGrants.map((grant) => (
                <GrantCard key={grant.id} grant={grant} active left={grant.deadlineWeek - game.week} />
              ))}
            </div>
          )}
          {game.grantOffers.length > 0 && (
            <div className="flex flex-col gap-2">
              {game.grantOffers.map((grant) => (
                <GrantCard
                  key={grant.id}
                  grant={grant}
                  active={false}
                  left={grant.weeks}
                  action={
                    <Btn variant="primary" full icon="gift" disabled={maxOpenGrants} onClick={() => run(() => acceptGrant(grant.id), `Грант «${grant.title}» взят`)}>
                      {maxOpenGrants ? 'Уже два гранта в работе' : 'Взять грант'}
                    </Btn>
                  }
                />
              ))}
            </div>
          )}
          {openGrants.length === 0 && game.grantOffers.length === 0 && <p className="text-sm text-muted">Новых грантов нет — предложения приходят примерно раз в полгода.</p>}
        </>
      )}
      {!dealsOpen && (
        <Notice className="mt-4" tone="info" icon="lab">
          Инвесторы и гранты появятся после исследований «Фонд развития» и «Грантовый офис» в лаборатории.
        </Notice>
      )}
    </div>
  );
}
