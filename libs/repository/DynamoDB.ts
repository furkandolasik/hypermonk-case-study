import { ConditionalCheckFailedException, DynamoDBClient, Update, WriteRequest } from '@aws-sdk/client-dynamodb';
import {
  BatchGetCommandInput,
  BatchWriteCommandInput,
  DynamoDBDocument,
  ExecuteStatementCommand,
  QueryCommandInput,
  ScanCommandInput,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import Repository, {
  BinaryOperatorExpr,
  BinaryOperatorPredicate,
  Predicate,
  QueryArguments,
  QueryOutput,
  UnaryOperatorExpr,
  Value,
} from '.';

type Options = {
  tableName: string;
  indexes?: Record<string, { partitionKey: string; rangeKey: string }>;
  region?: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
};

export default class DynamoDB<K extends Record<string, any>, V extends Object> implements Repository<K, V> {
  ddbDoc: DynamoDBDocument;
  tableName: string;
  indexes: Record<string, { partitionKey: string; rangeKey: string }>;
  keyExtractor: (obj: V) => K;

  constructor(
    client: DynamoDBClient,
    tableName: string,
    indexes: Record<string, { partitionKey: string; rangeKey: string }> = {},
    keyExtractor: (obj: V) => K
  ) {
    client.middlewareStack.removeByTag('LOGGER');
    this.ddbDoc = DynamoDBDocument.from(client, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });
    this.tableName = tableName;
    this.indexes = indexes;
    this.keyExtractor = keyExtractor;
  }

  static from<K extends Record<string, any>, V extends Object>(options: Options, keyExtractor: (obj: V) => K) {
    const { tableName, indexes, ...connectionOptions } = options;
    const client = new DynamoDBClient(connectionOptions);
    return new DynamoDB<K, V>(client, tableName, indexes, keyExtractor);
  }

  async queryAdvanced(PK: string, SK: string, prefix?: string, direction?: boolean, limit?: number): Promise<V[]> {
    const params: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: prefix ? `PK = :PK AND ${prefix}(SK, :SK)` : `PK = :PK AND SK = :SK`,
      ExpressionAttributeValues: {
        ':PK': PK,
        ':SK': SK,
      },
      ScanIndexForward: direction ?? undefined,
      Limit: limit ?? undefined,
    };
    const result = await this.ddbDoc.query(params);
    return (result?.Items as V[]) ?? [];
  }

  async queryAdvancedWithFilter(
    PK: string,
    SK: string,
    prefix: string,
    FilterExpression: string,
    filterValue: boolean
  ): Promise<V[]> {
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: prefix ? `PK = :PK AND ${prefix}(SK, :SK)` : `PK = :PK AND SK = :SK`,
      FilterExpression: `${FilterExpression} = :filter`,
      ExpressionAttributeValues: {
        ':PK': PK,
        ':SK': SK,
        ':filter': filterValue,
      },
    };
    const result = await this.ddbDoc.query(params);
    return (result?.Items as V[]) ?? [];
  }

  async put(key: K, item: V): Promise<void> {
    if (!('createdAt' in item)) item = { ...item, ...key, createdAt: Date.now() };
    await this.ddbDoc.put({ TableName: this.tableName, Item: item });
  }

  async putMany(items: { key: K; value: V }[]): Promise<void> {
    const batchSize = 25;
    const batches = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batchItems = items.slice(i, i + batchSize);
      const putRequests = batchItems.map((item) => ({
        PutRequest: { Item: { ...item.key, ...item.value } },
      }));

      const input: BatchWriteCommandInput = { RequestItems: { [this.tableName]: putRequests } };

      batches.push(this.ddbDoc.batchWrite(input));
    }

    await Promise.all(batches);
  }

  async get(key: K): Promise<V> {
    const response = await this.ddbDoc.get({
      TableName: this.tableName,
      Key: key,
    });
    if (response.Item) return response.Item as V;
    throw new Error('Resource does not exist');
  }

  async getMany(keys: K[]): Promise<Array<V>> {
    const batchSize = 100;
    const batches = [];

    for (let i = 0; i < keys.length; i += batchSize) {
      const batchKeys = keys.slice(i, i + batchSize);
      const input: BatchGetCommandInput = {
        RequestItems: { [this.tableName]: { Keys: batchKeys } },
      };

      batches.push(this.ddbDoc.batchGet(input));
    }

    const responses = await Promise.all(batches);

    const allResults: V[] = responses.flatMap((response) =>
      response.Responses && response.Responses[this.tableName]
        ? response.Responses[this.tableName].map((item) => item as V)
        : []
    );

    return allResults;
  }

  async delete(key: K): Promise<void> {
    try {
      const conditionExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};

      Object.entries(key).forEach(([fieldName, fieldValue]) => {
        conditionExpressions.push(`attribute_exists(#${fieldName})`);
        expressionAttributeNames[`#${fieldName}`] = fieldName;
      });

      await this.ddbDoc.delete({
        TableName: this.tableName,
        Key: key,
        ConditionExpression: conditionExpressions.join(' AND '),
        ExpressionAttributeNames: expressionAttributeNames,
      });
    } catch (e) {
      console.error(e);
      if (e instanceof ConditionalCheckFailedException) throw new Error('Resource does not exist');
      throw e;
    }
  }

  async deleteMany(keys: K[]): Promise<void> {
    const batchSize = 25;
    const batches = [];

    for (let i = 0; i < keys.length; i += batchSize) {
      const batchKeys = keys.slice(i, i + batchSize);

      const writeRequests: WriteRequest[] = batchKeys.map((key) => ({
        DeleteRequest: { Key: key },
      }));

      const input: BatchWriteCommandInput = {
        RequestItems: { [this.tableName]: writeRequests },
      };

      batches.push(this.ddbDoc.batchWrite(input));
    }

    await Promise.all(batches);
  }

  async partialUpdate(key: K, fields: Partial<V>): Promise<void> {
    fields = { ...fields, updatedAt: new Date().toISOString() };

    const conditionExpressions: string[] = [];
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(fields).forEach(([fieldName, fieldValue], index) => {
      if (fieldValue === undefined) return;
      updateExpressions.push(`#${fieldName}_${index} = :${fieldName}_${index}`);
      expressionAttributeNames[`#${fieldName}_${index}`] = fieldName;
      expressionAttributeValues[`:${fieldName}_${index}`] = fieldValue;
    });

    Object.entries(key).forEach(([fieldName, fieldValue]) => {
      conditionExpressions.push(`attribute_exists(#${fieldName})`);
      expressionAttributeNames[`#${fieldName}`] = fieldName;
    });

    const input: UpdateCommandInput = {
      TableName: this.tableName,
      Key: key,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: conditionExpressions.join(' AND '),
    };
    try {
      await this.ddbDoc.update(input);
    } catch (e) {
      console.error(e);
      if (e instanceof ConditionalCheckFailedException) throw new Error('Resource does not exist');
      throw e;
    }
  }

  async partialUpdateMany(items: { key: K; fields: Partial<V> }[]): Promise<void> {
    const batchSize = 25;
    const batches = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batchItems = items.slice(i, i + batchSize);

      const transactItems = batchItems.map((item) => {
        const updateExpressions: string[] = [];
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {};

        Object.entries(item.fields).forEach(([fieldName, fieldValue], index) => {
          if (fieldValue === undefined) return;
          updateExpressions.push(`#${fieldName}_${index} = :${fieldName}_${index}`);
          expressionAttributeNames[`#${fieldName}_${index}`] = fieldName;
          expressionAttributeValues[`:${fieldName}_${index}`] = fieldValue;
        });

        const update: Update = {
          TableName: this.tableName,
          Key: item.key,
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        };

        return { Update: update };
      });

      batches.push(this.ddbDoc.transactWrite({ TransactItems: transactItems }));
    }

    await Promise.all(batches);
  }

  async query(args: QueryArguments<K, V> = {}): Promise<QueryOutput<K, V>> {
    const data = await this.queryData(args);

    while ((!args.limit || data.items.length < args.limit) && data.lastEvaluatedKey) {
      const nextArgs = { ...args, startKey: data.lastEvaluatedKey };
      const nextData = await this.queryData(nextArgs);
      data.lastEvaluatedKey = nextData.lastEvaluatedKey;
      data.items.push(...nextData.items);
    }
    if (args.limit && data.items.length > args.limit) {
      data.items = data.items.slice(0, args.limit);
      const last = data.items.at(-1);
      const index = args.index ? this.indexes[args.index] : undefined;
      data.lastEvaluatedKey = last?.value ? this.keyExtractor(last.value) : undefined;
      if (index && last?.value) {
        data.lastEvaluatedKey[index.partitionKey] = (last.value as any)[index.partitionKey];
        data.lastEvaluatedKey[index.rangeKey] = (last.value as any)[index.rangeKey];
      }
    }
    return data;
  }

  private async queryData(args: QueryArguments<K, V> = {}): Promise<QueryOutput<K, V>> {
    const { index, partition, startKey, limit, filter } = args;
    const exprs = filter
      ? DynamoDB.toExpr(filter)
      : { exprString: '', exprAttName: {}, exprAttValue: {}, lastCounter: 0 };

    const cmd = {
      TableName: this.tableName,
      FilterExpression: exprs.exprString.length > 0 ? exprs.exprString : undefined,
      ExpressionAttributeNames: Object.keys(exprs.exprAttName).length > 0 ? exprs.exprAttName : undefined,
      ExpressionAttributeValues: Object.keys(exprs.exprAttValue).length > 0 ? exprs.exprAttValue : undefined,
      Limit: limit,
      ExclusiveStartKey: startKey,
    };

    //to query over GSI
    if (index && partition && index in this.indexes) {
      const cmdQuery: QueryCommandInput = {
        ...cmd,
        IndexName: index,
        ...{
          KeyConditionExpression: `#${this.indexes[index].partitionKey} = :${this.indexes[index].partitionKey}`,
          ExpressionAttributeNames: {
            ...cmd.ExpressionAttributeNames,
            ...{ [`#${this.indexes[index].partitionKey}`]: this.indexes[index].partitionKey },
          },
          ExpressionAttributeValues: {
            ...cmd.ExpressionAttributeValues,
            ...{ [`:${this.indexes[index].partitionKey}`]: partition },
          },
        },
      };
      const response = await this.ddbDoc.query(cmdQuery);
      return {
        lastEvaluatedKey: response.LastEvaluatedKey,
        items: response.Items
          ? response.Items.map((item) => ({
              key: this.keyExtractor(item as V),
              value: item as V,
            }))
          : [],
      };
    }
    //to query over primary hashKey
    //set index as hashColumnName
    else if (partition && index) {
      const cmdQuery: QueryCommandInput = {
        ...cmd,
        ...{
          KeyConditionExpression: `#hashColumn = :partition`,
          ExpressionAttributeNames: {
            ...cmd.ExpressionAttributeNames,
            ...{ [`#hashColumn`]: index },
          },
          ExpressionAttributeValues: {
            ...cmd.ExpressionAttributeValues,
            ...{ [`:partition`]: partition },
          },
        },
      };
      const response = await this.ddbDoc.query(cmdQuery);
      return {
        lastEvaluatedKey: response.LastEvaluatedKey,
        items: response.Items
          ? response.Items.map((item) => ({
              key: this.keyExtractor(item as V),
              value: item as V,
            }))
          : [],
      };
    } else {
      const cmdScan: ScanCommandInput = { ...cmd, IndexName: index };
      const response = await this.ddbDoc.scan(cmdScan);
      return {
        lastEvaluatedKey: (response.LastEvaluatedKey as K) ?? null,
        items: response.Items
          ? response.Items.map((item) => ({
              key: item as K,
              value: item as V,
            }))
          : [],
      };
    }
  }

  public static toExpr(
    predicate: Predicate,
    counter: number = 0
  ): {
    exprString: string;
    exprAttName: Record<string, string>;
    exprAttValue: Record<string, string | number | boolean>;
    lastCounter: number;
  } {
    if (predicate.operator === 'NOT') {
      predicate as UnaryOperatorExpr;
      const rhs = this.toExpr(predicate.expr, counter);
      return {
        exprString: `(NOT ${rhs.exprString})`,
        exprAttName: rhs.exprAttName,
        exprAttValue: rhs.exprAttValue,
        lastCounter: rhs.lastCounter,
      };
    } else if (predicate.operator === 'AND' || predicate.operator === 'OR') {
      predicate as BinaryOperatorPredicate;
      return predicate.predicates.reduce(
        (lhs, pred) => {
          if (!lhs.exprString) return this.toExpr(pred, lhs.lastCounter);

          const rhs = this.toExpr(pred, lhs.lastCounter);
          return {
            exprString: `(${lhs.exprString} ${predicate.operator} ${rhs.exprString})`,
            exprAttName: { ...lhs.exprAttName, ...rhs.exprAttName },
            exprAttValue: { ...lhs.exprAttValue, ...rhs.exprAttValue },
            lastCounter: rhs.lastCounter,
          };
        },
        { exprString: '', exprAttName: {}, exprAttValue: {}, lastCounter: counter }
      );
    } else {
      predicate = predicate as BinaryOperatorExpr;
      const resp = { exprString: '', exprAttName: {}, exprAttValue: {}, lastCounter: counter };

      const lhs = this.parseValue(predicate.lhs, ++counter);
      const rhs = this.parseValue(predicate.rhs, ++counter);

      resp.exprString = `(${lhs.name} ${predicate.operator} ${rhs.name})`;
      resp.lastCounter = counter;
      if (lhs.name.startsWith('#')) resp.exprAttName = { ...resp.exprAttName, ...{ [lhs.name]: lhs.value } };
      else resp.exprAttValue = { ...resp.exprAttValue, ...{ [lhs.name]: lhs.value } };
      if (rhs.name.startsWith('#')) resp.exprAttName = { ...resp.exprAttName, ...{ [rhs.name]: rhs.value } };
      else resp.exprAttValue = { ...resp.exprAttValue, ...{ [rhs.name]: rhs.value } };

      return resp;
    }
  }

  private static parseValue(value: Value, counter: number): { name: string; value: any } {
    if (typeof value === 'string') return { name: `:val_${counter}`, value: value };
    else if (typeof value === 'number') return { name: `:val_${counter}`, value: value };
    else if (typeof value === 'boolean') return { name: `:val_${counter}`, value: value };
    else return { name: `#field_${value.name}_${counter}`, value: value.name };
  }
}
