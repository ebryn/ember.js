// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-views/views/states/default');

Ember.View.states.preRender = {
  parentState: Ember.View.states._default,

  // a view leaves the preRender state once its element has been
  // created (createElement).
  insertElement: function(view, fn) {
    view.createElement();
    view._notifyWillInsertElement();
    // after createElement, the view will be in the hasElement state.
    fn.call(view);
    view.transitionTo('inDOM');
    view._notifyDidInsertElement();
  },

  renderToBufferIfNeeded: function(view) {
    return view.renderToBuffer();
  },

  empty: Ember.K,

  setElement: function(view, value) {
    if (value !== null) {
      view.transitionTo('hasElement');
    }
    return value;
  }
};
