import { pgTable, text, primaryKey } from 'drizzle-orm/pg-core';
export const rtcMember = pgTable(
  'rtc_member',
  {
    roomId: text('room_id').notNull(),
    userId: text('user_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.userId] })],
);
