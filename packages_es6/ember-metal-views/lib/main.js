require("ember-metal");

if (window.Ember) {
  // FIXME: avoid render/afterRender getting defined twice
  var queues = Ember.run.queues,
      indexOf = Ember.ArrayPolyfills.indexOf;
  queues.splice(indexOf.call(queues, 'actions')+1, 0, 'render', 'afterRender');
}

import { querySelector, createElement } from "ember-metal-views/dom";
import { lookupView, setupView, setupEventDispatcher, reset, events } from "ember-metal-views/events";
import { setupClassNames, setupClassNameBindings, setupAttributeBindings } from "ember-metal-views/attributes";

function appendTo(view, selector) {
  var el = _render(view);
  if (view.willInsertElement) { view.willInsertElement(el); }
  querySelector(selector).appendChild(el);
  if (view.didInsertElement) { view.didInsertElement(el); }
  return el;
}

// TODO: figure out the most efficent way of changing tagName
function transclude(oldEl, newTagName) {
  var newEl = createElement(newTagName);

  // TODO: attributes?
  newEl.innerHTML = oldEl.innerHTML; // FIXME: probably want to just move the childNodes over

  if (oldEl.parentElement) {
    oldEl.parentElement.insertBefore(newEl, oldEl);
    oldEl.parentElement.removeChild(oldEl);
  }

  return newEl;
}

// TODO: make non-recursive
function _render(view, parent) {
  if (parent && !view.context) { view.context = parent.context; }

  var tagName, el;
  if (!view.isVirtual) {
    tagName = view.tagName || 'div';
    el = view.element = view.element || createElement(tagName);
  
    if (view.tagName && el.tagName !== view.tagName) {
      el = view.element = transclude(el, view.tagName);
    }

    setupView(view);

    if (parent) { parent.element.appendChild(el); }
  }

  if (!view.isVirtual) {
    el.setAttribute('id', view.elementId);
    setupClassNames(view);
    setupClassNameBindings(view);
    setupAttributeBindings(view);
  }

  var template = view.template,
      templateOptions = {}, // TODO
      i, l;

  if (template) {
    view.templateOptions.data.view = view;
    var templateFragment = template(view, view.templateOptions);
    if (!view.isVirtual) {
      el.appendChild(templateFragment);
    } else {
      el = templateFragment;
    }
    view.templateOptions.data.view = null;
  } else if (view.textContent) { // TODO: bind?
    el.textContent = view.textContent;
  } else if (view.innerHTML) { // TODO: bind?
    el.innerHTML = view.innerHTML;
  }

  _renderChildren(view);

  setupEventDispatcher();

  return el;
}

function _renderChildren(view) {
  var childViews = view.childViews;

  if (!childViews || childViews.length === 0) { return; }

  for (var i = 0, l = childViews.length; i < l; i++) {
    _render(childViews[i], view);
  }
}

function render(view, parent) {
  var el = view.element;
  if (el && view.willInsertElement) { view.willInsertElement(el); }
  el = _render(view, parent);
  if (el && view.didInsertElement) { view.didInsertElement(el); }
  return el || view.element;
}

function createChildView(view, childView, attrs) {
  var childView;

  if (typeof childView === 'function') {
    attrs = attrs || {};
    // attrs.template = attemplate;
    // attrs._context = context;
    attrs._parentView = view;
    // attrs._placeholder = placeholder;
    // container
    // template data?

    childView = childView.create(attrs);
  } else if (typeof childView === 'string') {
    var fullName = 'view:' + childView;
    var View = view.container.lookupFactory(fullName);

    // Ember.assert("Could not find view: '" + fullName + "'", !!View);
    // attrs.templateData = get(this, 'templateData');
    childView = View.create(attrs);
  } else if (typeof childView === 'object') {
    if (childView.isView && childView._parentView === view && childView.container === view.container) { return childView; }
    // Ember.assert('You must pass instance or subclass of View', view.isView);
    // attrs.container = this.container;
    // if (!get(view, 'templateData')) {
    //   attrs.templateData = get(this, 'templateData');
    // }
    // view.template = template;
    // view._context = context;
    childView._parentView = view;
    // view._placeholder = placeholder;
    // Ember.setProperties(view, attrs);
  }

  return childView;
}

function appendChild(view, childView, attrs) {
  childView = createChildView(view, childView, attrs);
  var childViews = view.childViews;
  if (!childViews) {
    childViews = view.childViews = [childView];
  } else {
    childViews.push(childView);
  }
  return childView;
}

function remove(view) {
  var el = view.element,
      placeholder = view._placeholder;

  if (el) { el.parentNode.removeChild(el); }
  if (placeholder) { placeholder.clear(); } // TODO: Implement Placeholder.destroy
}

export { reset, events, appendTo, render, createChildView, appendChild, remove }
