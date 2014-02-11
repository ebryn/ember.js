require("ember-metal");

var guid = 0;

if (window.Ember) {
  // FIXME: avoid render/afterRender getting defined twice
  var queues = Ember.run.queues,
      indexOf = Ember.ArrayPolyfills.indexOf;
  queues.splice(indexOf.call(queues, 'actions')+1, 0, 'render', 'afterRender');
}

var dom = {
  querySelector: function(selector) {
    return document.querySelector(selector);
  },

  createElement: function(tagName) {
    return document.createElement(tagName);
  }
};

export function appendTo(view, selector) {
  var el = render(view);
  if (view.willInsertElement) { view.willInsertElement(el); }
  dom.querySelector(selector).appendChild(el);
  if (view.didInsertElement) { view.didInsertElement(el); }
}

function eventHandler(event) {
  try {
    views[event.target.id][event.type](event);
  } catch(ex) {
    console.log(ex);
  }
}

var eventDispatcherActive = false;
function setupEventDispatcher() {
  if (!eventDispatcherActive) {
    document.addEventListener('click', eventHandler, false);
    eventDispatcherActive = true;
  }
}

export function reset() {
  guid = 0;
  views = {};
  eventDispatcherActive = false;
  document.removeEventListener('click', eventHandler);
}

function setAttribute(key) {
  this.element.setAttribute(key, this[key]);
}

// HOOK
function setupAttribute(view, attributeKey) {
  view.element.setAttribute(attributeKey, view[attributeKey]);

  Ember.addObserver(view, attributeKey, null, function(obj, key) {
    Ember.run.scheduleOnce('render', this, setAttribute, key);
  });
}

var STRING_DECAMELIZE_REGEXP = (/([a-z\d])([A-Z])/g);
function decamelize(str) {
  return str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase()
}

var STRING_DASHERIZE_REGEXP = (/[ _]/g);
function dasherize(str) {
  return decamelize(str).replace(STRING_DASHERIZE_REGEXP,'-');
}

function changeClass(key) {
  var value = this[key],
      el = this.element,
      className = dasherize(key);

  if (value) {
    el.classList.add(className);
  } else {
    el.classList.remove(className);
  }
}

// TODO: decouple from classList
function setupClassNameBinding(view, key) {
  var value = view[key],
      className = dasherize(key);
  if (value) {
    view.element.classList.add(className);
  } else {
    view.element.classList.remove(className);
  }

  Ember.addObserver(view, key, null, function(obj, key) {
    Ember.run.scheduleOnce('render', this, changeClass, key);
  });
}

// TODO: figure out the most efficent way of changing tagName
function transclude(oldEl, newTagName) {
  var newEl = dom.createElement(newTagName);

  // TODO: attributes?
  newEl.innerHTML = oldEl.innerHTML; // FIXME: probably want to just move the childNodes over

  if (oldEl.parentElement) {
    oldEl.parentElement.insertBefore(newEl, oldEl);
    oldEl.parentElement.removeChild(oldEl);
  }

  return newEl;
}

// Hash lookup by view ID for event delegation
var views = {};

// TODO: make non-recursive
function render(view, parent) {
  var tagName = view.tagName || 'div';
  var el = view.element = view.element || dom.createElement(tagName);

  if (view.tagName && el.tagName !== view.tagName) {
    el = view.element = transclude(el, view.tagName);
  }

  var elementId = view.elementId || guid++; // FIXME: guid should be prefixed
  el.setAttribute('id', elementId);
  views[elementId] = view;

  if (parent) { parent.element.appendChild(el); }

  var classNames = view.classNames,
      classNameBindings = view.classNameBindings,
      className,
      attributeBindings = view.attributeBindings,
      attribute,
      childViews = view.childViews,
      template = view.template,
      templateOptions = {}; // TODO

  if (typeof classNames === 'string') {
    el.setAttribute('class', classNames);
  } else if (classNames && classNames.length) {
    if (classNames.length === 1) { // PERF: avoid join'ing unnecessarily
      el.setAttribute('class', classNames[0]);
    } else {
      el.setAttribute('class', classNames.join(' ')); // TODO: faster way to do this?
    }
  }

  if (classNameBindings && classNameBindings.length > 0) {
    for (var i = 0, l = classNameBindings.length; i < l; i++) {
      className = classNameBindings[i]; // TODO: support className aliases
      setupClassNameBinding(view, className); // FIXME: teardown
    }
  }

  if (attributeBindings && attributeBindings.length > 0) {
    for (var i = 0, l = attributeBindings.length; i < l; i++) {
      attribute = attributeBindings[i]; // TODO: support attribute aliases
      setupAttribute(view, attribute); // FIXME: teardown
    }
  }

  if (template) {
    el.appendChild(template(view, templateOptions));
  } else if (view.textContent) {
    el.textContent = view.textContent;
  } else if (view.innerHTML) {
    el.innerHTML = view.innerHTML;
  }

  if (childViews && childViews.length > 0) {
    for (var i = 0, l = childViews.length; i < l; i++) {
      render(childViews[i], view);
    }
  }

  setupEventDispatcher();

  return el;
}

function publicRender(view, parent) {
  var el = view.element;
  if (el && view.willInsertElement) { view.willInsertElement(el); }
  render(view, parent);
  if (el && view.didInsertElement) { view.didInsertElement(el); }
}

export { publicRender as render };