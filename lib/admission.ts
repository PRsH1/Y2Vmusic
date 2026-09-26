/**
 * Bounded admission control for work that saturates this box.
 *
 * The server has one core. yt-dlp and ffmpeg peg it, and `warp-svc` — which
 * yt-dlp depends on to reach YouTube — shares that core. Subprocess nice
 * values keep the proxy alive (see lib/process.ts), but nothing bounds how
 * many of these jobs run at once, so concurrency is capped here instead.
 *
 * Pools are separate on purpose. A single FIFO would park a chart request
 * behind a multi-minute download, and the explore UI aborts its requests at
 * 45s (components/explore/explore-section.tsx), so cheap lookups would fail
 * while the CPU sat idle waiting on network.
 */

export class BusyError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("서버가 다른 작업을 처리 중입니다. 잠시 후 다시 시도하세요.");
    this.name = "BusyError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export type Slot = {
  release: () => void;
};

type Waiter = {
  resolve: (slot: Slot) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type AdmissionOptions = {
  label: string;
  capacity: number;
  /** How long a request waits for a slot before being turned away. */
  waitMs: number;
  /** Safety net: a slot never held longer than this. See `grant`. */
  maxHoldMs: number;
};

export class Admission {
  private readonly label: string;
  private readonly capacity: number;
  private readonly waitMs: number;
  private readonly maxHoldMs: number;
  private active = 0;
  private queue: Waiter[] = [];

  constructor(options: AdmissionOptions) {
    this.label = options.label;
    this.capacity = options.capacity;
    this.waitMs = options.waitMs;
    this.maxHoldMs = options.maxHoldMs;
  }

  get stats(): { active: number; queued: number; capacity: number } {
    return { active: this.active, queued: this.queue.length, capacity: this.capacity };
  }

  acquire(): Promise<Slot> {
    if (this.active < this.capacity) {
      return Promise.resolve(this.grant());
    }

    return new Promise<Slot>((resolve, reject) => {
      const waiter: Waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.queue = this.queue.filter((queued) => queued !== waiter);
          console.warn(
            `[admission] ${this.label} turned away after ${this.waitMs}ms (active=${this.active})`,
          );
          reject(new BusyError(Math.ceil(this.waitMs / 1000)));
        }, this.waitMs),
      };

      this.queue.push(waiter);
    });
  }

  /**
   * Runs `fn` holding a slot. Use this unless the slot must be released
   * before the handler returns (the download route streams its result and
   * releases as soon as the file exists, so it acquires directly).
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const slot = await this.acquire();

    try {
      return await fn();
    } finally {
      slot.release();
    }
  }

  private grant(): Slot {
    this.active += 1;

    let released = false;
    let guard: ReturnType<typeof setTimeout> | undefined;

    const release = () => {
      if (released) {
        return;
      }

      released = true;

      if (guard) {
        clearTimeout(guard);
      }

      this.active -= 1;
      this.pump();
    };

    // A slot leaked by an uncaught path would wedge the pool for the life of
    // the process — every later request turned away while nothing runs. A
    // forced release can briefly exceed capacity, which is strictly better
    // than a permanent deadlock, so it is loud rather than silent.
    guard = setTimeout(() => {
      console.error(
        `[admission] ${this.label} slot held past ${this.maxHoldMs}ms — force releasing`,
      );
      release();
    }, this.maxHoldMs);
    guard.unref?.();

    return { release };
  }

  private pump(): void {
    while (this.active < this.capacity && this.queue.length > 0) {
      const waiter = this.queue.shift();

      if (!waiter) {
        break;
      }

      clearTimeout(waiter.timer);
      waiter.resolve(this.grant());
    }
  }
}

/**
 * Extraction and conversion: CPU-bound, one at a time.
 *
 * The wait has to exceed how long a job actually takes, or queueing is
 * pointless — a second request would always age out while the first is still
 * running. Measured on this server: 76-112s per track. At the original 30s
 * roughly two thirds of second downloads were turned away; 180s lets a
 * queued track wait out the one ahead of it and finish.
 *
 * Nothing caps the queue by count — each waiter ages out on its own — and the
 * download request has no client-side timeout to race.
 */
export const downloadAdmission = new Admission({
  label: "download",
  capacity: 1,
  waitMs: 180_000,
  maxHoldMs: 50 * 60_000,
});

/**
 * info / search / chart misses: network-bound, so two can run without
 * contending for the core. The wait stays well under the explore UI's 45s
 * abort so a queued request still gets a real answer.
 */
export const metadataAdmission = new Admission({
  label: "metadata",
  capacity: 2,
  waitMs: 10_000,
  maxHoldMs: 5 * 60_000,
});
