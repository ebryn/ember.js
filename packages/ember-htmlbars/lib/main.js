import { content, element, subexpr, lookupHelper } from "ember-htmlbars/hooks";
import { DOMHelper } from "morph";
import Stream from "ember-metal/streams/stream";

import { bindHelper } from "ember-htmlbars/helpers";
import { viewHelper } from "ember-htmlbars/helpers/view";

export var defaultEnv = {
  dom: new DOMHelper(),

  hooks: {
    content: content,
    element: element,
    subexpr: subexpr,
    lookupHelper: lookupHelper
  },

  helpers: {
    bindHelper: bindHelper,
    view: viewHelper
  }
};

