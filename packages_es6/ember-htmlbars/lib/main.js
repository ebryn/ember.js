import EmberHandlebars from "ember-htmlbars-compiler";
import Ember from "ember-metal/core"; // to add to globals

import {runLoadHooks} from "ember-runtime/system/lazy_load";
import bootstrap from "ember-htmlbars/loader";

import {normalizePath, template, makeBoundHelper, registerBoundHelper,
    resolveHash, resolveParams, getEscaped, handlebarsGet, evaluateUnboundHelper,
    helperMissingHelper, blockHelperMissingHelper
} from "ember-htmlbars/ext";


import "ember-htmlbars/string"; // side effect of extending StringUtils

import resolvePaths from "ember-htmlbars/helpers/shared";
import {bind, _triageMustacheHelper, resolveHelper, bindHelper, boundIfHelper, unboundIfHelper, withHelper, ifHelper, unlessHelper, bindClasses} from "ember-htmlbars/helpers/binding";

import collectionHelper from "ember-htmlbars/helpers/collection";
import {ViewHelper, viewHelper} from "ember-htmlbars/helpers/view";
import unboundHelper from "ember-htmlbars/helpers/unbound";
import {logHelper, debuggerHelper} from "ember-htmlbars/helpers/debug";
import {EachView, GroupedEach, eachHelper} from "ember-htmlbars/helpers/each";

// import templateHelper from "ember-htmlbars/helpers/template";
// import partialHelper from "ember-htmlbars/helpers/partial";
import yieldHelper from "ember-htmlbars/helpers/yield";
import locHelper from "ember-htmlbars/helpers/loc";


import Checkbox from "ember-htmlbars/controls/checkbox";
import {Select, SelectOption, SelectOptgroup} from "ember-htmlbars/controls/select";
import TextArea from "ember-htmlbars/controls/text_area";
import TextField from "ember-htmlbars/controls/text_field";
import TextSupport from "ember-htmlbars/controls/text_support";
import TextSupport from "ember-htmlbars/controls/text_support";
import {inputHelper, textareaHelper} from "ember-htmlbars/controls"


import ComponentLookup from "ember-htmlbars/component_lookup";
import {_HandlebarsBoundView, SimpleHandlebarsView} from "ember-htmlbars/views/handlebars_bound_view";
import {_SimpleMetamorphView, _MetamorphView, _Metamorph} from "ember-htmlbars/views/metamorph_view";

/**
Ember Handlebars

@module ember
@submodule ember-htmlbars
@requires ember-views
*/

// Ember.Handlebars.Globals
EmberHandlebars.bootstrap = bootstrap;
EmberHandlebars.template = template;
EmberHandlebars.makeBoundHelper = makeBoundHelper;
EmberHandlebars.registerBoundHelper = registerBoundHelper;
EmberHandlebars.resolveHash = resolveHash;
EmberHandlebars.resolveParams = resolveParams;
EmberHandlebars.resolveHelper = resolveHelper;
EmberHandlebars.get = handlebarsGet;
EmberHandlebars.getEscaped = getEscaped;
EmberHandlebars.evaluateUnboundHelper = evaluateUnboundHelper;
EmberHandlebars.bind = bind;
EmberHandlebars.bindClasses = bindClasses;
EmberHandlebars.EachView = EachView;
EmberHandlebars.GroupedEach = GroupedEach;
EmberHandlebars.resolvePaths = resolvePaths;
EmberHandlebars.ViewHelper = ViewHelper;
EmberHandlebars.normalizePath = normalizePath;


// Ember Globals
Ember.Handlebars = EmberHandlebars;
Ember.ComponentLookup = ComponentLookup;
Ember._SimpleHandlebarsView = SimpleHandlebarsView;
Ember._HandlebarsBoundView = _HandlebarsBoundView;
Ember._SimpleMetamorphView = _SimpleMetamorphView;
Ember._MetamorphView = _MetamorphView;
Ember._Metamorph = _Metamorph;
Ember.TextSupport = TextSupport;
Ember.Checkbox = Checkbox;
Ember.Select = Select;
Ember.SelectOption = SelectOption;
Ember.SelectOptgroup = SelectOptgroup;
Ember.TextArea = TextArea;
Ember.TextField = TextField;
Ember.TextSupport = TextSupport;

