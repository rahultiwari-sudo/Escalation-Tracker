import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "./connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

console.log("Migration complete. Tables ready at", path.join(dataDir, "escalations.db"));
