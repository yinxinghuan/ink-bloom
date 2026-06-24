import type { GuestMessage } from '@shared/social/guestbook';

export interface Sheet {
  id: string;
  imageUrl: string;
  paletteId: string;
  createdAt: number;
}

/** A wax seal one user pressed onto a sheet (stored in the presser's own save). */
export interface SealRecord {
  sheetId: string;
  authorId: string; // telegram_id of the sheet's author ('self' for local-only)
  style: number; // 0..N — which wax-seal glyph
  at: number;
}

export interface InkSave {
  sheets: Sheet[];
  seals: SealRecord[];
  /** Public guestbook notes this user left on sheets (theirs or others').
   *  Lives in the single per-user blob — see @shared/social/guestbook. */
  messages?: GuestMessage[];
}

/** A sheet resolved for the wall, with author identity + aggregated sealers. */
export interface WallSheet {
  sheet: Sheet;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  sealers: Sealer[];
}

export interface Sealer {
  userId: string;
  name?: string;
  avatar?: string;
  style: number;
}
