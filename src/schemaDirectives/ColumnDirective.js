import {SchemaDirectiveVisitor} from 'apollo-server';
import {defaultFieldResolver} from 'graphql';

class ColumnDirective extends SchemaDirectiveVisitor {
  // Do nothing. We just want the metadata for the parent resolver.
  visitFieldDefinition(field) {
    const {resolve = defaultFieldResolver} = field;
    field.resolve = async (...args) => {
      return await resolve.apply(this, args);
    };
  }
}

export default ColumnDirective;
