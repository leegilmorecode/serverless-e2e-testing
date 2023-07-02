import {
  clearTable,
  createQueueForBus,
  deleteQueue,
  deleteTargetRule,
  generateRandomId,
  hasMessage,
  putItem,
} from '@packages/aws-async-test-library';

import { config } from '@config/config';

// we ensure that the event bus name never clashes with other ephemeral envs
const id = generateRandomId(7);

// set up our constants
const region = config.get('region');
const stageName = config.get('stageName');

const tableName = `orders-internal-domain-table-${stageName}`;
const sharedBusName = `shared-domains-event-bus-${stageName}`;

let queueUrl: string;

const queueName = `${id}-sqs`;
const ruleName = `${sharedBusName}-rule`;
const source = 'com.order.internal';
const detailType = 'OrderCreatedEvent';

//              _____________    _____________   _____________   _________________
//              |   Orders  |    |   stream  |   |  handler  |   |  shared bus   |
// --> put item | (DynamoDB)| -->| (DynamoDB)|-->| (Lambda)  |-->| (EventBridge) | --> Check temp queue ✔️
//              -------------    -------------   -------------   -----------------

describe('orders-table-stream-to-shared-bus', () => {
  beforeEach(async () => {
    await clearTable(region, tableName);
  }, 20000);

  afterEach(async () => {
    await clearTable(region, tableName);
  }, 20000);

  beforeAll(async () => {
    jest.retryTimes(2, { logErrorsBeforeRetry: false });

    // create a temp sqs queue as a target for the shared event bus
    // which we will remove after the tests have ran
    queueUrl = await createQueueForBus(
      sharedBusName,
      queueName,
      region,
      source,
      detailType,
      ruleName
    );
  }, 12000);

  afterAll(async () => {
    // delete the temp queue and the temp target rule
    await deleteTargetRule(region, sharedBusName, ruleName);
    await deleteQueue(region, queueName);
  }, 12000);

  it('should create the event successfully on the shared bus', async () => {
    // arrange
    const id = generateRandomId();
    const order = {
      id,
      created: '2023-07-05T11:09:01.930Z',
      price: 19.66,
      productId: 'PROD-1966',
      quantity: 10,
    };

    // act - put the order directly into the dynamodb table
    await putItem(region, tableName, order);

    // assert - ensure that the event is on our temp sqs queue
    // note: this is a temp queue to ensure that the function published
    // the event to the shared event bus
    const message = (await hasMessage(
      region,
      queueUrl,
      20,
      20,
      'detail.id',
      id // ensure we only grab our own message from sqs
    )) as string;
    expect(JSON.parse(message)).toMatchObject({
      'detail-type': 'OrderCreatedEvent',
      source: 'com.order.internal',
      detail: {
        quantity: 10,
        productId: 'PROD-1966',
        created: '2023-07-05T11:09:01.930Z',
        price: 19.66,
        id,
      },
    });
  }, 60000);
});
