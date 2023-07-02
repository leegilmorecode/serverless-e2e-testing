import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from '@aws-sdk/client-dynamodb';

import { OrderDto } from '@dto/order-dto';
import { marshall } from '@aws-sdk/util-dynamodb';

const client: DynamoDBClient = new DynamoDBClient({});

export async function createOrder(
  createOrderDto: OrderDto,
  tableName: string
): Promise<OrderDto> {
  if (!tableName) {
    throw new Error('no table name supplied');
  }

  const input: PutItemCommandInput = {
    TableName: tableName,
    Item: marshall(createOrderDto),
  };

  await client.send(new PutItemCommand(input));

  return createOrderDto;
}
