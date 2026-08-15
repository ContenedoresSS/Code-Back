export class QueueTimeoutError extends Error {
  constructor() {
    super("El servidor de ejecución está saturado. Intenta de nuevo en unos segundos.");
    this.name = "QueueTimeoutError";
  }
}

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason: unknown) => void;
  timer: NodeJS.Timeout;
}

export class ConcurrencyLimiter {
  private active = 0;
  private queue: QueueItem<unknown>[] = [];

  constructor(
    private readonly limit: number,
    private readonly queueTimeoutMs: number
  ) {}

  public run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active < this.limit) {
      return this.execute(fn);
    }

    return this.enqueue(fn);
  }

  private async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.active++;

    try {
      return await fn();
    } finally {
      this.active--;
      this.processQueue();
    }
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const item: QueueItem<unknown> = {
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        timer: setTimeout(() => {
          const index = this.queue.indexOf(item);
          if (index === -1) return;

          this.queue.splice(index, 1);
          reject(new QueueTimeoutError());
        }, this.queueTimeoutMs),
      };

      this.queue.push(item);
    });
  }

  private processQueue(): void {
    if (this.active >= this.limit) return;

    const item = this.queue.shift();
    if (!item) return;

    clearTimeout(item.timer);
    void this.execute(item.fn as () => Promise<unknown>).then(
      (value) => item.resolve(value),
      (error: unknown) => item.reject(error)
    );
  }
}
