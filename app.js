import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();

import cartsRouter from './carts/index.js';

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    app.use('/carts', cartsRouter);

    // eslint-disable-next-line no-unused-vars
    app.use((err, _req, res, _next) => {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    });

    return app;
}
