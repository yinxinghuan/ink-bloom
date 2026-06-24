// Cross-user drying line. Reads every recent player's saved Ink Bloom data,
// flattens ALL their sheets + ALL their seal records (never [0]), aggregates
// seals onto sheets, resolves avatar+name for authors and sealers, and returns
// a flat WallSheet[]. Follows the social-wall flatten + profile-resolve pattern.

import { useCallback, useEffect, useState } from 'react';
import { callAigramAPI, isInAigram, type AigramResponse } from '@shared/runtime';
import { getGameUuid } from '@shared/runtime/game-id';
import { messagesByTarget, type GuestMessage } from '@shared/social/guestbook';
import type { InkSave, Sealer, WallSheet } from '../types';

interface SaveRow {
  user_id: string;
  time: string;
  resource_data: string;
}
interface Profile {
  name?: string;
  head_url?: string;
}

export interface UseWall {
  sheets: WallSheet[];
  /** Best-effort public notes left on sheets, grouped by sheet id, note
   *  authors carrying resolved profiles. Aggregated in the SAME fetch. */
  messagesByTarget: Map<string, GuestMessage[]>;
  loaded: boolean;
  refresh: () => void;
}

export function useWall(): UseWall {
  const [sheets, setSheets] = useState<WallSheet[]>([]);
  const [msgsByTarget, setMsgsByTarget] = useState<Map<string, GuestMessage[]>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const sessionId = getGameUuid();
    if (!isInAigram || !sessionId) {
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const res = await callAigramAPI<AigramResponse<SaveRow[]>>(
          `/note/aigram/ai/game/get/data/list?session_id=${encodeURIComponent(sessionId)}`,
          'GET',
        );
        const rows = Array.isArray(res?.data) ? res.data : [];

        // 1. flatten every author's full sheet history + every presser's seals
        const sheetMap = new Map<string, WallSheet>();
        const sealsBySheet = new Map<string, { sealerId: string; style: number }[]>();
        for (const row of rows) {
          if (!row.user_id || !row.resource_data) continue;
          let save: InkSave;
          try {
            save = JSON.parse(row.resource_data) as InkSave;
          } catch {
            continue;
          }
          for (const s of save.sheets || []) {
            if (s && s.id && s.imageUrl && !sheetMap.has(s.id)) {
              sheetMap.set(s.id, { sheet: s, authorId: row.user_id, sealers: [] });
            }
          }
          for (const seal of save.seals || []) {
            if (!seal || !seal.sheetId) continue;
            const list = sealsBySheet.get(seal.sheetId) || [];
            list.push({ sealerId: row.user_id, style: seal.style });
            sealsBySheet.set(seal.sheetId, list);
          }
        }

        // 2. attach seals to sheets
        for (const [sheetId, list] of sealsBySheet) {
          const ws = sheetMap.get(sheetId);
          if (!ws) continue;
          ws.sealers = list.map(l => ({ userId: l.sealerId, style: l.style }));
        }

        // 3. newest first, display-cap
        const all = Array.from(sheetMap.values()).sort(
          (a, b) => (b.sheet.createdAt ?? 0) - (a.sheet.createdAt ?? 0),
        );
        const limited = all.slice(0, 36);

        // 3b. public guestbook notes left on sheets (best-effort, SAME read
        //     window — reuse these rows, never a second fetch).
        const notes = messagesByTarget(rows);

        // 4. resolve profiles for every author + sealer + note author surfaced
        const ids = new Set<string>();
        for (const ws of limited) {
          if (ws.authorId) ids.add(ws.authorId);
          for (const s of ws.sealers) if (s.userId) ids.add(s.userId);
        }
        for (const list of notes.values()) {
          for (const m of list) if (m.fromUserId) ids.add(m.fromUserId);
        }
        const profEntries = await Promise.all(
          Array.from(ids).map(async uid => {
            try {
              const r = await callAigramAPI<AigramResponse<Profile>>(
                `/note/telegram/user/get/info/by/telegram_id?telegram_id=${encodeURIComponent(uid)}`,
                'GET',
              );
              return [uid, r?.data ?? null] as const;
            } catch {
              return [uid, null] as const;
            }
          }),
        );
        const profMap = new Map(profEntries);
        const resolved = limited.map(ws => {
          const ap = profMap.get(ws.authorId);
          const sealers: Sealer[] = ws.sealers.map(s => {
            const p = profMap.get(s.userId);
            return { ...s, name: p?.name, avatar: p?.head_url };
          });
          return {
            ...ws,
            authorName: ap?.name,
            authorAvatar: ap?.head_url,
            sealers,
          };
        });

        // stamp note authors with their resolved profile too
        const notesResolved = new Map<string, GuestMessage[]>();
        for (const [target, list] of notes) {
          notesResolved.set(
            target,
            list.map(m => {
              const p = m.fromUserId ? profMap.get(m.fromUserId) || null : null;
              return { ...m, userName: p?.name, userAvatarUrl: p?.head_url };
            }),
          );
        }

        if (!cancelled) {
          setSheets(resolved);
          setMsgsByTarget(notesResolved);
        }
      } catch {
        if (!cancelled) { setSheets([]); setMsgsByTarget(new Map()); }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return { sheets, messagesByTarget: msgsByTarget, loaded, refresh };
}
