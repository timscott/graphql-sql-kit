import {InMemoryLRUCache} from 'apollo-server-caching/dist/InMemoryLRUCache';

const defaultMaxSize = 100000;

class Cache extends InMemoryLRUCache {
  constructor({defaultTtl, maxSize = defaultMaxSize, ...rest}) {
    super({
      maxSize,
      ...rest
    });
    this.defaultTtlMillseconds = defaultTtl && defaultTtl.asMilliseconds
      ? defaultTtl.asMilliseconds()
      : defaultTtl;
  }
  set(key, value, ttl = this.defaultTtlMillseconds) {
    super.set(key, value, ttl);
  }
}

export default Cache;
