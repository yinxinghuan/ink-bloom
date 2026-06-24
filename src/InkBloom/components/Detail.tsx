import type { WallSheet } from '../types';
import { t, sealCount } from '../i18n';
import AuthorChip from './AuthorChip';
import { WaxSeal } from '../assets/icons';

interface Props {
  ws: WallSheet;
  selfId: string;
  accent: string;
  hasSealed: boolean;
  onSeal: () => void;
  onBack: () => void;
}

// scattered, deterministic seal positions on the sheet
const SPOTS = [
  { top: '8%', left: '70%', rot: -8 },
  { top: '74%', left: '12%', rot: 10 },
  { top: '46%', left: '78%', rot: 6 },
  { top: '20%', left: '14%', rot: -14 },
  { top: '82%', left: '64%', rot: -4 },
  { top: '58%', left: '40%', rot: 12 },
  { top: '34%', left: '50%', rot: -10 },
  { top: '64%', left: '82%', rot: 8 },
];

export default function Detail({ ws, selfId, accent, hasSealed, onSeal, onBack }: Props) {
  const n = ws.sealers.length;
  return (
    <div className="ib-detail">
      <header className="ib-wall__bar">
        <button className="ib-iconbtn" onClick={onBack} aria-label={t('back')}>
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className="ib-wall__title">{n > 0 ? sealCount(n) : t('sealed')}</h2>
        <span className="ib-iconbtn ib-iconbtn--ghost" />
      </header>

      <div className="ib-detail__stage">
        <div className="ib-detail__sheet">
          <img src={ws.sheet.imageUrl} alt="" draggable={false} />
          {ws.sealers.slice(0, SPOTS.length).map((s, i) => {
            const mine = s.userId === selfId;
            return (
              <span
                key={s.userId + i}
                className={`ib-stamp${mine ? ' ib-stamp--drop' : ''}`}
                style={{ top: SPOTS[i].top, left: SPOTS[i].left, ['--rot' as any]: `${SPOTS[i].rot}deg` }}
              >
                <WaxSeal style={s.style} size={58} />
              </span>
            );
          })}
        </div>
      </div>

      <div className="ib-detail__meta">
        <div className="ib-detail__by">
          <span className="ib-detail__bylabel">{t('by')}</span>
          <AuthorChip
            userId={ws.authorId}
            name={ws.authorName}
            avatar={ws.authorAvatar}
            self={ws.authorId === selfId}
            selfLabel={t('you')}
            accent={accent}
          />
        </div>

        {ws.sealers.length > 0 && (
          <div className="ib-sealers">
            {ws.sealers.slice(0, 10).map((s, i) => (
              <AuthorChip
                key={s.userId + i}
                userId={s.userId}
                name={s.name}
                avatar={s.avatar}
                self={s.userId === selfId}
                selfLabel={t('you')}
                accent={accent}
              />
            ))}
          </div>
        )}
      </div>

      <div className="ib-detail__cta">
        {hasSealed ? (
          <div className="ib-sealed-tag" style={{ color: accent }}>
            <WaxSeal style={ws.sealers.find(s => s.userId === selfId)?.style ?? 0} size={26} />
            {t('sealed')}
          </div>
        ) : (
          <button className="ib-seal-btn" onClick={onSeal} style={{ background: accent }}>
            {ws.sealers.length === 0 ? t('no_seal_yet') : t('seal_cta')}
          </button>
        )}
      </div>
    </div>
  );
}
