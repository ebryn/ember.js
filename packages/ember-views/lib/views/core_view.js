import Renderer from "ember-views/system/renderer";
import { DOMHelper } from "morph";

import {
  cloneStates,
  states
} from "ember-views/views/states";
import EmberObject from "ember-runtime/system/object";
import Evented from "ember-runtime/mixins/evented";
import ActionHandler from "ember-runtime/mixins/action_handler";

import { get } from "ember-metal/property_get";
import { computed } from "ember-metal/computed";

import { typeOf } from "ember-metal/utils";
import run from 'ember-metal/run_loop';

function K() { return this; }

// Normally, the renderer is injected by the container when the view is looked
// up. However, if someone creates a view without looking it up via the
// container (e.g. `Ember.View.create().append()`) then we create a fallback
// DOM renderer that is shared. In general, this path should be avoided since
// views created this way cannot run in a node environment.
var renderer;

/**
  `Ember.CoreView` is an abstract class that exists to give view-like behavior
  to both Ember's main view class `Ember.View` and other classes that don't need
  the fully functionaltiy of `Ember.View`.

  Unless you have specific needs for `CoreView`, you will use `Ember.View`
  in your applications.

  @class CoreView
  @namespace Ember
  @extends Ember.Object
  @uses Ember.Evented
  @uses Ember.ActionHandler
*/
var CoreView = EmberObject.extend(Evented, ActionHandler, {
  isView: true,
  isVirtual: false,

  _states: cloneStates(states),

  init: function() {
    this._super();
    this._state = 'preRender';
    this.currentState = this._states.preRender;
    this._isVisible = get(this, 'isVisible');

    // Fallback for legacy cases where the view was created directly
    // via `create()` instead of going through the container.
    if (!this.renderer) {
      renderer = renderer || new Renderer(new DOMHelper());
      this.renderer = renderer;
    }
  },

  /**
    If the view is currently inserted into the DOM of a parent view, this
    property will point to the parent of the view.

    @property parentView
    @type Ember.View
    @default null
  */
  parentView: computed('_parentView', function() {
    var parent = this._parentView;

    if (parent && parent.isVirtual) {
      return get(parent, 'parentView');
    } else {
      return parent;
    }
  }),

  _state: null,

  _parentView: null,

  // return the current view, not including virtual views
  concreteView: computed('parentView', function() {
    if (!this.isVirtual) {
      return this;
    } else {
      return get(this, 'parentView.concreteView');
    }
  }),

  instrumentName: 'core_view',

  instrumentDetails: function(hash) {
    hash.object = this.toString();
    hash.containerKey = this._debugContainerKey;
    hash.view = this;
  },

  /**
    Override the default event firing from `Ember.Evented` to
    also call methods with the given name.

    @method trigger
    @param name {String}
    @private
  */
  trigger: function() {
    this._super.apply(this, arguments);
    var name = arguments[0];
    var method = this[name];
    if (method) {
      var length = arguments.length;
      var args = new Array(length - 1);
      for (var i = 1; i < length; i++) {
        args[i - 1] = arguments[i];
      }
      return method.apply(this, args);
    }
  },

  has: function(name) {
    return typeOf(this[name]) === 'function' || this._super(name);
  },

  destroy: function() {
    var parent = this._parentView;

    if (!this._super()) { return; }


    // destroy the element -- this will avoid each child view destroying
    // the element over and over again...
    if (!this.removedFromDOM && this._renderer) {
      this._renderer.remove(this, true);
    }

    // remove from parent if found. Don't call removeFromParent,
    // as removeFromParent will try to remove the element from
    // the DOM again.
    if (parent) { parent.removeChild(this); }

    this._transitionTo('destroying', false);

    return this;
  },

  _wrapAsScheduled: function(fn) {
    var view = this;
    var stateCheckedFn = function() {
      view.currentState.invokeObserver(this, fn);
    };
    var scheduledFn = function() {
      run.scheduleOnce('render', this, stateCheckedFn);
    };
    return scheduledFn;
  },

  /**
    Renders the view again. This will work regardless of whether the
    view is already in the DOM or not. If the view is in the DOM, the
    rendering process will be deferred to give bindings a chance
    to synchronize.

    If children were added during the rendering process using `appendChild`,
    `rerender` will remove them, because they will be added again
    if needed by the next `render`.

    In general, if the display of your view changes, you should modify
    the DOM element directly instead of manually calling `rerender`, which can
    be slow.

    @method rerender
  */
  rerender: function() {
    return this.currentState.rerender(this);
  },

  clearRenderedChildren: K,
  _transitionTo: K,
  destroyElement: K
});

export default CoreView;
