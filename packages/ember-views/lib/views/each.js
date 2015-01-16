import Ember from "ember-metal/core";
import { fmt } from "ember-runtime/system/string";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import CollectionView from "ember-views/views/collection_view";
import { Binding } from "ember-metal/binding";
import ControllerMixin from "ember-runtime/mixins/controller";
import ArrayController from "ember-runtime/controllers/array_controller";
import EmberArray from "ember-runtime/mixins/array";

import {
  addObserver,
  removeObserver,
  addBeforeObserver,
  removeBeforeObserver
} from "ember-metal/observer";

import {
  default as _MetamorphView,
  _Metamorph
} from "ember-views/views/metamorph_view";
import { ViewKeywordSupport, ViewStreamSupport, ViewContextSupport, ViewChildViewsSupport, TemplateRenderingSupport } from "ember-views/views/view";
import Evented from "ember-runtime/mixins/evented";
import { IS_BINDING } from "ember-metal/mixin";
import { bind } from "ember-metal/binding";
import { defineProperty } from "ember-metal/properties";
import { computed } from "ember-metal/computed";
import { meta as metaFor } from "ember-metal/utils";

function noop() {}

// Reminder: avoid reading off of `this` while instantiating
function DefaultEachItemView(attrs) {
  var meta = this.__ember_meta__ = metaFor(this);
  var proto = meta.proto;
  meta.proto = this;
  this.isView = true;
  this.tagName = '';
  this.isVirtual = true;

  var bindings;

  for (var key in attrs) {
    if (!attrs.hasOwnProperty(key)) { continue; }
    if (IS_BINDING.test(key)) {
      if (!bindings) { bindings = []; }
      bindings.push(key);
    }
    // this[key] = attrs[key];
    // this might need to be:
    set(this, key, attrs[key]);
  }

  for (var i = 0, l = (bindings && bindings.length || 0); i < l; i++) {
    bind(this, bindings[i].slice(0, -7), attrs[bindings[i]]);
  }

  this.init();
  meta.proto = proto;
}

DefaultEachItemView.isClass = true;
DefaultEachItemView.isMethod = false;
DefaultEachItemView.isViewClass = true;

DefaultEachItemView.prototype = {
  // TODO: remove this
  currentState: {
    appendChild: function(view, childView, options) {
      var buffer = view.buffer;
      var _childViews = view._childViews;

      childView = view.createChildView(childView, options);
      if (!_childViews.length) { _childViews = view._childViews = _childViews.slice(); }
      _childViews.push(childView);

      if (!childView._morph) {
        buffer.pushChildView(childView);
      }

      view.propertyDidChange('childViews');

      return childView;
    },

    invokeObserver: function(target, observer) {
      observer.call(target);
    }
  },

  propertyDidChange: noop,

  _wrapAsScheduled: Ember.View.proto()._wrapAsScheduled,

  remove: Ember.View.proto().remove,

  destroy: function() {
    // TODO: EmberObject#destroy stuff?

    if (!this.removedFromDOM && this._renderer) {
      this._renderer.remove(this, true);
    }

    // remove from parent if found. Don't call removeFromParent,
    // as removeFromParent will try to remove the element from
    // the DOM again.
    var parent = this._parentView;
    if (parent) { parent.removeChild(this); }

    this._transitionTo('destroying', false);

    return this;
  },

  destroyElement: function() {
    var state = this._state;
    if (state === 'destroying') {
      throw 'destroyElement'; // TODO
    }
    if (this._renderer) {
      this._renderer.remove(this, false);
    }
    return this;
  },

  _transitionTo: function(state) {
    this._state = state;
  }
};

DefaultEachItemView.prototype.__ember_meta__ = metaFor(DefaultEachItemView.prototype);
DefaultEachItemView.prototype.__ember_meta__.proto = DefaultEachItemView.prototype;

ViewKeywordSupport.apply(DefaultEachItemView.prototype);
ViewStreamSupport.apply(DefaultEachItemView.prototype);
ViewChildViewsSupport.apply(DefaultEachItemView.prototype);
ViewContextSupport.apply(DefaultEachItemView.prototype);
TemplateRenderingSupport.apply(DefaultEachItemView.prototype);
Evented.apply(DefaultEachItemView.prototype);

defineProperty(DefaultEachItemView.prototype, 'parentView', computed('_parentView', function() {
  var parent = this._parentView;

  if (parent && parent.isVirtual) {
    return get(parent, 'parentView');
  } else {
    return parent;
  }
}));

DefaultEachItemView.create = function(attrs) {
  return new DefaultEachItemView(attrs);
};

window.DefaultEachItemView = DefaultEachItemView;

export default CollectionView.extend(_Metamorph, {

  init: function() {
    var itemController = get(this, 'itemController');
    var binding;

    if (itemController) {
      var controller = get(this, 'controller.container').lookupFactory('controller:array').create({
        _isVirtual: true,
        parentController: get(this, 'controller'),
        itemController: itemController,
        target: get(this, 'controller'),
        _eachView: this
      });

      this.disableContentObservers(function() {
        set(this, 'content', controller);
        binding = new Binding('content', '_eachView.dataSource').oneWay();
        binding.connect(controller);
      });

      set(this, '_arrayController', controller);
    } else {
      this.disableContentObservers(function() {
        binding = new Binding('content', 'dataSource').oneWay();
        binding.connect(this);
      });
    }

    return this._super();
  },

  _assertArrayLike: function(content) {
    Ember.assert(fmt("The value that #each loops over must be an Array. You " +
                     "passed %@, but it should have been an ArrayController",
                     [content.constructor]),
                     !ControllerMixin.detect(content) ||
                       (content && content.isGenerated) ||
                       content instanceof ArrayController);
    Ember.assert(fmt("The value that #each loops over must be an Array. You passed %@",
                     [(ControllerMixin.detect(content) &&
                       content.get('model') !== undefined) ?
                       fmt("'%@' (wrapped in %@)", [content.get('model'), content]) : content]),
                     EmberArray.detect(content));
  },

  disableContentObservers: function(callback) {
    removeBeforeObserver(this, 'content', null, '_contentWillChange');
    removeObserver(this, 'content', null, '_contentDidChange');

    callback.call(this);

    addBeforeObserver(this, 'content', null, '_contentWillChange');
    addObserver(this, 'content', null, '_contentDidChange');
  },

  itemViewClass: DefaultEachItemView,
  emptyViewClass: _MetamorphView,

  createChildView: function(_view, attrs) {
    var view = this._super(_view, attrs);

    var content = get(view, 'content');
    var keyword = get(this, 'keyword');

    if (keyword) {
      view._keywords[keyword] = content;
    }

    // If {{#each}} is looping over an array of controllers,
    // point each child view at their respective controller.
    if (content && content.isController) {
      set(view, 'controller', content);
    }

    return view;
  },

  destroy: function() {
    if (!this._super()) { return; }

    var arrayController = get(this, '_arrayController');

    if (arrayController) {
      arrayController.destroy();
    }

    return this;
  }
});
