import { getISOString, logger, schemaValidator } from '@shared/index';

import { CreateOrderDto } from '@dto/create-order';
import { OrderDto } from '@dto/order-dto';
import { config } from '@config/config';
import { createOrder } from '@adapters/secondary/database-adapter';
import { schema } from '@schemas/order';
import { v4 as uuid } from 'uuid';

export async function createOrderUseCase(
  order: CreateOrderDto
): Promise<OrderDto> {
  const createdDate = getISOString();
  const tableName = config.get('tableName');

  const orderDto: OrderDto = {
    id: uuid(),
    created: createdDate,
    ...order,
  };

  schemaValidator(schema, orderDto);

  await createOrder(orderDto, tableName);

  logger.info(`order created event published`);

  return orderDto;
}
