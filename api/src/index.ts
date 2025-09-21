import './lib/loadEnv.js';

import cors from 'cors';
import express from 'express';
import morgan from 'morgan';

import { storesRouter } from './routes/stores.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/stores', storesRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal_server_error' });
});

const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
