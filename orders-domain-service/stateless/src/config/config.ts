const convict = require('convict');

export const config = convict({
  tableName: {
    doc: 'The database table where we store orders',
    format: String,
    default: 'tableName',
    env: 'TABLE_NAME',
  },
  eventBus: {
    doc: 'The event bus that we publish events to',
    format: String,
    default: 'eventBus',
    env: 'BUS_NAME',
  },
  region: {
    doc: 'The region the stack is deployed to',
    format: String,
    default: 'eu-west-1',
    env: 'REGION',
  },
  stageName: {
    doc: 'The stage name of the stack being deployed',
    format: String,
    default: 'prod',
    env: 'STAGE',
  },
  apiEndpoint: {
    doc: 'The orders api endpoint',
    format: String,
    default: '',
    env: 'API_ENDPOINT',
  },
}).validate({ allowed: 'strict' });
