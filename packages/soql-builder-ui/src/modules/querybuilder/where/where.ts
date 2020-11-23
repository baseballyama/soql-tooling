/*
 *  Copyright (c) 2020, salesforce.com, inc.
 *  All rights reserved.
 *  Licensed under the BSD 3-Clause license.
 *  For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 *
 */

import { api, LightningElement } from 'lwc';
import { JsonMap } from '@salesforce/ts-types';

export default class Where extends LightningElement {
  @api whereFields: string[];
  @api whereExpr: JsonMap;
  _conditionsRendered;
  _andOr;
  // _local_list of where clauses to render
  // API is different than whats rendered
  // add a phantom where group to render, only until the criteria is filled out
  renderedCallback() {
    console.log('WEHRE CMP, where exprs: ', this.whereExpr);
    this._conditionsRendered = this.whereExpr.conditions;
    this._andOr = this.whereExpr.andOr;
    console.log('condisRednered', this._conditionsRendered);
  }

  handleModGroupSelection(e) {
    const whereSelectionEvent = new CustomEvent('whereselection', {
      detail: e.detail
    });
    this.dispatchEvent(whereSelectionEvent);
  }
}
