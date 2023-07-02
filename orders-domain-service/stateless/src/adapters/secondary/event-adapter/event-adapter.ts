import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandInput,
} from '@aws-sdk/client-eventbridge';

const eventBridgeClient = new EventBridgeClient({});

class NoEventBodyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoEventBodyError';
  }
}

export type PublishEventBody = {
  event: Record<string, any>;
  detailType: string;
  source: string;
  eventVersion: string;
  eventDateTime: string;
  eventBus: string;
};

export async function publishEvent(eventBody: PublishEventBody): Promise<void> {
  if (Object.keys(eventBody).length === 0) {
    throw new NoEventBodyError('There is no body on the event');
  }

  const { source, detailType, eventDateTime, eventVersion, event, eventBus } =
    eventBody;

  const params: PutEventsCommandInput = {
    Entries: [
      {
        Source: source,
        DetailType: detailType,
        Detail: JSON.stringify(event),
        Time: new Date(eventDateTime),
        EventBusName: eventBus,
        Resources: [eventVersion],
      },
    ],
  };

  const command = new PutEventsCommand(params);
  await eventBridgeClient.send(command);
}
