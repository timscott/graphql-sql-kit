import DataLoader from 'dataloader';
import {getDb} from '../db';
import {camelize, underscore} from 'inflected';
import hash from 'object-hash';

Set.prototype.subSet = function(otherSet) {
  return this.size <= otherSet.size && ![...this].some(elem => !otherSet.has(elem));
};

const DEFAULT_PK_FIELD_NAME = 'id';

const typeProjectionMaps = {};

const resolveType = type => {
  return type.ofType ? resolveType(type.ofType) : type;
};

const fieldToColumn = fieldName => {
  return underscore(camelize(fieldName));
};

const returnTypePkColumnNameStrategy = type => {
  return `${fieldToColumn(type.name)}_id`;
};

const getDirective = (type, directiveName) => {
  const directive = type ? type.astNode.directives.find(d => d.name.value === directiveName) : undefined;
  if (directive) {
    return directive.arguments.reduce((result, arg) => {
      result[arg.name.value] = arg.value.value;
      return result;
    }, {});
  }
};

class BaseLoader {
  constructor({rowMapFunc, pkColumnNameStrategy = returnTypePkColumnNameStrategy, pkFieldName = DEFAULT_PK_FIELD_NAME, cache}) {
    this.pkColumnNameStrategy = pkColumnNameStrategy;
    this.pkFieldName = pkFieldName;
    this.cache = cache;
    this.dataLoader = new DataLoader(async key => {
      const ids = key.map(({id}) => id);
      const projectedFields = Object.keys(this.projectionMap);
      // If only the key field is requested, then we don't have to query the database.
      if (projectedFields.length === 1 && projectedFields[0] === this.keyField) {
        return ids.map(id => ({
          [this.keyField]: id
        }));
      }
      const projection = projectedFields.reduce((result, fieldName) => {
        const columnName = this.projectionMap[fieldName];
        let field = getDb().ref(columnName);
        field = columnName === fieldName ? field : field.as(fieldName);
        result.push(field);
        return result;
      }, []);
      const args = key[0].args || {}; // We can assume that all keys have the same args.
      const result = await this
        .query(ids, args)
        .select(projection)
        .then(rows => {
          return key.map(key => {
            const id = key.id || key;
            return rows[rowMapFunc](row => row[this.keyField] === parseInt(id));
          });
        });
      return result;
    }, {
      cacheKeyFn: key => key instanceof Object ? hash(key) : key
    });
  }
  async load(id, info, args) {
    this._setProjectionMap(info);
    if (!this.cache) {
      return this._doLoad(id, args);
    }
    const cached = await this.cache.get(id);
    // NOTE: We can only return the cached value if it has all the fields for this request.
    if (cached && new Set(Object.keys(this.projectionMap)).subSet(new Set(Object.keys(cached)))) {
      return cached;
    }
    const value = await this._doLoad(id, args);
    await this.cache.set(id, value);
    return value;
  }
  _makeKey(id, args) {
    return {id, args, fields: new Set(Object.keys(this.projectionMap))};
  }
  _doLoad(id, args) {
    const key = this._makeKey(id, args);
    return this.dataLoader.load(key);
  }
  // TODO: Caching for loadMany?
  loadMany(ids, info, args) {
    this._setProjectionMap(info);
    const key = ids.map(id => this._makeKey(id, args));
    return this.dataLoader.loadMany(key);
  }
  _buildTypeProjectionMap(type) {
    const fields = type.getFields();
    return Object.keys(fields).reduce((result, fieldName) => {
      const field = fields[fieldName];
      const columnDirective = getDirective(field, 'column');
      if (columnDirective && (!columnDirective.name || columnDirective.none)) {
        return result;
      }
      // TODO: Is this the best way to know an leaf node?
      if (columnDirective || resolveType(field.type).constructor.name === 'GraphQLScalarType') {
        const columnName = columnDirective
          ? columnDirective.name
          : fieldName === this.pkFieldName
            ? this.pkColumnNameStrategy(type)
            : fieldToColumn(fieldName);
        result[fieldName] = columnName;
      }
      return result;
    }, {});
  }
  _getTypeProjectionMap(type) {
    if (!typeProjectionMaps[type.name]) {
      typeProjectionMaps[type.name] = this._buildTypeProjectionMap(type);
    }
    return typeProjectionMaps[type.name];
  }
  _setProjectionMap(info) {
    const returnType = resolveType(info.returnType);
    const typeProjectionMap = {
      ...this._getTypeProjectionMap(returnType)
    };
    const parentType = resolveType(info.parentType);
    const fieldType = parentType.getFields()[info.fieldName];
    const fkDirective = getDirective(fieldType, 'fk');
    if (fkDirective) {
      typeProjectionMap[fkDirective.columnName] = fkDirective.columnName;
      this.keyField = fkDirective.columnName;
    } else {
      this.keyField = this.pkFieldName;
    }
    const fieldNames = new Set([
      ...info.fieldNodes[0].selectionSet.selections.map(selection => selection.name.value),
      this.pkFieldName, // always get the PK because it might be needed in down-graph resolution
      this.keyField // always get the key column so we can resolve our results
    ]);
    this.projectionMap = [...fieldNames].reduce((result, fieldName) => {
      const columnName = typeProjectionMap[fieldName];
      if (columnName) {
        result[fieldName] = columnName;
      }
      return result;
    }, {});
  }
}

export default BaseLoader;
