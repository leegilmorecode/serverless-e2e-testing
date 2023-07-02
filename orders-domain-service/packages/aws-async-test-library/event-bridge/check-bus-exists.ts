import {
  DescribeEventBusCommand,
  EventBridgeClient,
} from '@aws-sdk/client-eventbridge';

export async function checkBusExists(
  region: string,
  busName: string
): Promise<boolean> {
  const client = new EventBridgeClient({ region });

  const describeBusCommand = new DescribeEventBusCommand({
    Name: busName,
  });

  try {
    await client.send(describeBusCommand);
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    } else {
      throw error;
    }
  }
}
