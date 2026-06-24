import { openAigramProfile } from '@shared/runtime';

interface Props {
  userId: string;
  name?: string;
  avatar?: string;
  self: boolean;
  selfLabel: string;
  accent?: string;
}

// Cross-user identity chip: avatar + name, tappable → opens that user's Aigram
// profile. Self entries are plain accent text with no profile button.
export default function AuthorChip({
  userId,
  name,
  avatar,
  self,
  selfLabel,
  accent = '#f2c14e',
}: Props) {
  if (self) {
    return <span className="ib-chip ib-chip--self" style={{ color: accent }}>{selfLabel}</span>;
  }
  const label = name || '·';
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <button
      className="ib-chip"
      onClick={e => {
        e.stopPropagation();
        if (userId) openAigramProfile(userId);
      }}
    >
      {avatar ? (
        <img className="ib-chip__av" src={avatar} alt="" draggable={false} />
      ) : (
        <span className="ib-chip__av ib-chip__av--initial">{initial}</span>
      )}
      <span className="ib-chip__name">{label}</span>
    </button>
  );
}
