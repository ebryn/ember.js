/*globals Node, DocumentFragment */

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
  if (selector instanceof Node || selector instanceof DocumentFragment) { return selector; }
  return document.querySelector(selector);
}

function innerHTMLForFragment(frag) {
  var html = '', node;
  for (var i = 0, l = frag.childNodes.length; i < l; i++) {
    node = frag.childNodes[i];
    html += node.outerHTML || node.nodeValue;
  }
  return html;
}

export function equalHTML(selector, expectedHTML, message) {
  var actualHTML;
  if (selector instanceof DocumentFragment) {
    actualHTML = innerHTMLForFragment(selector);
  } else {
    actualHTML = $(selector).outerHTML;
  }
  actualHTML = actualHTML.replace(/ id="[^"]+"/gmi, '');
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
