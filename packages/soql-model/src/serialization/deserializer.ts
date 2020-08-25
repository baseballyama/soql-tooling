import { SOQLParser } from '@salesforce/soql-parser';
import { SoqlParserListener } from '@salesforce/soql-parser/lib/SoqlParserListener';
import * as Parser from '@salesforce/soql-parser/lib/SoqlParser';
import * as Soql from '../model/model';
import * as Impl from '../model/impl';
import { ParserRuleContext, Token } from 'antlr4';

export class ModelDeserializer {
  protected soqlSyntax: string;
  public constructor(soqlSyntax: string) {
    this.soqlSyntax = soqlSyntax;
  }
  public deserialize(): Soql.Query {
    return new Parse2Model(this.soqlSyntax).generateModel();
  }
}

class Parse2Model {
  protected soqlSyntax: string;
  public constructor(soqlSyntax: string) {
    this.soqlSyntax = soqlSyntax;
  }

  public generateModel(): Soql.Query {
    let query: Soql.Query | undefined;

    const parser = SOQLParser({
      isApex: true,
      isMultiCurrencyEnabled: true,
      apiVersion: 50.0,
    });
    const result = parser.parseQuery(this.soqlSyntax);
    const parseTree = result.getParseTree();
    if (parseTree) {
      const queryListener = new QueryListener();
      parseTree.enterRule(queryListener);
      query = queryListener.getQuery();
    }

    if (!query) {
      throw Error('Could not generate query model');
    }
    return query;
  }
}

class QueryListener extends SoqlParserListener {
  public query?: Soql.Query;
  public select?: Soql.Select;
  public selectExpressions: Soql.SelectExpression[] = [];
  public from?: Soql.From;
  public where?: Soql.Where;
  public with?: Soql.With;
  public groupBy?: Soql.GroupBy;
  public orderBy?: Soql.OrderBy;
  public limit?: Soql.Limit;
  public offset?: Soql.Offset;
  public bind?: Soql.Bind;
  public recordTrackingType?: Soql.RecordTrackingType;
  public update?: Soql.Update;

  public enterSoqlFromExpr(ctx: Parser.SoqlFromExprContext): void {
    const idContexts = ctx.getTypedRuleContexts(Parser.SoqlIdentifierContext);
    const hasAsClause = idContexts.length > 1;
    const sobjectName = idContexts[0].getText();
    let as: Soql.UnmodeledSyntax | undefined;
    if (hasAsClause) {
      as = ctx.AS()
        ? this.toUnmodeledSyntax(ctx.AS().getSymbol(), idContexts[1].stop)
        : this.toUnmodeledSyntax(idContexts[1].start, idContexts[1].stop);
    }
    const using = ctx.soqlUsingClause()
      ? this.toUnmodeledSyntax(
          ctx.soqlUsingClause().start,
          ctx.soqlUsingClause().stop
        )
      : undefined;
    this.from = new Impl.FromImpl(sobjectName, as, using);
  }

  public enterSoqlFromExprs(ctx: Parser.SoqlFromExprsContext): void {
    const fromExprContexts = ctx.getTypedRuleContexts(
      Parser.SoqlFromExprContext
    );
    if (!fromExprContexts || fromExprContexts.length !== 1) {
      throw Error('FROM clause is incorrectly specified');
    }
    const fromCtx = fromExprContexts[0];
    fromCtx.enterRule(this);
  }

  public enterSoqlFromClause(ctx: Parser.SoqlFromClauseContext): void {
    ctx.soqlFromExprs().enterRule(this);
  }

  public enterSoqlSelectExprs(ctx: Parser.SoqlSelectExprsContext): void {
    const exprContexts = ctx.getTypedRuleContexts(Parser.SoqlSelectExprContext);
    exprContexts.forEach((exprContext) => {
      // normally we would want to exprContext.enterRule(this) and delegate to
      // other functions but the antr4-tool's typescript definitions are not
      // perfect for listeners; workaround by type-checking
      if (exprContext instanceof Parser.SoqlSelectColumnExprContext) {
        const fieldCtx = (exprContext as Parser.SoqlSelectColumnExprContext).soqlField();
        // determine wherther field is a function reference based on presence of parentheses
        const isFunctionRef = fieldCtx.getText().includes('(');
        if (isFunctionRef) {
          this.selectExpressions.push(
            this.toUnmodeledSyntax(exprContext.stop, exprContext.stop)
          );
        } else {
          const fieldName = fieldCtx.getText();
          let alias: Soql.UnmodeledSyntax | undefined;
          const aliasCtx = (exprContext as Parser.SoqlSelectColumnExprContext).soqlAlias();
          if (aliasCtx) {
            alias = this.toUnmodeledSyntax(aliasCtx.start, aliasCtx.stop);
          }
          this.selectExpressions.push(new Impl.FieldRefImpl(fieldName, alias));
        }
      } else {
        // not a modeled case
        this.selectExpressions.push(
          this.toUnmodeledSyntax(exprContext.start, exprContext.stop)
        );
      }
    });
  }

