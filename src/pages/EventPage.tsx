import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Navigate } from '../App';
import { useEvent } from '../hooks/useEvent';
import { api, ApiRequestError } from '../lib/api';
import { computeBest, countByDay } from '../lib/best';
import { createSaver, type SaverStatus } from '../lib/saver';
import { editUrl, eventUrl, readEditKeyFromHash, shareOrCopy } from '../lib/share';
import { consumeJustCreated, loadIdentity, saveIdentity, type Identity } from '../lib/storage';
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

const CANT_EDIT = "This browser can't edit this event. Use your private edit link.";
const OFFLINE = "Couldn't save. Check your connection and try again.";

const errorMessage = (e: unknown) =>
  e instanceof ApiRequestError && e.status >= 400 && e.status < 500 ? e.message : OFFLINE;

export function EventPage({ eventId, navigate }: { eventId: string; navigate: Navigate }) {
  const { state, refresh, retry, setData } = useEvent(eventId);
  const [identity, setIdentity] = useState<Identity>(() => loadIdentity(eventId));
  const [viewOnly, setViewOnly] = useState(false);
  const [sheet, setSheet] = useState<null | 'ready' | 'rename' | 'edit'>(() => (consumeJustCreated(eventId) ? 'ready' : null));
  const [tab, setTab] = useState<'all' | 'best'>('all');
  const [localDates, setLocalDates] = useState<string[] | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaverStatus>('idle');
  const [toast, setToast] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(() => readEditKeyFromHash(location.hash) !== null);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    const key = readEditKeyFromHash(location.hash);
    if (!key) return;
    history.replaceState(null, '', location.pathname);
    api
      .claimCreator(eventId, key)
      .then((r) => setIdentity(saveIdentity(eventId, { editKey: key, participantId: r.participantId, token: r.token })))
      .catch((e) => {
        if (e instanceof ApiRequestError && e.status >= 400 && e.status < 500) {
          setToast("That edit link didn't work for this calendar.");
        } else {
          // Network/5xx: the key was never checked. Keep it in identity storage so it isn't lost with the URL hash.
          setIdentity(saveIdentity(eventId, { editKey: key }));
          setToast("Couldn't check your edit link. Reload this page to try again.");
        }
      })
      .finally(() => setClaiming(false));
  }, [eventId]);

  const replaceParticipant = (p: Participant) =>
    setData((d) => ({
      event: d.event.creatorParticipantId === p.id ? { ...d.event, creatorName: p.name } : d.event,
      participants: d.participants.map((x) => (x.id === p.id ? p : x)),
    }));

  const saver = useMemo(
    () =>
      createSaver({
        save: async (dates) => {
          if (!identity.participantId || !identity.token) return;
          try {
            replaceParticipant(await api.updatePerson(eventId, identity.participantId, identity.token, { dates }));
          } catch (e) {
            // 4xx will never succeed on retry: tell the user and stop. Network/5xx errors rethrow so the saver retries.
            if (e instanceof ApiRequestError && e.status >= 400 && e.status < 500) {
              setToast(
                e.status === 401 || e.status === 403
                  ? "This browser can't change these days anymore."
                  : `Couldn't save your days: ${e.message}`,
              );
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
    [eventId, identity.participantId, identity.token],
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

  const { event } = state.data;
  const today = todayLocalISO();
  const me = state.data.participants.find((p) => p.id === identity.participantId);
  const participants = state.data.participants.map((p) => (me && p.id === me.id && localDates ? { ...p, dates: localDates } : p));
  const myDates = new Set(participants.find((p) => p.id === me?.id)?.dates ?? []);
  const myCount = [...myDates].filter((d) => d >= event.startDate && d <= event.endDate).length;
  const isCreator = Boolean(identity.editKey);
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
      setIdentity(saveIdentity(eventId, { participantId: r.participantId, token: r.token }));
      setData((d) => ({ ...d, participants: [...d.participants, { id: r.participantId, name, dates: [] }] }));
      setViewOnly(false);
      void refresh();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  };

  const rename = async (name: string) => {
    if (!me || !identity.token) return null;
    try {
      replaceParticipant(await api.updatePerson(eventId, me.id, identity.token, { name }));
      setSheet(null);
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  };

  const saveEvent = async (patch: EventPatch) => {
    if (!identity.editKey) return CANT_EDIT;
    try {
      const r = await api.updateEvent(eventId, identity.editKey, patch);
      setData((d) => ({ ...d, event: r.event }));
      setSheet(null);
      return null;
    } catch (e) {
      if (e instanceof ApiRequestError && (e.status === 401 || e.status === 403)) return CANT_EDIT;
      return errorMessage(e);
    }
  };

  return (
    <div class="page" data-tab={tab}>
      <TopBar onNew={() => navigate('/')} onShare={share} />
      <div class="layout">
        <main class="main">
          <EventHeader event={event} isCreator={isCreator} onEdit={() => setSheet('edit')} />
          <section class="pane-all">
            <MarkingBar name={me?.name} count={myCount} onChangeName={() => setSheet('rename')} onAddDays={() => setViewOnly(false)} />
            <Calendar
              months={monthGrids(event.startDate, event.endDate)}
              counts={countByDay(participants)}
              total={participants.length}
              mine={myDates}
              selectableDays={selectableDays}
              editable={Boolean(me)}
              onChange={changeDates}
            />
          </section>
        </main>
        <aside class="pane-best">
          <BestDays
            result={computeBest(participants, event.startDate, event.endDate, today)}
            participants={participants}
            meId={me?.id}
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

      {!me && !viewOnly && !claiming && sheet === null && (
        <NameSheet
          title={event.name}
          subtitle="What's your name? Then tap the days you're available."
          submitLabel="Continue"
          onSubmit={join}
          secondary={{ label: 'Just look', onClick: () => setViewOnly(true) }}
        />
      )}
      {sheet === 'ready' && identity.editKey && (
        <ReadySheet shareUrl={shareUrl} editUrl={editUrl(event.id, identity.editKey)} onClose={() => setSheet(null)} />
      )}
      {sheet === 'rename' && me && (
        <NameSheet
          title="Change your name"
          subtitle="This is how you show up to everyone."
          submitLabel="Save"
          initialName={me.name}
          onSubmit={rename}
          secondary={{ label: 'Cancel', onClick: () => setSheet(null) }}
        />
      )}
      {sheet === 'edit' && isCreator && <EditEventSheet event={event} onSave={saveEvent} onClose={() => setSheet(null)} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
