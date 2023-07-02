import {
  PublishEventBody,
  publishEvent,
} from '@adapters/secondary/event-adapter';
import { getISOString, logger, schemaValidator } from '@shared/index';

import { OrderDto } from '@dto/order-dto';
import { config } from '@config/config';
import { schema } from '@schemas/order';

export async function orderStreamUseCase(
  order: OrderDto,
  eventType: string,
  source: string
): Promise<void> {
  const eventBus = config.get('eventBus');

  schemaValidator(schema, order);

  const event: PublishEventBody = {
    event: order,
    source,
    detailType: eventType,
    eventDateTime: getISOString(),
    eventVersion: '1',
    eventBus,
  };

  await publishEvent(event);

  logger.info(`order event published`);
}
