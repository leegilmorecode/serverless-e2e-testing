import {
  createQueueForBus,
  deleteQueue,
  deleteTargetRule,
  generateRandomId,
  hasMessage,
  putEvent,
} from '@packages/aws-async-test-library';

import { config } from '@config/config';

// we ensure that the sqs queue name never clashes with other ephemeral envs
const id = generateRandomId(7);

// set up our constants
const region = config.get('region');
const stageName = config.get('stageName');

const busName = `orders-domain-event-bus-${stageName}`;
const sharedBusName = `shared-domains-event-bus-${stageName}`;

let queueUrl: string;

const queueName = `${id}-sqs`;
const ruleName = `${sharedBusName}-rule`;
const source = 'com.order.internal';
const detailType = 'OrderCreatedEvent';

//               __________    _________    ____________
//               | Orders |    | Queue |   |  Handler  |
// --> put event | (Bus)  | -->| (SQS) |-->| (Lambda)  |--|
//               __________    _________    ____________  |
//                                                        |
//           ______________________________________________
//           |
//           V
//  ______________   ______________    _____________  _________________
//  |   Table    |   |   Stream   |   |   Handler |   |  shared bus   |
//  | (DynamoDB) |-->| (DynamoDB) |-->|  (Lambda) |-->| (EventBridge) |--> Check temp queue ✔️
//  --------------   --------------   -------------   -----------------

describe('3rd-party-order-journey', () => {
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
    const productId = generateRandomId(7);

    const event = {
      quantity: 1123,
      price: 4.99,
      productId,
    };

    // act
    await putEvent(
      region,
      busName,
      'com.shared.bus',
      '3rdPartyOrderRaised',
      event
    );

    // assert - ensure that the event is on our temp sqs queue
    // note: this is a temp queue to ensure that the function published
    // the event to the shared event bus
    const message = (await hasMessage(
      region,
      queueUrl,
      2,
      20,
      'detail.productId',
      productId // ensure we only grab our own message from sqs (i.e. our generated productId)
    )) as string;
    expect(JSON.parse(message)).toMatchObject({
      'detail-type': 'OrderCreatedEvent',
      source: 'com.order.internal',
      detail: {
        quantity: 1123,
        productId,
        price: 4.99,
      },
    });
  }, 120000);
});