  public enterSoqlInnerQuery(ctx: Parser.SoqlInnerQueryContext): void {
    const selectCtx = ctx.soqlSelectClause();
    if (!selectCtx) {
      throw Error('No select clause');
    }
    // normally we would want to selectCtx.enterRule(this) and delegate to
    // other functions but the antr4-tool's typescript definitions are not
    // perfect for listeners; workaround by type-checking
    if (selectCtx instanceof Parser.SoqlSelectExprsClauseContext) {
      (selectCtx as Parser.SoqlSelectExprsClauseContext)
        .soqlSelectExprs()
        .enterRule(this);
      this.select = new Impl.SelectExprsImpl(this.selectExpressions);
    } else {
      // not a modeled case
      this.select = this.toUnmodeledSyntax(selectCtx.start, selectCtx.stop);
    }
    const fromCtx = ctx.soqlFromClause();
    if (!fromCtx) {
      throw Error('No from clause');
    }
    fromCtx.enterRule(this);

    const whereCtx = ctx.soqlWhereClause();
    if (whereCtx) {
      this.where = this.toUnmodeledSyntax(whereCtx.start, whereCtx.stop);
    }
    const withCtx = ctx.soqlWithClause();
    if (withCtx) {
      this.with = this.toUnmodeledSyntax(withCtx.start, withCtx.stop);
    }
    const groupByCtx = ctx.soqlGroupByClause();
    if (groupByCtx) {
      this.groupBy = this.toUnmodeledSyntax(groupByCtx.start, groupByCtx.stop);
    }
    const orderByCtx = ctx.soqlOrderByClause();
    if (orderByCtx) {
      this.orderBy = this.toUnmodeledSyntax(orderByCtx.start, orderByCtx.stop);
    }
    const limitCtx = ctx.soqlLimitClause();
    if (limitCtx) {
      this.limit = this.toUnmodeledSyntax(limitCtx.start, limitCtx.stop);
    }
    const offsetCtx = ctx.soqlOffsetClause();
    if (offsetCtx) {
      this.offset = this.toUnmodeledSyntax(offsetCtx.start, offsetCtx.stop);
    }
    const bindCtx = ctx.soqlBindClause();
    if (bindCtx) {
      this.bind = this.toUnmodeledSyntax(bindCtx.start, bindCtx.stop);
    }
    const recordTrackingTypeCtx = ctx.soqlRecordTrackingType();
    if (recordTrackingTypeCtx) {
      this.recordTrackingType = this.toUnmodeledSyntax(
        recordTrackingTypeCtx.start,
        recordTrackingTypeCtx.stop
      );
    }
    const updateCtx = ctx.soqlUpdateStatsClause();
    if (updateCtx) {
      this.update = this.toUnmodeledSyntax(updateCtx.start, updateCtx.stop);
    }
  }

  public enterSoqlQuery(ctx: Parser.SoqlQueryContext): void {
    const innerCtx = ctx.soqlInnerQuery();
    innerCtx.enterRule(this);
    if (this.select && this.from) {
      this.query = new Impl.QueryImpl(
        this.select,
        this.from,
        this.where,
        this.with,
        this.groupBy,
        this.orderBy,
        this.limit,
        this.offset,
        this.bind,
        this.recordTrackingType,
        this.update
      );
    }
  }

  public getQuery(): Soql.Query | undefined {
    return this.query;
  }

  public toUnmodeledSyntax(start: Token, stop: Token): Soql.UnmodeledSyntax {
    const text = start.getInputStream().getText(start.start, stop.stop);
    return new Impl.UnmodeledSyntaxImpl(text);
  }
}
