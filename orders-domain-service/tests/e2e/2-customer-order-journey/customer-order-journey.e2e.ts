import {
  createQueueForBus,
  deleteQueue,
  deleteTargetRule,
  generateRandomId,
  hasMessage,
  httpCall,
} from '@packages/aws-async-test-library';

import { config } from '@config/config';

// we ensure that the sqs queue name never clashes with other ephemeral envs
const id = generateRandomId(7);

// set up our constants
const region = config.get('region');
const stageName = config.get('stageName');
const endpoint = config.get('apiEndpoint');
const sharedBusName = `shared-domains-event-bus-${stageName}`;

let queueUrl: string;

const queueName = `${id}-sqs`;
const ruleName = `${sharedBusName}-rule`;
const source = 'com.order.internal';
const detailType = 'OrderCreatedEvent';

//               _____________    _____________    _____________
//               |   Orders  |    |   handler  |   |  Table    |
// --> post http |   (API)   | -->|  (Lambda)  |-->| (DynamoDB)|--|
//               _____________    _____________    _____________  |
//                                                                |
//           ______________________________________________________
//           |
//           V
//  _____________    _____________  _________________
//  |   Stream  |   |   Handler |   |  shared bus   |
//  | (DynamoDB)|-->|  (Lambda) |-->| (EventBridge) |--> Check temp queue ✔️
//  -------------   -------------   -----------------

describe('customer-order-journey', () => {
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
    const payload = {
      quantity: 234,
      price: 4.97,
      productId: 'PROD-E2E',
    };

    const resource = 'orders';
    const method = 'POST';

    // act - call the api endpoint to create a new order and grab the auto generated id
    const { id } = await httpCall(endpoint, resource, method, payload);

    // assert - ensure that the event is on our temp sqs queue
    // note: this is a temp queue to ensure that the function published
    // the event to the shared event bus
    const message = (await hasMessage(
      region,
      queueUrl,
      2,
      20,
      'detail.id',
      id // ensure we only grab our own message from sqs
    )) as string;
    expect(JSON.parse(message)).toMatchObject({
      'detail-type': 'OrderCreatedEvent',
      source: 'com.order.internal',
      detail: {
        quantity: 234,
        price: 4.97,
        productId: 'PROD-E2E',
        id,
      },
    });
  }, 120000);
});
