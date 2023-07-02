export async function delay(delayInSeconds: number) {
  await new Promise((resolve) => setTimeout(resolve, delayInSeconds * 1000));
}
