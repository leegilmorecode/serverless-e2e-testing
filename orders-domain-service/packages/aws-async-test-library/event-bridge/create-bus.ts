import {
  CreateEventBusCommand,
  DescribeEventBusCommand,
  EventBridgeClient,
} from '@aws-sdk/client-eventbridge';

import { delay } from '@packages/aws-async-test-library';

export async function createBus(
  region: string,
  busName: string,
  timeoutInSeconds: number = 1,
  maxIterations: number = 10
): Promise<void> {
  const client = new EventBridgeClient({ region });

  // create the event bus
  const createBusCommand = new CreateEventBusCommand({
    Name: busName,
  });

  await client.send(createBusCommand);

  const describeBusCommand = new DescribeEventBusCommand({
    Name: busName,
  });

  let isBusCreated = false;
  let iteration = 1;

  while (!isBusCreated && iteration <= maxIterations) {
    // check if the bus has been created successfully
    try {
      await client.send(describeBusCommand);
      isBusCreated = true;
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        isBusCreated = false;
      } else {
        console.error('Error describing EventBridge bus:', error);
        throw error;
      }
    }

    await delay(timeoutInSeconds);

    iteration++;
  }
}
