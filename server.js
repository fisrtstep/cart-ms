import { createApp } from './app.js';
import dotenv from 'dotenv';
import pool from './db/pool.js';
dotenv.config();

const app = createApp();

const server = app.listen(process.env.MS_PORT, () => {
    console.log(`${process.env.MS_NAME} is running on port ${process.env.MS_PORT}`);
});

function shutdown() {
    console.log('Shutting down...');
    server.close(async () => {
        console.log('Server closed');
        await pool.end();
        console.log('Database connection closed');
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);