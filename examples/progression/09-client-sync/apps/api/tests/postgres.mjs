import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

export async function startPostgres() {
  const db = new PGlite();
  const server = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0 });
  await server.start();
  return {
    db,
    url: 'postgresql://postgres@' + server.getServerConn() + '/postgres',
    async close() {
      await server.stop();
      await db.close();
    },
  };
}
