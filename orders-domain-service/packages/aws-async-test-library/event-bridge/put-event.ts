import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandInput,
} from '@aws-sdk/client-eventbridge';

export async function putEvent(
  region: string,
  busName: string,
  source: string,
  detailType: string,
  eventDetails: any
): Promise<void> {
  const client = new EventBridgeClient({ region });

  const putEventCommandInput: PutEventsCommandInput = {
    Entries: [
      {
        Source: source,
        DetailType: detailType,
        Detail: JSON.stringify(eventDetails),
        EventBusName: busName,
      },
    ],
  };

  try {
    await client.send(new PutEventsCommand(putEventCommandInput));
  } catch (error: any) {
    console.log(`Error: ${error}`);
    throw error;
  }
}
