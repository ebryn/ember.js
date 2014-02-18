import { View } from "ember-metal-views";
import { compile } from "bound-templates";

export { compile };

import { merge } from "htmlbars/utils";
module runtime from "bound-templates/runtime";
import { STREAM_FOR } from "ember-metal-htmlbars/helpers/STREAM_FOR";
import { view } from "ember-metal-htmlbars/helpers/view";
import { each } from "ember-metal-htmlbars/helpers/each";

var defaultOptions = {
  data: {view: null},

  helpers: merge({
    STREAM_FOR: STREAM_FOR,
    view: view,
    each: each
  }, runtime)
};

export { defaultOptions };