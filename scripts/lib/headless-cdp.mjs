// Local, isolated headless Edge only; no Computer Use dependency.
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function createHeadlessPage() {
  const endpoint = process.env.HUAXIA_CDP_ENDPOINT ?? 'http://127.0.0.1:9223';
  const commandTimeout = Number(process.env.HUAXIA_CDP_COMMAND_TIMEOUT ?? 20000);
  const target = await fetch(`${endpoint}/json/new?about:blank`, { method:'PUT' }).then(r => r.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map(); let nextId = 0;
  const errors = []; const failures = [];
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once:true}); socket.addEventListener('error', reject, {once:true}); });
  socket.addEventListener('message', event => {
    const value = JSON.parse(event.data);
    if (value.id) {
      const request = pending.get(value.id); if (!request) return;
      clearTimeout(request.timer); pending.delete(value.id);
      if (value.error) request.reject(new Error(JSON.stringify(value.error))); else request.resolve(value.result);
    } else if (value.method === 'Runtime.exceptionThrown') errors.push(value.params.exceptionDetails);
    else if (value.method === 'Network.loadingFailed' && !value.params.canceled) failures.push(value.params.errorText);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, commandTimeout);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = async (expression, label = expression, timeout = 20000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await sleep(100); }
    throw new Error(`Timed out: ${label}`);
  };
  await Promise.all(['Page.enable','Runtime.enable','Network.enable'].map(method => send(method)));
  await send('Page.bringToFront');
  return { send, evaluate, wait, errors, failures,
    async navigate(url) {
      const previous = await evaluate('performance.timeOrigin');
      await send('Page.navigate', {url});
      await wait(`performance.timeOrigin !== ${previous} && document.readyState === 'complete' && !!document.querySelector('#root > *')`, 'navigate', Number(process.env.HUAXIA_CDP_NAVIGATION_TIMEOUT ?? 60000));
    },
    async close() {
      if (socket.readyState !== WebSocket.CLOSED) await new Promise(resolve => {
        socket.addEventListener('close', resolve, {once:true}); socket.close();
      });
      await fetch(`${endpoint}/json/close/${target.id}`);
    },
  };
}
