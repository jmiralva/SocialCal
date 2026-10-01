import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Navigate } from '../App';
import { useNewBestDays } from '../hooks/useNewBestDays';
import { useEvent } from '../hooks/useEvent';
import { api, ApiRequestError } from '../lib/api';
import { computeBest, countByDay } from '../lib/best';
import { createSaver, type SaverStatus } from '../lib/saver';
import { editUrl, eventUrl, readEditKeyFromHash, shareOrCopy } from '../lib/share';
import { clearJustCreated, peekJustCreated } from '../lib/storage';
import { monthGrids, rangeDays, todayLocalISO } from '../../shared/dates';
import type { EventPatch, EventPayload, Participant } from '../../shared/types';
import { TopBar } from '../components/TopBar';
import { EventHeader } from '../components/EventHeader';
import { MarkingBar } from '../components/MarkingBar';
import { Calendar } from '../components/Calendar';
import { BestDays } from '../components/BestDays';
import { NameSheet } from '../components/NameSheet';
import { ReadySheet } from '../components/ReadySheet';
import { EditEventSheet } from '../components/EditEventSheet';
import { HelpSheet } from '../components/HelpSheet';
import { Toast } from '../components/Toast';
import { NotFound } from './NotFound';
import { weekStartForLocale } from '../lib/weekStart';
import { copy } from '../copy';

const { cantEdit: CANT_EDIT, offline: OFFLINE, cookiesBlocked: COOKIES_BLOCKED } = copy.messages;

const isClientError = (e: unknown): e is ApiRequestError => e instanceof ApiRequestError && e.status >= 400 && e.status < 500;
const isAuthError = (e: unknown) => e instanceof ApiRequestError && (e.status === 401 || e.status === 403);
const errorMessage = (e: unknown) => (isClientError(e) ? e.message : OFFLINE);

const WEEK_START = weekStartForLocale();

// The current person's unsaved dates replace their saved ones, so the calendar and Best days react immediately.
const withLocalDates = (data: EventPayload, localDates: string[] | null) =>
  data.participants.map((p) => (localDates && p.id === data.me?.participantId ? { ...p, dates: localDates } : p));

