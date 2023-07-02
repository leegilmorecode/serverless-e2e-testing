import { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import {
  MetricUnits,
  Metrics,
  logMetrics,
} from '@aws-lambda-powertools/metrics';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { logger, schemaValidator } from '@shared/index';

import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { OrderDto } from '@dto/order-dto';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import middy from '@middy/core';
import { orderStreamUseCase } from '@use-cases/order-stream';
import { schema } from '@schemas/order';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const tracer = new Tracer();
const metrics = new Metrics();
type StreamRecord = Record<string, AttributeValue>;

const processStreamRecord = async (record: DynamoDBRecord): Promise<void> => {
  const { dynamodb, eventName } = record;

  if (!dynamodb || !dynamodb.Keys || !dynamodb.NewImage || !eventName) {
    return;
  }

  const dynamoDBRecord = record.dynamodb;

  const order = unmarshall(
    dynamoDBRecord?.NewImage as StreamRecord
  ) as OrderDto;

  logger.info('Event Name:', {
    eventName,
  });
  logger.info('DynamoDB Record:', order);

  schemaValidator(schema, order);

  // Note: we only have one type of event at the moment - but we should
  // take this from the eventName property to determine the event name
  await orderStreamUseCase(order, 'OrderCreatedEvent', 'com.order.internal');

  metrics.addMetric('SuccessfulOrderEventRaised', MetricUnits.Count, 1);
};

export const createOrderAdapter = async (
  event: DynamoDBStreamEvent
): Promise<void> => {
  try {
    const records: DynamoDBRecord[] = event.Records;

    const processPromises: Promise<void>[] = records.map(
      (record: DynamoDBRecord) => processStreamRecord(record)
    );
    await Promise.all(processPromises);
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) errorMessage = error.message;
    logger.error(errorMessage);

    metrics.addMetric('OrderEventRaisedError', MetricUnits.Count, 1);

    throw error;
  }
};

export const handler = middy(createOrderAdapter)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics));
