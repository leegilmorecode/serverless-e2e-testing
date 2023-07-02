import {
  DeleteRuleCommand,
  EventBridgeClient,
  RemoveTargetsCommand,
} from '@aws-sdk/client-eventbridge';

export async function deleteTargetRule(
  region: string,
  busName: string,
  ruleName: string
): Promise<void> {
  const client = new EventBridgeClient({ region });

  // remove the target
  const removeTargetsCommand = new RemoveTargetsCommand({
    EventBusName: busName,
    Rule: ruleName,
    Ids: [ruleName],
  });
  await client.send(removeTargetsCommand);

  // remove the rule
  const deleteRuleCommand = new DeleteRuleCommand({
    EventBusName: busName,
    Name: ruleName,
    Force: true,
  });
  await client.send(deleteRuleCommand);
}
