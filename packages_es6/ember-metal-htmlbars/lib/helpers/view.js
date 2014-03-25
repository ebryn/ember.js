import { get } from "ember-metal/property_get";
import { appendChild } from "ember-metal-views";
import { computed } from "ember-metal/computed";

// FIXME: duplicated in STREAM_FOR
var CONST_REGEX = /^[A-Z][^.]*\./;
var VIEW_KEYWORD_REGEX = /^view\./;

function bindingify(hash) {
  var ret = {}, key, value;
  for (key in hash) {
    value = hash[key];
    if (value && value.isLazyValue) {
      ret[key+'Binding'] = value;
    } else {
      ret[key] = value;
    }
  }
  return ret;
}

export function view(params, options) {
  var hash = bindingify(options.hash);
  if (hash.class) { hash.classNames = hash.class.split(' '); }
  if (hash.id) { hash.elementId = hash.id; }

  if (options.render) { hash.template = options.render; }
  hash._placeholder = options.placeholder;
  hash.templateOptions = {data: options.data, helpers: options.helpers};

  var viewClassOrName = params[0],
      parentView = options.data.view,
      childView;

  if (!viewClassOrName) {
    hash.isView = true;
    childView = appendChild(parentView, hash);
  } else {
    if (typeof viewClassOrName === 'string') {
      if (CONST_REGEX.test(viewClassOrName)) {
        viewClassOrName = get(null, viewClassOrName);
      } else if (VIEW_KEYWORD_REGEX.test(viewClassOrName)) {
        viewClassOrName = get(parentView, viewClassOrName.slice(5));
      } else {
        viewClassOrName = parentView.container.lookupFactory('view:' + viewClassOrName);
      }
    }
    childView = appendChild(parentView, viewClassOrName, hash);
  }
}