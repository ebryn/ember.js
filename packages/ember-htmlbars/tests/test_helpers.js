import { compile, defaultOptions } from "ember-htmlbars";
import { merge } from "ember-metal/utils";
import { appendTo } from "ember-metal-htmlbars/tests/test_helpers";

function templateOptionsWithHelper(name, fn) {
  var templateOptions = merge({}, defaultOptions);
  var helpers = templateOptions.helpers = merge({}, templateOptions.helpers);
  helpers.name = fn;
  return templateOptions;
}

export { compile, templateOptionsWithHelper, appendTo };