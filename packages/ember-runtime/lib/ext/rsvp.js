/* globals RSVP:true */

import Ember from "ember-metal/core";
import Logger from "ember-metal/logger";

module RSVP from "rsvp";
//import Test from 'ember-testing/test';

export function onerrorDefault(error) {
  if (error instanceof Error) {
    if (Ember.testing) {
      // ES6TODO: remove when possible
      if (!Test && Ember.__loader.registry[testModuleName]) {
        Test = requireModule(testModuleName)['default'];
      }

      if (Test && Test.adapter) {
        Test.adapter.exception(error);
      } else {
        throw error;
      }
    } else if (Ember.onerror) {
      Ember.onerror(error);
    } else {
      Logger.error(error.stack);
      Ember.assert(error, false);
    }
  }
}

RSVP.on('error', onerrorDefault);

export default RSVP;
