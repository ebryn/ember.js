import { appendChild } from "ember-metal-views";

export function view(params, options) {
  var hash = options.hash;
  if (hash.class) { hash.classNames = hash.class.split(' '); }
  if (hash.id) { hash.elementId = hash.id; }

  var val, stream;
  for (var key in hash) {
    val = hash[key];
    if (val && val.isLazyValue) {
      stream = val;
      // generate CP wrapper
      hash[key] = Ember.computed(function(key, value) {
        if (arguments.length > 1) {
          if (stream.setValue) {
            return stream.setValue(value);
          }
        }
        return stream.value();
      }).property();
    }
  }

  hash.template = options.render;
  hash._placeholder = options.placeholder;
  hash.templateOptions = {data: options.data, helpers: options.helpers};

  var viewClassOrName = params[0];
  if (!viewClassOrName) {
    hash.isView = true;
    var childView = appendChild(options.data.view, hash);
  } else {
    var childView = appendChild(options.data.view, viewClassOrName, hash);
  }
};