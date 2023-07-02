import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as sqs from 'aws-cdk-lib/aws-sqs';

import { Construct } from 'constructs';

interface OrdersDomainServiceStatelessStackProps extends cdk.StackProps {
  stageName: string;
  sharedEventBusName: string;
  ordersInternalTable: dynamodb.Table;
  ordersInternalQueue: sqs.Queue;
}

export class OrdersDomainServiceStatelessStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: OrdersDomainServiceStatelessStackProps
  ) {
    super(scope, id, props);

    const lambdaPowerToolsConfig = {
      LOG_LEVEL: 'DEBUG',
      POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
      POWERTOOLS_TRACE_ENABLED: 'enabled',
      POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS: 'captureHTTPsRequests',
      POWERTOOLS_SERVICE_NAME: 'OrderService',
      POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'captureResult',
      POWERTOOLS_METRICS_NAMESPACE: 'acme-inc',
    };

    // get a reference to the shared event bus
    const sharedEventBus = events.EventBus.fromEventBusName(
      this,
      'SharedEventBus',
      props.sharedEventBusName
    );

    // create the lambda for the post request of a new order
    const createOrderLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'CreateOrderLambda', {
        functionName: `create-order-lambda-${props.stageName}`,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(
          __dirname,
          './src/adapters/primary/create-order/create-order.adapter.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        bundling: {
          minify: true,
        },
        environment: {
          ...lambdaPowerToolsConfig,
          TABLE_NAME: props.ordersInternalTable.tableName,
        },
      });
    props.ordersInternalTable.grantWriteData(createOrderLambda);

    // create the api gateway for creating new orders
    const api: apigw.RestApi = new apigw.RestApi(
      this,
      'InternalOrdersDomainApi',
      {
        description: `orders internal domain api for ${props.stageName}`,
        restApiName: `orders-internal-domain-api-${props.stageName}`,
        deploy: true,
        deployOptions: {
          stageName: 'api',
          dataTraceEnabled: true,
          loggingLevel: apigw.MethodLoggingLevel.INFO,
          tracingEnabled: true,
          metricsEnabled: true,
        },
      }
    );

    const apiRoot: apigw.Resource = api.root.addResource('v1');
    const createOrderResource: apigw.Resource = apiRoot.addResource('orders');

    createOrderResource.addMethod(
      'POST',
      new apigw.LambdaIntegration(createOrderLambda, {
        proxy: true,
      })
    );

    // create the stream lambda handler for the dynamodb stream
    const ordersStreamLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'OrdersStreamLambda', {
        functionName: `orders-stream-lambda-${props.stageName}`,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(
          __dirname,
          './src/adapters/primary/orders-stream/orders-stream.adapter.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        bundling: {
          minify: true,
        },
        environment: {
          ...lambdaPowerToolsConfig,
          BUS_NAME: props.sharedEventBusName,
        },
      });

    // add the lambda as an event source for the dynamodb table
    ordersStreamLambda.addEventSource(
      new lambdaEventSources.DynamoEventSource(props.ordersInternalTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 1,
        retryAttempts: 10,
        reportBatchItemFailures: true,
      })
    );

    // create the dynamodb stream integration
    props.ordersInternalTable.grantStreamRead(ordersStreamLambda);
    sharedEventBus.grantPutEventsTo(ordersStreamLambda);

    // create the lambda handler for the queue processing
    const createOrderQueueLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'CreateOrderQueueLambda', {
        functionName: `create-order-queue-lambda-${props.stageName}`,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(
          __dirname,
          './src/adapters/primary/create-queue-order/create-queue-order.adapter.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        bundling: {
          minify: true,
        },
        environment: {
          ...lambdaPowerToolsConfig,
          TABLE_NAME: props.ordersInternalTable.tableName,
        },
      });
    createOrderQueueLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(props.ordersInternalQueue, {
        batchSize: 1,
        maxConcurrency: 2,
      })
    );

    props.ordersInternalTable.grantWriteData(createOrderQueueLambda);
    props.ordersInternalQueue.grantConsumeMessages(createOrderQueueLambda);
  }
}
