type WaitUntilRequest = Request & { __cfWaitUntil?: (promise: Promise<unknown>) => void };

// Dispara `task()` sem bloquear a resposta HTTP que está sendo montada. Em
// produção (Cloudflare Workers), registra a promise via `ExecutionContext.
// waitUntil` (anexado ao `request` em src/server.ts) para sobreviver depois
// da resposta ser enviada — sem isso, o Worker pode ser encerrado antes do
// trabalho terminar. Em dev/node, não há waitUntil (nem falta: o processo
// continua vivo por conta própria), então a task só roda em segundo plano.
export function runInBackground(request: Request, task: () => Promise<unknown>) {
  const promise = task().catch((error) => {
    console.error("[background-task] falhou", error);
  });
  const waitUntil = (request as WaitUntilRequest).__cfWaitUntil;
  if (waitUntil) waitUntil(promise);
}
