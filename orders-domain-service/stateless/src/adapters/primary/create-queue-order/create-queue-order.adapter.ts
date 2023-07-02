import {
  MetricUnits,
  Metrics,
  logMetrics,
} from '@aws-lambda-powertools/metrics';
import { SQSEvent, SQSHandler, SQSRecord } from 'aws-lambda';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { logger, schemaValidator } from '@shared/index';

import { CreateOrderDto } from '@dto/create-order';
import { ValidationError } from '@errors/validation-error';
import { createOrderUseCase } from '@use-cases/create-order';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import middy from '@middy/core';
import { schema } from './create-queue-order.schema';

const tracer = new Tracer();
const metrics = new Metrics();

const processRecord = async (record: SQSRecord): Promise<void> => {
  const { body } = record;

  if (!body) throw new ValidationError('no payload body');

  const parsedBody = JSON.parse(body);
  const order = parsedBody.detail as CreateOrderDto;

  logger.info('record body:', {
    ...order,
  });

  schemaValidator(schema, order);

  await createOrderUseCase(order);

  metrics.addMetric('SuccessfulCreateOrderCreated', MetricUnits.Count, 1);
};

export const createQueueOrderAdapter: SQSHandler = async (
  event: SQSEvent
): Promise<void> => {
  try {
    const records: SQSRecord[] = event.Records;

    const processPromises: Promise<void>[] = records.map((record: SQSRecord) =>
      processRecord(record)
    );
    await Promise.all(processPromises);
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) errorMessage = error.message;
    logger.error(errorMessage);

    metrics.addMetric('CreateOrderCreatedError', MetricUnits.Count, 1);

    throw error;
  }
};

export const handler = middy(createQueueOrderAdapter)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics));
