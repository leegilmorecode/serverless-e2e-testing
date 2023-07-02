import {
  checkBusExists,
  createBus,
  deleteBus,
} from '@packages/aws-async-test-library/event-bridge';
import {
  createQueueForBus,
  deleteQueue,
  hasMessage,
} from '@packages/aws-async-test-library/sqs';

import { PublishEventBody } from './event-adapter';
import { config } from '@config/config';
import { generateRandomId } from '@packages/aws-async-test-library';

// we ensure that the event bus name never clashes with other ephemeral envs
const id = generateRandomId(7);

// set up our constants
const region = config.get('region');
const bus = `${id}-bus`;
const queue = `${id}-sqs`;

// setup our test constants
const source = 'com.acme.source';
const detailType = 'createOrder';
const ruleName = `${bus}-rule`;

let queueUrl: string;

describe('event-adapter-integration-tests', () => {
  beforeAll(async () => {
    jest.retryTimes(2, { logErrorsBeforeRetry: true });

    // create the bus if it doesn't already exist
    const busExists = await checkBusExists(region, bus);
    if (!busExists) {
      await createBus(region, bus);
      queueUrl = await createQueueForBus(
        bus,
        queue,
        region,
        source,
        detailType,
        ruleName
      );
    }
  }, 12000);

  afterAll(async () => {
    // after all we delete the bus and queue
    await deleteBus(region, bus, ruleName);
    await deleteQueue(region, queue);
  }, 12000);

  describe('publish event successfully', () => {
    it('should publish the event successfully to the eventbridge bus', async () => {
      // arrange
      const event: PublishEventBody = {
        event: {
          quantity: 3,
          productId: 'test-123',
          id: '4f9a8a09-b2c1-49a1-bc20-7bbc0811c0dc',
          created: '2023-07-04T09:12:30.138Z',
          price: 3.98,
        },
        detailType,
        source,
        eventVersion: '1',
        eventDateTime: '2023-07-04T09:12:30.138Z',
        eventBus: bus,
      };

      // act
      const { publishEvent } = await import('./event-adapter');
      await publishEvent(event);

      // assert
      const message = (await hasMessage(region, queueUrl)) as string;

      expect(JSON.parse(message)).toMatchObject({
        'detail-type': detailType,
        source,
        detail: {
          quantity: 3,
          productId: 'test-123',
          price: 3.98,
        },
      });
    }, 30000);
  });
});
