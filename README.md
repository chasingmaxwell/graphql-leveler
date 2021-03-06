# graphql-leveler

graphql-leveler makes it possible for GraphQL servers to allow client queries to control the shape of response objects. It does this by exposing a new type called `LevelerObjectType` which is a drop-in replacement for `GraphQLObjectType` with the addition of two convenient fields: `_get` and `_root`.


## Installation

`yarn add graphql-leveler` or `npm install --save graphql-leveler`

## Client Usage

### \_get

`_get` allows clients to query the object by path, much like lodash's `get()` method. In fact, it uses `_.get()` under the hood! Using `_get` in combination with an alias, a client can access deeply nested properties at the top level of an object with whatever property name the client desires.

#### Basic Queries

If the object's resolver on the server returns an object which looks like this:

```json
{
  "some": {
    "deeply": {
      "nested": {
        "property": "I am nested!"
      }
    }
  }
}
```

— normally the client would have to query for `property` like this:

```graphql
{
  some: { deeply: { nested: { property } } }
}
```

— and receive something that would look like this in return:

```json
{
  "data": {
    "some": {
      "deeply": {
        "nested": {
          "property": "I am nested!"
        }
      }
    }
  }
}
```

— regardless of whether that is the shape desired by the client.

However, with `_get`, now the client can query for the same property like this:

```graphql
{
  myProperty: _get(path: "some.deeply.nested.property")
}
```

— flattening the response to something that looks like this:

```json
{
  "data": {
    "myProperty": "I am nested!"
  }
}
```

#### Nested LevelerObjectType's

You aren't limited to completely flat shapes either! Since `LevelerObjectType` is a drop-in replacement for `GraphQLObjectType`, you can make any `GraphQLObjectType` a `LevelerObjectType`, allowing clients extreme flexibility over the response shape. For example, let's say we've changed every object type in the above example to `LevelerObjectType`. Clients can now also get to the same property with the following query:

```graphql
{
  iCanControl: some {
    theShape: _get(path: "deeply.nested.property")
  }
}
```

— which will result in the following response shape:

```json
{
  "data": {
    "iCanControl": {
      "theShape": "I am nested!"
    }
  }
}
```

#### Optional arguments

In addition to the required `path` argument, the `_get` field provides two optional arguments:

##### defaultValue

Define the default value returned if there is no property found at the given path.

```graphql
{
  sometimesMissing: _get(path: "some.occasionally.existing.property", defaultValue: "missing")
}
```

##### allowUndefined

The default behavior is to report an error if the property at the given path is missing and no default value is provided. This argument allows undefined values so that the result will be `null` in the response for that field.

```graphql
{
  sometimesMissing: _get(path: "some.occasionally.existing.property", allowUndefined: true)
}
```

### \_root

`_root` allows clients access the the root of the closest `LevelerObjectType` in places where it would usually be out of scope. This can be used in combination with aliases to construct arbitrary objects in the response object. For example:

If the object's resolver on the server returns this:

```json
{
  "attributes": {
    "episodeNumber": 42,
    "seasonNumber": 1
  }
}
```

— then a client can query it like this:

```graphql
{
  episode: attributes {
    episodeNumber
    season: _root {
      seasonNumber
    }
  }
}
```

— producing a shape like this:

```json
{
  "data": {
    "episode": {
      "episodeNumber": 42,
      "season": {
        "seasonNumber": 1
      }
    }
  }
}
```

In the above example, the `seasonNumber` field is nested inside `episode.season` which is an arbitrary object. Without `_root` that field would need to be queried and returned at the root of the `episode` object.

## Server Usage

`LevelerObjectType` is a drop-in replacement for `GraphQLObjectType`. For every object you desire to be queryable with `_get`, simply replace `GraphQLObjectType` with `LevelerObjectType`.

```javascript
const {
  GraphQLString,
  GraphQLInt,
  GraphQLObjectType,
} = require('graphql');
const {
  LevelerObjectType,
} = require('graphql-leveler');

// This would have been GraphQLObjectType before.
const PersonType = new LevelerObjectType({
  name: 'person',
  fields: () => ({
    attributes: {
      // This would have been GraphQLObjectType before.
      type: new LevelerObjectType({
        name: 'personAttributes',
        fields: () => ({
          name: { type: GraphQLString },
          height: { type: GraphQLInt },
          eye_color: { type: GraphQLString },
        }),
      }),
    },
  }),
});
```

## What are the limitations?

### Only scalar leaf values can be retrieved with \_get.

As of right now, because of the complexity of allowing multiple types in the response for a single field, no complex values like objects or arrays can be returned by the `_get` field resolver.

### Nested field resolvers are not invoked with \_get.

graphql-leveler does not invoke field resolvers within the object currently being queried, and so it is limited to properties which exist in the raw object returned by the resolver.

So, for example, if your raw object looks like this:

```json
{
  "id": "123",
  "type": "person",
  "attributes": {
    "name": "Luke Skywalker"
  },
  "relationships": {
    "father": {
      "data": {
        "id": "122",
        "type": "person"
      }
    }
  }
}
```

— where the father relationship data resolves to (spoiler alert):

```json
{
  "id": "122",
  "type": "person",
  "attributes": {
    "name": "Darth Vader"
  }
}
```

You cannot write a query like this:

```graphql
{
  Luke: person(id: "123") {
    father: _get(path: "relationships.father.data.attributes.name")
  }
}
```

— since the raw data for person "123" does not contain the attributes of its father relationship. In this case you would either need to adjust your person resolver to include the full entity in the relationship or adjust the client query to something like this:

```graphql
{
  Luke: person(id: "123") {
    relationships {
      father: {
        name: _get(path: "attributes.name")
      }
    }
  }
}
```