// register helpers
// EmberHandlebars.registerHelper('helperMissing', helperMissingHelper);
// EmberHandlebars.registerHelper('blockHelperMissing', blockHelperMissingHelper);
// EmberHandlebars.registerHelper('bind', bindHelper);
// EmberHandlebars.registerHelper('boundIf', boundIfHelper);
// EmberHandlebars.registerHelper('_triageMustache', _triageMustacheHelper);
// EmberHandlebars.registerHelper('unboundIf', unboundIfHelper);
// EmberHandlebars.registerHelper('with', withHelper);
// EmberHandlebars.registerHelper('if', ifHelper);
// EmberHandlebars.registerHelper('unless', unlessHelper);
// EmberHandlebars.registerHelper('bind-attr', bindAttrHelper);
// EmberHandlebars.registerHelper('bindAttr', bindAttrHelperDeprecated);
// EmberHandlebars.registerHelper('collection', collectionHelper);
// EmberHandlebars.registerHelper("log", logHelper);
// EmberHandlebars.registerHelper("debugger", debuggerHelper);
// EmberHandlebars.registerHelper("each", eachHelper);
// EmberHandlebars.registerHelper("loc", locHelper);
// EmberHandlebars.registerHelper("partial", partialHelper);
// EmberHandlebars.registerHelper("template", templateHelper);
// EmberHandlebars.registerHelper("yield", yieldHelper);
// EmberHandlebars.registerHelper("view", viewHelper);
// EmberHandlebars.registerHelper("unbound", unboundHelper);
// EmberHandlebars.registerHelper("input", inputHelper);
// EmberHandlebars.registerHelper("textarea", textareaHelper);

import merge from "ember-metal/merge";
import { compile, defaultOptions } from "ember-metal-htmlbars";
import CollectionView from "ember-views";

// Copy defaultOptions from metal-htmlbars
defaultOptions = merge({}, defaultOptions);

function partialHelper(params, options) {
  var view = options.data.view,
      container = view.container,
      templateName = params[0],
      template = container.lookupFactory("template:_" + templateName);
  // if (!template) { container.lookupFactory("template:" + templateName); }
  template(view, options);
}

function bindAttrHelper(element, path, params, options, helpers) {
  debugger;
  var hash = options.hash,
      key, value, stream;

  for (key in hash) {
    stream = value = hash[key];
    if (typeof value === 'string') {
      stream = helpers.STREAM_FOR(options.data.view, value);
    }

    stream.onNotify(function(stream) {
      element.setAttribute(key, stream.value());
    });

    element.setAttribute(key, stream.value());
  }
}

// Merge in additional helpers
defaultOptions.helpers = merge({
  debugger: function() {
    debugger;
  },
  input: inputHelper,
  textarea: textareaHelper,
  boundIf: defaultOptions.helpers['if'],
  bind: function(params, options) {
    var lazyValue = options.helpers.STREAM_FOR(options.data.view, params[0]),
        placeholder = options.placeholder;

    placeholder.replace(lazyValue.value());
    lazyValue.onNotify(function(lazyValue) {
      placeholder.replace(lazyValue.value());
    });
  },
  collection: collectionHelper,
  loc: function(params, options) {
    console.log("TODO: implement loc");
  },
  partial: partialHelper,
  template: partialHelper,
  'bind-attr': bindAttrHelper,
  bindAttr: bindAttrHelper,
  outlet2: function(params, options) {
    var property = params[0] || "main",
        outletSource,
        container,
        viewName,
        viewClass,
        viewFullName;

    // if (property && property.data && property.data.isRenderData) {
    //   options = property;
    //   property = 'main';
    // }

    container = options.data.view.container;

    outletSource = options.data.view;
    while (!Ember.get(outletSource, 'template.isTop')) {
      outletSource = Ember.get(outletSource, '_parentView');
    }

    if (!options.hash) { options.hash = {}; }
    // provide controller override
    viewName = options.hash.view;

    if (viewName) {
      viewFullName = 'view:' + viewName;
      Ember.assert("Using a quoteless view parameter with {{outlet}} is not supported. Please update to quoted usage '{{outlet \"" + viewName + "\"}}.", options.hashTypes.view !== 'ID');
      Ember.assert("The view name you supplied '" + viewName + "' did not resolve to a view.", container.has(viewFullName));
    }

    var OutletView = Ember.ContainerView.extend({isVirtual: true});
    viewClass = viewName ? container.lookupFactory(viewFullName) : options.hash.viewClass || OutletView;

    Ember.set(options.data.view, 'outletSource', outletSource);
    options.hash.currentViewBinding = 'parentView.outletSource._outlets.' + property;

    return options.helpers.view([viewClass], options);
  }
  // each: eachHelper
}, defaultOptions.helpers)

// HTMLBARSTODO: do this another way - probably meta?
Ember.CoreView.reopen({
  templateOptions: defaultOptions
});

// run load hooks
runLoadHooks('Ember.Handlebars', EmberHandlebars);

export default EmberHandlebars;
export { compile, defaultOptions };