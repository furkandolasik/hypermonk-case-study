import express from 'express';
import cors from 'cors';

import RestServer from './RestServer';
import * as services from '.';

declare global {
  namespace Express {
    interface Request {
      user: any;
    }
  }
}

const app = express();

app.use(express.json());

app.use(cors());
console.log('CORS enabled');
RestServer.create(services)
  .getRequestHandler()
  .then((handler) => app.use('/v1', handler));

app.listen(3000, () => console.log('Server is running on http://localhost:3000'));