export function EventPage({ eventId, navigate }: { eventId: string; navigate: Navigate }) {
  const { state, refresh, retry, setData } = useEvent(eventId);
  // Set only on the page right after creating; holds the edit key for the ready sheet until it closes.
  const [justCreatedKey] = useState(() => peekJustCreated(eventId));
  const [viewOnly, setViewOnly] = useState(false);
  const [sheet, setSheet] = useState<null | 'ready' | 'rename' | 'edit' | 'help'>(() => (justCreatedKey ? 'ready' : null));
  const [tab, setTab] = useState<'all' | 'best'>('all');
  const [localDates, setLocalDates] = useState<string[] | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaverStatus>('idle');
  const [toast, setToast] = useState<string | null>(null);
  // Stays true after a network failure, so the reload the toast asks for retries the claim.
  const [claiming, setClaiming] = useState(() => readEditKeyFromHash(location.hash) !== null);
  const [cookiesBlocked, setCookiesBlocked] = useState(false);

  const meId = state.status === 'ready' ? state.data.me?.participantId : undefined;

  // After the server links this browser (create, join, claim), the next GET should know it. If not, cookies are blocked.
  const confirmLinked = async () => {
    const data = await refresh();
    if (data && !data.me) {
      setCookiesBlocked(true);
      setToast(COOKIES_BLOCKED);
    }
  };

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (justCreatedKey) void confirmLinked();
  }, []);

  useEffect(() => {
    const key = readEditKeyFromHash(location.hash);
    if (!key) return;
    api
      .claimCreator(eventId, key)
      .then((r) => {
        history.replaceState(null, '', location.pathname);
        // Set `me` before clearing `claiming`, so the name sheet never shows in between.
        setData((d) => ({ ...d, me: { participantId: r.participantId, isCreator: true } }));
        setClaiming(false);
        void confirmLinked();
      })
      .catch((e) => {
        if (isClientError(e)) {
          history.replaceState(null, '', location.pathname);
          setClaiming(false);
          setToast(copy.messages.editLinkInvalid);
        } else {
          // Network/5xx: the key was never checked. Leave it in the URL so a reload retries.
          setToast(copy.messages.editLinkOffline);
        }
      });
  }, [eventId]);

  // Unsaved dates belong to the previous identity.
  useEffect(() => setLocalDates(null), [meId]);

  const replaceParticipant = (p: Participant) =>
    setData((d) => ({
      ...d,
      event: d.event.creatorParticipantId === p.id ? { ...d.event, creatorName: p.name } : d.event,
      participants: d.participants.map((x) => (x.id === p.id ? p : x)),
    }));

  const saver = useMemo(
    () =>
      createSaver({
        save: async (dates) => {
          if (!meId) return;
          try {
            replaceParticipant(await api.updatePerson(eventId, meId, { dates }));
          } catch (e) {
            // 4xx will never succeed on retry: tell the user and stop. Network/5xx errors rethrow so the saver retries.
            if (isClientError(e)) {
              setToast(isAuthError(e) ? copy.messages.daysLocked : copy.messages.daysFailed(e.message));
              if (isAuthError(e)) void refresh();
              return;
            }
            throw e;
          }
        },
        onStatus: (s) => {
          setSaveStatus(s);
          if (s === 'idle') setLocalDates(null);
        },
      }),
    [eventId, meId],
  );
  useEffect(() => {
    const flushIfHidden = () => {
      if (document.visibilityState === 'hidden') saver.flush();
    };
    document.addEventListener('visibilitychange', flushIfHidden);
    window.addEventListener('pagehide', saver.flush);
    return () => {
      document.removeEventListener('visibilitychange', flushIfHidden);
      window.removeEventListener('pagehide', saver.flush);
      saver.dispose();
    };
  }, [saver]);

  // Before the early returns: the circle hooks below need the best days on every render.
  const ready = state.status === 'ready' ? state.data : null;
  const today = todayLocalISO();
  const participants = ready ? withLocalDates(ready, localDates) : [];
  const best = ready ? computeBest(participants, ready.event.startDate, ready.event.endDate, today) : null;
  const bestList = best?.kind === 'ok' ? best.top.map((s) => s.date) : [];
  const bestKey = bestList.join(',');
  // Keyed on the joined string so the Set stays the same object across polls; don't change the deps to bestList.
  const bestDays = useMemo(() => new Set(bestList), [bestKey]);
  const newBestDays = useNewBestDays(ready ? bestList : null);

  if (state.status === 'loading') return <div class="center">{copy.event.loading}</div>;
  if (state.status === 'error') {
    if (state.notFound) return <NotFound navigate={navigate} />;
    return (
      <div class="center">
        <div class="empty">
          <h3>{copy.messages.loadTitle}</h3>
          <p>{copy.messages.loadBody}</p>
          <button type="button" class="btn" onClick={retry}>
            {copy.messages.retry}
          </button>
        </div>
      </div>
    );
  }

  const { event, me } = state.data;
  const myParticipant = state.data.participants.find((p) => p.id === me?.participantId);
  const myDates = new Set(participants.find((p) => p.id === myParticipant?.id)?.dates ?? []);
  const myCount = [...myDates].filter((d) => d >= event.startDate && d <= event.endDate).length;
  const isCreator = me?.isCreator ?? false;
  const shareUrl = eventUrl(event.id);
  const selectableDays = rangeDays(event.startDate, event.endDate).filter((d) => d >= today);

  const share = async () => {
    const result = await shareOrCopy(shareUrl, event.name);
    if (result === 'copied') setToast(copy.messages.linkCopied);
    if (result === 'failed') setToast(copy.messages.copyFailed);
  };

  const changeDates = (next: Set<string>) => {
    const arr = [...next].sort();
    setLocalDates(arr);
    saver.schedule(arr);
  };

  const join = async (name: string) => {
    try {
      const r = await api.join(eventId, name);
      setData((d) => ({
        ...d,
        me: { participantId: r.participantId, isCreator: false },
        participants: [...d.participants, { id: r.participantId, name, dates: [] }],
      }));
      setViewOnly(false);
      void confirmLinked();
      return null;
    } catch (e) {
      // Another tab joined first: the refreshed `me` hides the sheet.
      if (e instanceof ApiRequestError && e.code === 'already_joined') {
        void refresh();
        return null;
      }
      return errorMessage(e);
    }
  };

  const rename = async (name: string) => {
    if (!myParticipant) return null;
    try {
      replaceParticipant(await api.updatePerson(eventId, myParticipant.id, { name }));
      setSheet(null);
      return null;
    } catch (e) {
      if (isAuthError(e)) void refresh();
      return errorMessage(e);
    }
  };

  const saveEvent = async (patch: EventPatch) => {
    if (!isCreator) return CANT_EDIT;
    try {
      const r = await api.updateEvent(eventId, patch);
      setData((d) => ({ ...d, event: r.event }));
      setSheet(null);
      return null;
    } catch (e) {
      if (isAuthError(e)) {
        void refresh();
        return CANT_EDIT;
      }
      return errorMessage(e);
    }
  };

  const closeReady = () => {
    clearJustCreated(eventId);
    setSheet(null);
  };

  return (
    <div class="page" data-tab={tab}>
      <TopBar onNew={() => navigate('/')} onShare={share} onHelp={() => setSheet('help')} />
      <div class="layout">
        <main class="main">
          <EventHeader event={event} isCreator={isCreator} onEdit={() => setSheet('edit')} />
          <section class="pane-all">
            <MarkingBar
              name={myParticipant?.name}
              count={myCount}
              onChangeName={() => setSheet('rename')}
              onAddDays={() => (cookiesBlocked ? setToast(COOKIES_BLOCKED) : setViewOnly(false))}
            />
            <Calendar
              months={monthGrids(event.startDate, event.endDate, WEEK_START)}
              weekStart={WEEK_START}
              counts={countByDay(participants)}
              total={participants.length}
              mine={myDates}
              selectableDays={selectableDays}
              editable={Boolean(myParticipant) && !claiming}
              bestDays={bestDays}
              newBestDays={newBestDays}
              onChange={changeDates}
            />
          </section>
        </main>
        <aside class="pane-best">
          {/* Non-null: state is ready below the early returns. */}
          <BestDays
            result={best!}
            participants={participants}
            meId={myParticipant?.id}
            isCreator={isCreator}
            onShare={share}
            onEditDates={() => setSheet('edit')}
            newBestDays={newBestDays}
          />
        </aside>
      </div>

      <nav
        class="tabbar"
        role="tablist"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          if (e.altKey || e.ctrlKey || e.metaKey) return; // leave browser shortcuts like Alt+Left (Back) alone
          e.preventDefault();
          const next = tab === 'all' ? 'best' : 'all'; // two tabs: both arrows switch
          setTab(next);
          e.currentTarget.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus();
        }}
      >
        <button type="button" role="tab" data-tab="all" tabIndex={tab === 'all' ? 0 : -1} aria-selected={tab === 'all'} onClick={() => setTab('all')}>
          {copy.event.tabAll}
        </button>
        <button type="button" role="tab" data-tab="best" tabIndex={tab === 'best' ? 0 : -1} aria-selected={tab === 'best'} onClick={() => setTab('best')}>
          {copy.event.tabBest}
        </button>
      </nav>

      {saveStatus === 'retrying' && <div class="save-banner">{copy.event.saveRetrying}</div>}

      {!myParticipant && !viewOnly && !claiming && !cookiesBlocked && sheet === null && (
        <NameSheet
          title={event.name}
          subtitle={copy.join.sub}
          submitLabel={copy.join.submit}
          onSubmit={join}
          secondary={{ label: copy.join.look, onClick: () => setViewOnly(true) }}
          onHelp={() => setSheet('help')}
        />
      )}
      {sheet === 'ready' && justCreatedKey && (
        <ReadySheet shareUrl={shareUrl} editUrl={editUrl(event.id, justCreatedKey)} onClose={closeReady} />
      )}
      {sheet === 'rename' && myParticipant && (
        <NameSheet
          title={copy.rename.title}
          subtitle={copy.rename.sub}
          submitLabel={copy.rename.submit}
          initialName={myParticipant.name}
          onSubmit={rename}
          secondary={{ label: copy.rename.cancel, onClick: () => setSheet(null) }}
        />
      )}
      {sheet === 'edit' && isCreator && <EditEventSheet event={event} onSave={saveEvent} onClose={() => setSheet(null)} />}
      {sheet === 'help' && <HelpSheet onClose={() => setSheet(null)} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
