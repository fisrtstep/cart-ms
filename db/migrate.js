import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from './pool.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function migrate(p = pool) {
    await p.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)');
    const applied = new Set((await p.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
        if (applied.has(file)) continue;
        await p.query(fs.readFileSync(path.join(dir, file), 'utf8'));
        await p.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await migrate();
    await pool.end();
    console.log('migrations applied');
}
