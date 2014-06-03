import { set } from "ember-metal/property_set";
import { appendChild } from "ember-metal-views";

function withHelper(params, options) {
  var contextStream = params[0],
      newContext = contextStream.value(),
      parentView = options.data.view,
      virtualView = {
        isView: true,
        isVirtual: true,
        context: newContext,
        template: options.render,
        templateOptions: {data: options.data, helpers: options.helpers},
        _placeholder: options.placeholder
      };

  contextStream.onNotify(function(lazyValue) {
    set(virtualView, 'context', lazyValue.value());
  });

  appendChild(parentView, virtualView);
}

export default withHelper;