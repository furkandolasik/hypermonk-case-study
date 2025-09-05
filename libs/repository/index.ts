export type Predicate = UnaryOperatorExpr | BinaryOperatorPredicate | BinaryOperatorExpr;
export type Value = number | string | boolean | { name: string };
//TODO: IN operator needed
export interface BinaryOperatorExpr {
  lhs: Value;
  rhs: Value;
  operator: '<' | '<=' | '=' | '>' | '>=' | '!=' | 'CONTAINS' | 'NOT CONTAINS';
}

export interface BinaryOperatorPredicate {
  operator: 'AND' | 'OR';
  predicates: Predicate[];
}

export interface UnaryOperatorExpr {
  operator: 'NOT';
  expr: Predicate;
}

export interface QueryArguments<K, V> {
  index?: string; // Index hashKey-sortKey

  partition?: string | number | boolean;

  // Start from a specific key
  startKey?: K;

  // If limit is not provided, it will return all items
  limit?: number;

  // Filter
  filter?: Predicate;
}

export interface QueryOutput<K, V> {
  items: { key: K; value: V }[];
  lastEvaluatedKey: any | null;
}

interface Repository<K, V extends Object> {
  // Create & Update
  put(key: K, value: V): Promise<void>;
  putMany(items: Array<{ key: K; value: V }>): Promise<void>;

  // Read
  get(key: K): Promise<V>;
  getMany(keys: Array<K>): Promise<Array<V>>;

  // Delete
  delete(key: K): Promise<void>;
  deleteMany(keys: Array<K>): Promise<void>;

  // Partial Update
  partialUpdate(key: K, fields: Partial<V>): Promise<void>;
  partialUpdateMany(items: Array<{ key: K; fields: Partial<V> }>): Promise<void>;

  // Query
  query(args?: QueryArguments<K, V>): Promise<QueryOutput<K, V>>;

  queryAdvanced(PK: string, SK: string, prefix?: string, direction?: boolean, limit?: number): Promise<V[]>;
  queryAdvancedWithFilter(
    PK: string,
    SK: string,
    prefix: string,
    FilterExpression: string,
    filterValue: boolean
  ): Promise<V[]>;
}

export default Repository;
