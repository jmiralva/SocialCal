import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Navigate } from '../App';
import { useEvent } from '../hooks/useEvent';
import { api, ApiRequestError } from '../lib/api';
import { computeBest, countByDay } from '../lib/best';
import { createSaver, type SaverStatus } from '../lib/saver';
import { editUrl, eventUrl, readEditKeyFromHash, shareOrCopy } from '../lib/share';
import { clearJustCreated, peekJustCreated } from '../lib/storage';
import { monthGrids, rangeDays, todayLocalISO } from '../../shared/dates';
import type { EventPatch, Participant } from '../../shared/types';
import { TopBar } from '../components/TopBar';
import { EventHeader } from '../components/EventHeader';
import { MarkingBar } from '../components/MarkingBar';
import { Calendar } from '../components/Calendar';
import { BestDays } from '../components/BestDays';
import { NameSheet } from '../components/NameSheet';
import { ReadySheet } from '../components/ReadySheet';
import { EditEventSheet } from '../components/EditEventSheet';
import { Toast } from '../components/Toast';
import { NotFound } from './NotFound';
import { weekStartForLocale } from '../lib/weekStart';

const CANT_EDIT = "This browser can't edit this event. Use your private edit link.";
const OFFLINE = "Couldn't save. Check your connection and try again.";
const COOKIES_BLOCKED = "Cookies are blocked, so this browser can't remember you.";

const isClientError = (e: unknown): e is ApiRequestError => e instanceof ApiRequestError && e.status >= 400 && e.status < 500;
const isAuthError = (e: unknown) => e instanceof ApiRequestError && (e.status === 401 || e.status === 403);
const errorMessage = (e: unknown) => (isClientError(e) ? e.message : OFFLINE);

const WEEK_START = weekStartForLocale();

export function EventPage({ eventId, navigate }: { eventId: string; navigate: Navigate }) {
  const { state, refresh, retry, setData } = useEvent(eventId);
  // Set only on the page right after creating; holds the edit key for the ready sheet until it closes.
  const [justCreatedKey] = useState(() => peekJustCreated(eventId));
  const [viewOnly, setViewOnly] = useState(false);
  const [sheet, setSheet] = useState<null | 'ready' | 'rename' | 'edit'>(() => (justCreatedKey ? 'ready' : null));
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
          setToast("That edit link didn't work for this calendar.");
        } else {
          // Network/5xx: the key was never checked. Leave it in the URL so a reload retries.
          setToast("Couldn't check your edit link. Reload this page to try again.");
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
              setToast(isAuthError(e) ? "This browser can't change these days anymore." : `Couldn't save your days: ${e.message}`);
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

  if (state.status === 'loading') return <div class="center">Loading…</div>;
  if (state.status === 'error') {
    if (state.notFound) return <NotFound navigate={navigate} />;
    return (
      <div class="center">
        <div class="empty">
          <h3>Couldn't load this calendar</h3>
          <p>Check your connection and try again.</p>
          <button type="button" class="btn" onClick={retry}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { event, me } = state.data;
  const today = todayLocalISO();
  const myParticipant = state.data.participants.find((p) => p.id === me?.participantId);
  const participants = state.data.participants.map((p) =>
    myParticipant && p.id === myParticipant.id && localDates ? { ...p, dates: localDates } : p,
  );
  const myDates = new Set(participants.find((p) => p.id === myParticipant?.id)?.dates ?? []);
  const myCount = [...myDates].filter((d) => d >= event.startDate && d <= event.endDate).length;
  const isCreator = me?.isCreator ?? false;
  const shareUrl = eventUrl(event.id);
  const selectableDays = rangeDays(event.startDate, event.endDate).filter((d) => d >= today);

  const share = async () => {
    const result = await shareOrCopy(shareUrl, event.name);
    if (result === 'copied') setToast('Link copied');
    if (result === 'failed') setToast("Couldn't copy the link");
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
      <TopBar onNew={() => navigate('/')} onShare={share} />
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
              onChange={changeDates}
            />
          </section>
        </main>
        <aside class="pane-best">
          <BestDays
            result={computeBest(participants, event.startDate, event.endDate, today)}
            participants={participants}
            meId={myParticipant?.id}
            isCreator={isCreator}
            onShare={share}
            onEditDates={() => setSheet('edit')}
          />
        </aside>
      </div>

      <nav class="tabbar" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'all'} onClick={() => setTab('all')}>
          All days
        </button>
        <button type="button" role="tab" aria-selected={tab === 'best'} onClick={() => setTab('best')}>
          Best days
        </button>
      </nav>

      {saveStatus === 'retrying' && <div class="save-banner">Couldn't save, retrying…</div>}

      {!myParticipant && !viewOnly && !claiming && !cookiesBlocked && sheet === null && (
        <NameSheet
          title={event.name}
          subtitle="What's your name? Then tap the days you're available."
          submitLabel="Continue"
          onSubmit={join}
          secondary={{ label: 'Just look', onClick: () => setViewOnly(true) }}
        />
      )}
      {sheet === 'ready' && justCreatedKey && (
        <ReadySheet shareUrl={shareUrl} editUrl={editUrl(event.id, justCreatedKey)} onClose={closeReady} />
      )}
      {sheet === 'rename' && myParticipant && (
        <NameSheet
          title="Change your name"
          subtitle="This is how you show up to everyone."
          submitLabel="Save"
          initialName={myParticipant.name}
          onSubmit={rename}
          secondary={{ label: 'Cancel', onClick: () => setSheet(null) }}
        />
      )}
      {sheet === 'edit' && isCreator && <EditEventSheet event={event} onSave={saveEvent} onClose={() => setSheet(null)} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
