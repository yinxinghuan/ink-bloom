import type { WallSheet } from '../types';
import { t, sealCount } from '../i18n';
import AuthorChip from './AuthorChip';

interface Props {
  sheets: WallSheet[];
  loaded: boolean;
  selfId: string;
  accent: string;
  onOpen: (id: string) => void;
  onBack: () => void;
}

export default function Wall({ sheets, loaded, selfId, accent, onOpen, onBack }: Props) {
  return (
    <div className="ib-wall">
      <header className="ib-wall__bar">
        <button className="ib-iconbtn" onClick={onBack} aria-label={t('back')}>
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className="ib-wall__title">{t('line')}</h2>
        <span className="ib-iconbtn ib-iconbtn--ghost" />
      </header>

      <div className="ib-line" />

      <div className="ib-wall__scroll">
        {loaded && sheets.length === 0 && (
          <div className="ib-empty">
            <div className="ib-empty__title">{t('line_empty')}</div>
            <div className="ib-empty__sub">{t('line_empty_sub')}</div>
          </div>
        )}
        <div className="ib-grid">
          {sheets.map(ws => {
            const self = ws.authorId === selfId;
            const n = ws.sealers.length;
            return (
              <div key={ws.sheet.id} className="ib-card" onClick={() => onOpen(ws.sheet.id)}>
                <div className="ib-card__peg" />
                <div className="ib-card__img">
                  <img src={ws.sheet.imageUrl} alt="" draggable={false} />
                  {n > 0 && (
                    <span className="ib-card__seal" style={{ borderColor: accent }}>
                      ✦ {n}
                    </span>
                  )}
                </div>
                <div className="ib-card__foot">
                  <AuthorChip
                    userId={ws.authorId}
                    name={ws.authorName}
                    avatar={ws.authorAvatar}
                    self={self}
                    selfLabel={t('you')}
                    accent={accent}
                  />
                  <span className="ib-card__count">{n > 0 ? sealCount(n) : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
