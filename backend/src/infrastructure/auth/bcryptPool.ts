import { availableParallelism } from 'os';
import { Worker } from 'worker_threads';

type Op = 'hash' | 'compare';

interface Job {
  op: Op;
  args: [string, string | number];
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

// bcryptjs is plain JavaScript: one hash at cost 12 takes about 250 ms of CPU. Run in the main
// thread, it froze every other request for that long. The workers run the same library (same
// hashes, same format), so existing passwords keep working.
const WORKER_SOURCE = `
const { parentPort } = require('worker_threads');
const bcrypt = require(${JSON.stringify(require.resolve('bcryptjs'))});
parentPort.on('message', ({ op, args }) => {
  try {
    const result = op === 'hash' ? bcrypt.hashSync(args[0], args[1]) : bcrypt.compareSync(args[0], args[1]);
    parentPort.postMessage({ result });
  } catch (error) {
    parentPort.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
});
`;

/** A few threads for bcrypt, created on first use; idle ones never keep the process alive. */
export class BcryptWorkerPool {
  private readonly idle: Worker[] = [];
  private readonly queue: Job[] = [];
  private workers = 0;

  constructor(
    private readonly size = Math.max(1, Math.min(4, availableParallelism() - 1)),
    private readonly source = WORKER_SOURCE
  ) {}

  hash(password: string, rounds: number): Promise<string> {
    return this.run('hash', [password, rounds]) as Promise<string>;
  }

  compare(password: string, hash: string): Promise<boolean> {
    return this.run('compare', [password, hash]) as Promise<boolean>;
  }

  /** Stops every thread (tests and shutdown). */
  async close(): Promise<void> {
    const idle = this.idle.splice(0);
    this.workers -= idle.length;
    await Promise.all(idle.map((w) => w.terminate()));
  }

  private run(op: Op, args: Job['args']): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.queue.push({ op, args, resolve, reject });
      this.next();
    });
  }

  private next(): void {
    if (this.queue.length === 0) return;
    let worker = this.idle.pop();
    if (!worker) {
      if (this.workers >= this.size) return;
      worker = new Worker(this.source, { eval: true });
      this.workers++;
    }
    const job = this.queue.shift() as Job;
    this.dispatch(worker, job);
  }

  private dispatch(worker: Worker, job: Job): void {
    const done = (): void => {
      worker.off('message', onMessage);
      worker.off('error', onError);
    };
    const onMessage = (msg: { result?: unknown; error?: string }): void => {
      done();
      worker.unref();
      this.idle.push(worker);
      if (msg.error !== undefined) job.reject(new Error(msg.error));
      else job.resolve(msg.result);
      this.next();
    };
    // The thread died (out of memory, for example): drop it; the next job starts a new one.
    const onError = (error: Error): void => {
      done();
      this.workers--;
      job.reject(error);
      this.next();
    };
    worker.on('message', onMessage);
    worker.on('error', onError);
    worker.ref();
    worker.postMessage({ op: job.op, args: job.args });
  }
}

let shared: BcryptWorkerPool | undefined;

/** The pool every password hasher of this process shares. */
export function sharedBcryptPool(): BcryptWorkerPool {
  shared ??= new BcryptWorkerPool();
  return shared;
}
