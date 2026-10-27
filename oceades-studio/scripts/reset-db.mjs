// Supprime la base locale : elle sera recréée (avec les données de démonstration) au prochain démarrage.
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.env.OCEADES_DATA_DIR ?? "./data");
for (const f of ["oceades.db", "oceades.db-wal", "oceades.db-shm"]) fs.rmSync(path.join(dir, f), { force: true });
console.log(`Base réinitialisée (${dir}). Redémarrez l'application pour recréer les données de démonstration.`);
