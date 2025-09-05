import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import cors from 'cors';

import RestServer from './RestServer';
import * as services from '.';

const app = express();

app.use(express.json());

app.use(cors());

RestServer.create(services)
  .getRequestHandler()
  .then((handler) => app.use('/v1', handler));

export const handler = serverlessExpress({ app });
