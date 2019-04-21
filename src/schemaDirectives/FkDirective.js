import {SchemaDirectiveVisitor} from 'apollo-server';

class FkDirective extends SchemaDirectiveVisitor {
  // Do nothing. We just want the metadata for the parent resolver.
  visitFieldDefinition(field) {
    const {resolve = defaultFieldResolver} = field;
    field.resolve = async (...args) => {
      return await resolve.apply(this, args);
    };
  }
}

export default FkDirective;
