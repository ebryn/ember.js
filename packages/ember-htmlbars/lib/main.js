import { content, element, subexpr, lookupHelper } from "bound-templates/runtime";
import LazyValue from "bound-templates/lazy-value";
import streamFor from "ember-htmlbars/hooks/streamFor";
import locHelper from "ember-htmlbars/helpers/loc";
import debuggerHelper from "ember-htmlbars/helpers/debugger";
import logHelper from "ember-htmlbars/helpers/log";
import { eachHelper } from "ember-htmlbars/helpers/each";
import collectionHelper from "ember-htmlbars/helpers/collection";
import viewHelper from "ember-htmlbars/helpers/view";

export var defaultEnv = {
  hooks: {
    content: content,
    element: element,
    subexpr: subexpr,
    lookupHelper: lookupHelper,

    streamFor: streamFor
  },

  helpers: {
    loc: locHelper,
    debugger: debuggerHelper,
    log: logHelper,
    collection: collectionHelper,
    each: eachHelper,
    view: viewHelper
  }
};