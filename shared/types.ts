export type EventInfo = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  creatorName: string;
  creatorParticipantId: string;
};

export type Participant = { id: string; name: string; dates: string[] };

export type Me = { participantId: string; isCreator: boolean };

export type EventPayload = { event: EventInfo; participants: Participant[]; me: Me | null };

export type EventPatch = { name: string; description: string; startDate: string; endDate: string };

export type CreateEventInput = EventPatch & { creatorName: string };

export type CreateEventResult = { eventId: string; editKey: string };

export type JoinResult = { participantId: string };

export type ApiErrorBody = { error: { code: string; message: string } };
