/*globals Handlebars */

import ComponentLookup from "ember-htmlbars/component_lookup";
import jQuery from "ember-views/system/jquery";
import EmberError from "ember-metal/error";
import {onLoad} from "ember-runtime/system/lazy_load";
import {compile} from "ember-metal-htmlbars";
import EmberHandlebars from "ember-htmlbars-compiler";

/**
@module ember
@submodule ember-htmlbars
*/

/**
  Find templates stored in the head tag as script tags and make them available
  to `Ember.CoreView` in the global `Ember.TEMPLATES` object. This will be run
  as as jQuery DOM-ready callback.

  Script tags with `text/x-handlebars` will be compiled
  with Ember's Handlebars and are suitable for use as a view's template.
  Those with type `text/x-raw-handlebars` will be compiled with regular
  Handlebars and are suitable for use in views' computed properties.

  @private
  @method bootstrap
  @for Ember.Handlebars
  @static
  @param ctx
*/
function bootstrap(ctx) {
  var selectors = 'script[type="text/x-handlebars"], script[type="text/x-raw-handlebars"]';

  jQuery(selectors, ctx)
    .each(function() {
    // Get a reference to the script tag
    var script = jQuery(this);

    var compileFn = (script.attr('type') === 'text/x-raw-handlebars') ?
                  jQuery.proxy(Handlebars.compile, Handlebars) :
                  compile,
      // Get the name of the script, used by Ember.View's templateName property.
      // First look for data-template-name attribute, then fall back to its
      // id if no name is found.
      templateName = script.attr('data-template-name') || script.attr('id') || 'application',
      template = compileFn(script.html());

    // Check if template of same name already exists
    if (Ember.TEMPLATES[templateName] !== undefined) {
      throw new EmberError('Template named "' + templateName  + '" already exists.');
    }

    // For templates which have a name, we save them and then remove them from the DOM
    Ember.TEMPLATES[templateName] = template;

    // Remove script tag from DOM
    script.remove();
  });
};

function _bootstrap() {
  bootstrap( jQuery(document) );
}

function registerComponentLookup(container) {
  container.register('component-lookup:main', ComponentLookup);
}

/*
  We tie this to application.load to ensure that we've at least
  attempted to bootstrap at the point that the application is loaded.

  We also tie this to document ready since we're guaranteed that all
  the inline templates are present at this point.

  There's no harm to running this twice, since we remove the templates
  from the DOM after processing.
*/

onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: 'domTemplates',
    initialize: _bootstrap
  });

  Application.initializer({
    name: 'registerComponentLookup',
    after: 'domTemplates',
    initialize: registerComponentLookup
  });
});

export default bootstrap;
