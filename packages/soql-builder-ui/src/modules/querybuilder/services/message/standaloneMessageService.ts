/*
 *  Copyright (c) 2020, salesforce.com, inc.
 *  All rights reserved.
 *  Licensed under the BSD 3-Clause license.
 *  For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 *
 */

import { IMessageService, SoqlEditorEvent } from './iMessageService';
import { JsonMap } from '@salesforce/ts-types';
import { getLocalStorage } from '../globals';
import { BehaviorSubject } from 'rxjs';

export class StandaloneMessageService implements IMessageService {
  public message: BehaviorSubject<SoqlEditorEvent>;
  public localStorage;
  constructor() {
    this.localStorage = getLocalStorage();
    this.message = new BehaviorSubject(undefined);
  }
  public sendMessage(query: JsonMap) {
    this.localStorage.setItem('query', JSON.stringify(query));
  }
  public getState(): JsonMap {
    let state = this.localStorage.getItem('query');
    try {
      return JSON.parse(state);
    } catch (e) {
      this.localStorage.clear('query');
      console.log('state can not be parsed');
    }
    return state;
  }

  public setState(state: JsonMap) {
    this.localStorage.setItem('query', JSON.stringify(state));
  }
}
