import { ModelDeserializer } from './deserializer';

const testQueryModel = {
  select: {
    selectExpressions: [
      { fieldName: 'field1' },
      { fieldName: 'field2' },
      { fieldName: 'field3', alias: { unmodeledSyntax: 'alias3' } },
      { unmodeledSyntax: '(SELECT fieldA FROM objectA)' },
      { unmodeledSyntax: 'TYPEOF obj WHEN typeX THEN fieldX ELSE fieldY END' },
    ],
  },
  from: { sobjectName: 'object1' },
  where: { unmodeledSyntax: 'WHERE field1 = 5' },
  with: { unmodeledSyntax: 'WITH DATA CATEGORY cat__c AT val__c' },
  groupBy: { unmodeledSyntax: 'GROUP BY field1' },
  orderBy: { unmodeledSyntax: 'ORDER BY field2 DESC NULLS LAST' },
  limit: { unmodeledSyntax: 'LIMIT 20' },
  offset: { unmodeledSyntax: 'OFFSET 2' },
  bind: { unmodeledSyntax: 'BIND field1 = 5' },
  recordTrackingType: { unmodeledSyntax: 'FOR VIEW' },
  update: { unmodeledSyntax: 'UPDATE TRACKING' },
};

const fromWithUnmodeledSyntax = {
  sobjectName: 'object1',
  as: { unmodeledSyntax: 'AS objectAs' },
  using: { unmodeledSyntax: 'USING SCOPE everything' },
};

const selectCountUnmdeledSyntax = { unmodeledSyntax: 'SELECT COUNT()' };

describe('ModelDeserializer should', () => {
  it('model supported syntax as query objects', () => {
    const expected = {
      select: {
        selectExpressions: [
          testQueryModel.select.selectExpressions[0],
          testQueryModel.select.selectExpressions[1],
        ],
      },
      from: testQueryModel.from,
    };
    const actual = new ModelDeserializer(
      'SELECT field1, field2 FROM object1'
    ).deserialize();
    expect(actual).toEqual(expected);
  });

  it('model AS and USING FROM syntax as unmodeled syntax', () => {
    const expected = {
      select: {
        selectExpressions: [
          testQueryModel.select.selectExpressions[0],
          testQueryModel.select.selectExpressions[1],
        ],
      },
      from: fromWithUnmodeledSyntax,
    };
    const actual = new ModelDeserializer(
      'SELECT field1, field2 FROM object1 AS objectAs USING SCOPE everything'
    ).deserialize();
    expect(actual).toEqual(expected);
  });

  it('model inner queries, TYPEOF, and aliases in SELECT clause as unmodeled syntax', () => {
    const expected = {
      select: {
        selectExpressions: [
          testQueryModel.select.selectExpressions[0],
          testQueryModel.select.selectExpressions[1],
          testQueryModel.select.selectExpressions[2],
          testQueryModel.select.selectExpressions[3],
          testQueryModel.select.selectExpressions[4],
        ],
      },
      from: testQueryModel.from,
    };
    const actual = new ModelDeserializer(
      'SELECT field1, field2, field3 alias3, (SELECT fieldA FROM objectA), TYPEOF obj WHEN typeX THEN fieldX ELSE fieldY END FROM object1'
    ).deserialize();
    expect(actual).toEqual(expected);
  });

  it('model COUNT() in SELECT clause as unmodeled syntax', () => {
    const expected = {
      select: selectCountUnmdeledSyntax,
      from: testQueryModel.from,
    };
    const actual = new ModelDeserializer(
      'SELECT COUNT() FROM object1'
    ).deserialize();
    expect(actual).toEqual(expected);
  });

  it('model all non-SELECT and non-FROM clauses as unmodeled syntax', () => {
    const expected = testQueryModel;
    const actual = new ModelDeserializer(
      'SELECT field1, field2, field3 alias3, (SELECT fieldA FROM objectA), TYPEOF obj WHEN typeX THEN fieldX ELSE fieldY END FROM object1 ' +
        'WHERE field1 = 5 WITH DATA CATEGORY cat__c AT val__c GROUP BY field1 ORDER BY field2 DESC NULLS LAST LIMIT 20 OFFSET 2 BIND field1 = 5 FOR VIEW UPDATE TRACKING'
    ).deserialize();
    expect(actual).toEqual(expected);
  });
});
