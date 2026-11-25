import { BALANCE } from '../../../data/balance';
import { CAMPAIGNS } from '../../../data/marketing';
import { campaignById, campaignPrice, campaignsAvailable, campaignWeeksLeft, canCampaign } from '../../../sim/marketing';
import { useGame } from '../../../store/useGame';
import { Icon } from '../../icons';
import { Bar, Btn, Card, IconBox, Notice, SectionTitle } from '../../primitives';
import { useRun } from '../../useRun';
import { fmtCount, fmtMoney } from '../../format';

const WEEKS = ['неделю', 'недели', 'недель'] as const;

/** маркетинг: разгон хайпа кампаниями до релиза */
export function MarketingSection() {
  const game = useGame((s) => s.game);
  const startCampaign = useGame((s) => s.startCampaign);
  const run = useRun();
  if (!game) return null;

  const available = campaignsAvailable(game);
  const locked = CAMPAIGNS.length - available.length;
  const active = game.campaign ? campaignById(game.campaign.id) : undefined;
  const left = campaignWeeksLeft(game);

  return (
    <div>
      <SectionTitle
        action={
          <span className="num text-xs text-muted">
            хайп {Math.round(game.hype)} из 100
          </span>
        }
      >
        Хайп
      </SectionTitle>
      <Card className="p-3">
        <Bar value={game.hype} max={100} color="var(--color-warn)" />
        <p className="mt-2 text-sm text-muted">Хайп слегка повышает оценки и заметно прибавляет продаж. Без кампании он остывает на {BALANCE.hype.decayPerWeek} пункта в неделю.</p>
        {active && left > 0 ? (
          <div className="mt-3 rounded-xl border border-accent/50 bg-accent/10 p-2.5">
            <div className="flex items-center gap-2">
              <Icon name={active.icon} className="h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{active.name}</span>
              <span className="num shrink-0 text-xs text-muted">ещё {fmtCount(left, WEEKS)}</span>
            </div>
            <p className="num mt-1 text-xs text-muted">
              +{active.hype} хайпа и +{active.fans} цитируемости в неделю{active.rp > 0 ? `, +${active.rp} И-очков` : ''}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Сейчас кампании нет: хайп остывает.</p>
        )}
      </Card>

      <SectionTitle
        action={
          <span className="num text-xs text-muted">
            {available.length} из {CAMPAIGNS.length} открыто
          </span>
        }
      >
        Кампании
      </SectionTitle>
      {available.length === 0 ? (
        <Notice tone="info" icon="lock">Кампании открываются исследованиями «Работа с аудиторией» и следующими за ним в лаборатории.</Notice>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {available.map((campaign) => {
            const error = canCampaign(game, campaign.id);
            const fansLock = error && /цитирований/.test(error);
            return (
              <Card key={campaign.id} className="flex flex-col gap-2 p-2.5">
                {/* заголовок под иконкой: рядом с ней длинные названия не помещаются даже в два слова */}
                <div className="flex flex-col items-start gap-2">
                  <IconBox icon={campaign.icon} tone="warn" />
                  <span className="text-[13px] leading-tight font-semibold">{campaign.name}</span>
                </div>
                <p className="text-xs leading-snug text-muted">{campaign.desc}</p>
                <p className="num text-xs text-muted">
                  +{campaign.hype} хайпа в неделю · {fmtCount(campaign.weeks, WEEKS)}
                </p>
                <div className="mt-auto">
                  <Btn
                    full
                    className="min-h-11 px-2 text-sm"
                    variant={game.campaign ? 'secondary' : 'primary'}
                    disabled={error !== null}
                    aria-label={`Запустить кампанию «${campaign.name}»`}
                    onClick={() => run(() => startCampaign(campaign.id), `Кампания «${campaign.name}» запущена`)}
                  >
                    {error ? (fansLock ? error : game.campaign ? 'Кампания уже идёт' : 'Не хватает денег') : fmtMoney(campaignPrice(game, campaign))}
                  </Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {locked > 0 && <p className="mt-2 text-xs text-muted">Ещё {locked} {locked === 1 ? 'кампания' : 'кампаний'} открываются исследованиями.</p>}
    </div>
  );
}
