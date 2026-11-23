import { withDatabase } from '@workspace/db';
import { rtcMember } from '@workspace/db/schema';
import type { AppEnv } from './environment';
export function storeMembers(env: AppEnv['Bindings'], roomId: string, members: string[]) {
  return withDatabase(env.DATABASE_URL, (db) =>
    db.insert(rtcMember).values(members.map((userId) => ({ roomId, userId }))),
  );
}
export function findMember(env: AppEnv['Bindings'], roomId: string, userId: string) {
  return withDatabase(env.DATABASE_URL, (db) =>
    db.query.rtcMember.findFirst({
      where: (row, { and, eq }) => and(eq(row.roomId, roomId), eq(row.userId, userId)),
    }),
  );
}
