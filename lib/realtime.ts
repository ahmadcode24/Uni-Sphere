type Listener = (data: unknown) => void;

interface GlobalWithBus {
  __bus?: Map<string, Set<Listener>>;
}

const g = globalThis as unknown as GlobalWithBus;
g.__bus ??= new Map<string, Set<Listener>>();

export const subscribe = (channel: string, callback: Listener) => {
  if (!g.__bus) {
    g.__bus = new Map<string, Set<Listener>>();
  }
  let set = g.__bus.get(channel);
  if (!set) {
    set = new Set<Listener>();
    g.__bus.set(channel, set);
  }
  set.add(callback);
  return () => {
    set?.delete(callback);
  };
};

export const publish = (channel: string, data: unknown) => {
  if (!g.__bus) return;
  const set = g.__bus.get(channel);
  if (set) {
    set.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error(`[Realtime publish error on ${channel}]:`, err);
      }
    });
  }
};
