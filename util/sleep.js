export default async function sleep(sleepInMilliseconds) {
  return new Promise(resolve => 
    setTimeout(resolve, sleepInMilliseconds || 1000)
  );
}
