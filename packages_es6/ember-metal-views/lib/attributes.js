
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
  return str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase();
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

function setupClassNameBindings(view) {
  var classNameBindings = view.classNameBindings,
      className;

  if (!classNameBindings || classNameBindings.length === 0) { return; }

  for (var i = 0, l = classNameBindings.length; i < l; i++) {
    className = classNameBindings[i]; // TODO: support className aliases
    setupClassNameBinding(view, className); // FIXME: teardown
  }
}

function setupAttributeBindings(view) {
  var attributeBindings = view.attributeBindings,
      attribute;

  if (!attributeBindings || attributeBindings.length === 0) { return; }

  for (var i = 0, l = attributeBindings.length; i < l; i++) {
    attribute = attributeBindings[i]; // TODO: support attribute aliases
    setupAttribute(view, attribute); // FIXME: teardown
  }
}

function setupClassNames(view) {
  var classNames = view.classNames,
      el = view.element;

  if (typeof classNames === 'string') {
    el.setAttribute('class', classNames);
  } else if (classNames && classNames.length) {
    if (classNames.length === 1) { // PERF: avoid join'ing unnecessarily
      el.setAttribute('class', classNames[0]);
    } else {
      el.setAttribute('class', classNames.join(' ')); // TODO: faster way to do this?
    }
  }
}

export { setupClassNames, setupClassNameBindings, setupAttributeBindings };