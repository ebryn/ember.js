/*globals Node */

var View = requireModule('ember-metal-views');

export { View }

export function testsFor(name) {
  module(name, {
    setup: function() {
      $('#qunit-fixture').innerHTML = '';
    },
    teardown: function() {
      View.reset();
    }
  });
}

export function $(selector) {
  if (selector instanceof Node) { return selector; }
  return document.querySelector(selector);
}

export function equalHTML(selector, expectedHTML, message) {
  var actualHTML = $(selector).innerHTML.replace(/ id="[^"]+"/gmi, '');
  equal(actualHTML, expectedHTML, message || "HTML matches");
}

export function set(obj, key, value) {
  Ember.run(Ember, Ember.set, obj, key, value);
}

export function triggerEvent(el, name, data) {
  // var event = new Event(name);
  // el.dispatchEvent(event);
  var isKeyboardEvent = /key/.test(name);
  var event = document.createEvent('Event'); // (isKeyboardEvent ? 'KeyboardEvent' : 'Event');
  event.initEvent(name, true, true);
  if (isKeyboardEvent && data) { event.keyCode = event.which = data.keyCode; }
  // TODO: figure this out
  // if (isKeyboardEvent) {
  //   event.initKeyboardEvent(name, true, true, null, data.keyCode, DOM_KEY_LOCATION_STANDARD);
  // } else {
  //   event.initEvent(name, true, true);
  // }
  el.dispatchEvent(event);
}
