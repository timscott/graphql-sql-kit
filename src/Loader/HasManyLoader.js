import BaseLoader from './BaseLoader';

class HasManyLoader extends BaseLoader {
  constructor(args) {
    super({
      ...args,
      rowMapFunc: 'filter'
    });
  }
}

export default HasManyLoader;
