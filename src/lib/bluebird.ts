import Bluebird from 'bluebird';

Bluebird.config({
  cancellation: true,
});

const withBluebirdTimeout = <T>(
  taskFn: () => Bluebird<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out',
): Bluebird<T> => {
  let timeoutHandle: NodeJS.Timeout;

  // Create a Bluebird promise that properly wraps the task
  const task = new Bluebird<T>((resolve, reject, onCancel) => {
    // Set up timeout
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    // Set up cancellation handler
    onCancel!(() => {
      clearTimeout(timeoutHandle);
    });

    // Execute the task function
    Promise.resolve()
      .then(() => taskFn())
      .then(resolve)
      .catch(reject)
      .finally(() => {
        clearTimeout(timeoutHandle);
      });
  });

  return task;
};

export default Bluebird;
export { withBluebirdTimeout };
