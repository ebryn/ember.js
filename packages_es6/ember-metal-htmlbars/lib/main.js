import { View } from "ember-metal-views";
import { compile } from "bound-templates";
import { merge } from "htmlbars/utils";
module runtime from "bound-templates/runtime";
import { STREAM_FOR } from "ember-metal-htmlbars/helpers/STREAM_FOR";
import { view } from "ember-metal-htmlbars/helpers/view";
import { each } from "ember-metal-htmlbars/helpers/each";
import withHelper from "ember-metal-htmlbars/helpers/with";
import log from "ember-metal-htmlbars/helpers/log";
import unbound from "ember-metal-htmlbars/helpers/unbound";
import ifHelper from "ember-metal-htmlbars/helpers/if";
import unlessHelper from "ember-metal-htmlbars/helpers/unless";

var defaultOptions = {
  data: {view: null},

  helpers: merge({
    STREAM_FOR: STREAM_FOR,
    view: view,
    // each: each,
    'with': withHelper,
    log: log,
    unbound: unbound,
    'if': ifHelper,
    unless: unlessHelper
  }, runtime)
};

export { compile, defaultOptions };