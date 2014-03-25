import { create } from "ember-metal/platform";
import merge from "ember-metal/merge";
import run from "ember-metal/run_loop";
var MetalView = requireModule('ember-metal-views');

export function cloneStates(from) {
  var into = {};

  into._default = {};
  into.preRender = create(into._default);
  into.destroying = create(into._default);
  into.inBuffer = create(into._default);
  into.hasElement = create(into._default);
  into.inDOM = create(into.hasElement);

  for (var stateName in from) {
    if (!from.hasOwnProperty(stateName)) { continue; }
    merge(into[stateName], from[stateName]);
  }

  return into;
}

/*
export var states = {
  _default: _default,
  preRender: preRender,
  inDOM: inDOM,
  inBuffer: inBuffer,
  hasElement: hasElement,
  destroying: destroying
};
*/
var states = {
  _default: {
    destroyElement: function(view) {
      MetalView.remove(view);
      if (view._scheduledInsert) {
        run.cancel(view._scheduledInsert);
        view._scheduledInsert = null;
      }
      view.transitionTo('preRender');
      return view;
    }
  }
};

states.preRender = merge({
  getElement: function() { return null; },

  insertElement: function(view, callback) {
    view.createElement();
    callback.call(view);

    var element = view.element;
    if (document.body.contains(element)) {
      view.transitionTo('inDOM');
      // view.trigger('didInsertElement');
    }
  },

  appendChild: function(view, childView) {
    MetalView.appendChild(view, childView);
  },
  setElement: function(view, value) {
    if (value !== null) {
      view.transitionTo('hasElement');
    }
    return value;
  },
  empty: function(view) {
    MetalView.remove(view);
  },
  $: function() {},
  rerender: Ember.K
}, states._default);

states.hasElement = merge({
  $: function(view, sel) {
    var elem = view.element;
    return sel ? jQuery(sel, elem) : jQuery(elem);
  },
  setElement: function(view, value) {
    if (value !== null) {
      view.transitionTo('hasElement');
    }
    return value;
  },
  getElement: function(view) {
    return view.element;
  },
  insertElement: function(view, callback) {
    if (!view.element) { view.createElement(); }
    callback.call(view);
  },
  empty: states.preRender.empty,
  appendChild: states.preRender.appendChild,
  rerender: Ember.K
}, states._default);

states.inDOM = merge({
  $: states.hasElement.$,
  insertElement: states.hasElement.insertElement,
  empty: states.hasElement.empty,
  appendChild: states.hasElement.appendChild,
  rerender: Ember.K
}, states._default);

states.destroying = merge({
  rerender: function() {
    var destroyingError = "You can't call %@ on a view being destroyed", fmt = Ember.String.fmt;
    throw fmt(destroyingError, ['rerender']);
  }
}, states._default);

export {cloneStates, states};
