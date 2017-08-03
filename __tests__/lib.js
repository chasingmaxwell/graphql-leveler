jest.mock('graphql');
const graphql = require('graphql');

graphql.GraphQLString = class GraphQLString {};
graphql.GraphQLBoolean = class GraphQLBoolean {};
graphql.GraphQLNonNull = jest.fn(() => class GraphQLNonNull {});
const { AnyScalar } = require('graphql-anyscalar');
const _ = require('lodash');
const {
  LevelerObjectType,
} = require('../lib');

describe('The LevelerObjectType class', () => {
  let def;
  let expectedDef;
  let leveler;
  let resDef;

  beforeEach(() => {
    jest.resetAllMocks();
    def = {
      name: 'testDef',
      fields: () => ({
        aString: { type: graphql.GraphQLString },
      }),
    };
    leveler = new LevelerObjectType(def);
    expectedDef = {
      name: 'testDef',
      fields: {
        aString: { type: graphql.GraphQLString },
        _get: {
          type: AnyScalar,
          args: {
            path: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
            defaultValue: { type: AnyScalar },
            allowUndefined: { type: graphql.GraphQLBoolean },
          },
        },
        _root: {
          type: leveler,
        },
      },
    };
    resDef = graphql.GraphQLObjectType.mock.calls[0][0];
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('Extends GraphQLObjectType', () => {
    expect.assertions(1);
    expect(leveler).toBeInstanceOf(graphql.GraphQLObjectType);
  });

  describe('The _get field', () => {
    test('Is appended to fields when definition fields are resolved by a function', () => {
      expect.assertions(1);
      expect(_.pick(resDef.fields()._get, ['type', 'args'])).toEqual(expectedDef.fields._get);
    });

    test('Is appended to fields when definition fields are defined by an object', () => {
      expect.assertions(1);
      graphql.GraphQLObjectType.mockReset();
      const newDef = Object.assign(
        {},
        def,
        { fields: { aString: { type: graphql.GraphQLString } } }
      );
      const newLeveler = new LevelerObjectType(newDef); // eslint-disable-line no-unused-vars
      const newResDef = graphql.GraphQLObjectType.mock.calls[0][0];
      expect(_.pick(newResDef.fields()._get, ['type', 'args'])).toEqual(expectedDef.fields._get);
    });

    test('Resolves by path', () => {
      expect.assertions(1);
      const obj = {
        some: { nested: { property: 'yay!' } },
      };
      expect(resDef.fields()._get.resolve(obj, { path: 'some.nested.property' })).toBe('yay!');
    });

    test('Resolves any scalar', () => {
      expect.assertions(1);
      expect(resDef.fields()._get.type).toEqual(AnyScalar);
    });

    test('Requires path argument', () => {
      expect.assertions(2);
      expect(resDef.fields()._get.args.path.type).toBeInstanceOf(graphql.GraphQLNonNull);
      expect(graphql.GraphQLNonNull).toHaveBeenCalledWith(graphql.GraphQLString);
    });

    test('Can return default value', () => {
      expect.assertions(2);
      const obj = {
        some: { nested: { property: 'yay!' } },
      };
      expect(resDef.fields()._get.resolve(obj, { path: 'some.nested.property', defaultValue: 'default!' })).toBe('yay!');
      expect(resDef.fields()._get.resolve(obj, { path: 'some.nonexistant.property', defaultValue: 'default!' })).toBe('default!');
    });

    test('Disallows undefined values by default', () => {
      expect.assertions(1);
      const obj = {};
      expect(() => resDef.fields()._get.resolve(obj, { path: 'some.nested.property' })).toThrow('The "some.nested.property" property does not exist.');
    });

    test('Can allow undefined values', () => {
      expect.assertions(1);
      const obj = {};
      expect(resDef.fields()._get.resolve(obj, { path: 'some.nested.property', allowUndefined: true })).toBeUndefined();
    });
  });

  describe('The _root field', () => {
    test('Is appended to fields when definition fields are resolved by a function', () => {
      expect.assertions(1);
      expect(resDef.fields()._root.type).toEqual(expectedDef.fields._root.type);
    });

    test('Is appended to fields when definition fields are defined by an object', () => {
      expect.assertions(1);
      graphql.GraphQLObjectType.mockReset();
      const newDef = Object.assign(
        {},
        def,
        { fields: { aString: { type: graphql.GraphQLString } } }
      );
      const newLeveler = new LevelerObjectType(newDef); // eslint-disable-line no-unused-vars
      const newResDef = graphql.GraphQLObjectType.mock.calls[0][0];
      expect(newResDef.fields()._root.type).toEqual(newLeveler);
    });

    test('Passes the root object in the resolver', () => {
      expect.assertions(1);
      const obj = { iAm: 'expected' };
      expect(resDef.fields()._root.resolve(obj)).toEqual(obj);
    });
  });
});
