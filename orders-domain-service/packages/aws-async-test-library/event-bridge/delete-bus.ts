import {
  DeleteEventBusCommand,
  DeleteRuleCommand,
  DescribeEventBusCommand,
  EventBridgeClient,
  RemoveTargetsCommand,
} from '@aws-sdk/client-eventbridge';

import { delay } from '@packages/aws-async-test-library';

export async function deleteBus(
  region: string,
  busName: string,
  ruleName: string,
  timeoutInSeconds: number = 1,
  maxIterations: number = 10
): Promise<void> {
  const client = new EventBridgeClient({ region });

  // remove the target
  const removeTargetsCommand = new RemoveTargetsCommand({
    EventBusName: busName,
    Rule: ruleName,
    Ids: [ruleName],
  });
  await client.send(removeTargetsCommand);

  // Remove the rule from the EventBridge bus
  const deleteRuleCommand = new DeleteRuleCommand({
    EventBusName: busName,
    Name: ruleName,
    Force: true,
  });
  await client.send(deleteRuleCommand);

  // Delete the EventBridge bus
  const deleteBusCommand = new DeleteEventBusCommand({
    Name: busName,
  });
  await client.send(deleteBusCommand);

  // Check if the bus has been fully deleted
  const describeBusCommand = new DescribeEventBusCommand({
    Name: busName,
  });

  let isBusDeleted = false;
  let iteration = 1;

  while (!isBusDeleted && iteration <= maxIterations) {
    try {
      await client.send(describeBusCommand);
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        isBusDeleted = true;
        return;
      } else {
        console.error('Error describing EventBridge bus:', error);
        throw error;
      }
    }

    await delay(timeoutInSeconds);

    iteration++;
  }
}
