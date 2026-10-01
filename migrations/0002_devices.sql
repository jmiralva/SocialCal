CREATE TABLE devices (
  device_hash TEXT NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (device_hash, event_id)
);

CREATE INDEX devices_participant_id ON devices(participant_id);

ALTER TABLE participants DROP COLUMN token_hash;
