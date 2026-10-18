// PostgreSQL lokal untuk pengembangan (tanpa Docker): npm run db
// Data disimpan di web/.pgdata. Hentikan dengan Ctrl+C.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const dataDir = "./.pgdata";
const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: "apbd", password: "apbd", port: 5433, persistent: true });

if (!existsSync(dataDir)) {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("apbd");
} else {
  await pg.start();
}
console.log("PostgreSQL berjalan: postgres://apbd:apbd@localhost:5433/apbd  (Ctrl+C untuk berhenti)");

const berhenti = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", berhenti);
process.on("SIGTERM", berhenti);
