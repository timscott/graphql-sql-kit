import BaseLoader from './BaseLoader';

class BelongsToLoader extends BaseLoader {
  constructor(args) {
    super({
      ...args,
      rowMapFunc: 'find'
    });
  }
}

export default BelongsToLoader;
