import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  MetricUnits,
  Metrics,
  logMetrics,
} from '@aws-lambda-powertools/metrics';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { errorHandler, logger, schemaValidator } from '@shared/index';

import { CreateOrderDto } from '@dto/create-order';
import { OrderDto } from '@dto/order-dto';
import { ValidationError } from '@errors/validation-error';
import { createOrderUseCase } from '@use-cases/create-order';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import middy from '@middy/core';
import { schema } from './create-order.schema';

const tracer = new Tracer();
const metrics = new Metrics();

export const createOrderAdapter = async ({
  body,
}: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!body) throw new ValidationError('no payload body');

    const order = JSON.parse(body) as CreateOrderDto;

    schemaValidator(schema, order);

    const created: OrderDto = await createOrderUseCase(order);

    metrics.addMetric('SuccessfulCreateOrderCreated', MetricUnits.Count, 1);

    return {
      statusCode: 201,
      body: JSON.stringify(created),
    };
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) errorMessage = error.message;
    logger.error(errorMessage);

    metrics.addMetric('CreateOrderCreatedError', MetricUnits.Count, 1);

    return errorHandler(error);
  }
};

export const handler = middy(createOrderAdapter)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics));
