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

export type EventPayload = { event: EventInfo; participants: Participant[] };

export type EventPatch = { name: string; description: string; startDate: string; endDate: string };

export type CreateEventInput = EventPatch & { creatorName: string };

export type CreateEventResult = { eventId: string; editKey: string; participantId: string; token: string };

export type JoinResult = { participantId: string; token: string };

export type ApiErrorBody = { error: { code: string; message: string } };
