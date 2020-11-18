/*
 *  Copyright (c) 2020, salesforce.com, inc.
 *  All rights reserved.
 *  Licensed under the BSD 3-Clause license.
 *  For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 *
 */
import { List, Map } from 'immutable';
import { JsonMap } from '@salesforce/ts-types';

export enum ModelProps {
  SOBJECT = 'sObject',
  FIELDS = 'fields',
  ORDER_BY = 'orderBy',
  LIMIT = 'limit',
  WHERE = 'where',
  ERRORS = 'errors',
  UNSUPPORTED = 'unsupported',
  ORIGINAL_SOQL_STATEMENT = 'originalSoqlStatement'
}

// This is to satisfy TS and stay dry
export type IMap = Map<string, string | List<string>>;
// Private immutable interface
export interface ToolingModel extends IMap {
  sObject: string;
  fields: List<string>;
  orderBy: List<Map>;
  limit: string;
  where: List<Map>;
  errors: List<Map>;
  unsupported: string[];
}
// Public inteface for accessing modelService.query
export interface ToolingModelJson extends JsonMap {
  sObject: string;
  fields: string[];
  orderBy: JsonMap[];
  limit: string;
  where: JsonMap[];
  errors: JsonMap[];
  unsupported: string[];
  originalSoqlStatement: string;
}