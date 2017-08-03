const _ = require('lodash');
const {
  GraphQLBoolean,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType,
} = require('graphql');
const { AnyScalar } = require('graphql-anyscalar');

class LevelerObjectType extends GraphQLObjectType {
  constructor(def) {
    const levelerDef = Object.assign({}, def);
    const fields = () => {
      const _get = {
        type: AnyScalar,
        args: {
          path: { type: new GraphQLNonNull(GraphQLString) },
          defaultValue: { type: AnyScalar },
          allowUndefined: { type: GraphQLBoolean },
        },
        resolve: (obj, { path, defaultValue = undefined, allowUndefined = false }) => {
          const val = _.get(obj, path, defaultValue);
          if (!allowUndefined && typeof val === 'undefined') {
            throw new Error(`The "${path}" property does not exist.`);
          }
          return val;
        },
      };
      const _root = {
        type: this,
        resolve: obj => obj,
      };

      return { _get, _root };
    };

    levelerDef.fields = (defFields => () => {
      const resolvedFields = typeof defFields === 'function' ? defFields() : defFields;
      return Object.assign({}, fields(), resolvedFields);
    })(levelerDef.fields);

    super(levelerDef);
  }
}

module.exports = { LevelerObjectType };
