/*globals HTMLElement */

import { testsFor, View, $, equalHTML, set } from "ember-metal-views/tests/test_helpers";

testsFor("ember-metal-views");

test("by default, view renders as a div", function() {
  var view = {isView: true};

  View.appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', "<div></div>");
});

test("tagName can be specified", function() {
  var view = {
    isView: true,
    tagName: 'span'
  };

  View.appendTo(view, '#qunit-fixture');

  equalHTML('#qunit-fixture', "<span></span>");
});

test("textContent can be specified", function() {
  var view = {
    isView: true,
    textContent: 'ohai <a>derp</a>'
  };

  View.appendTo(view, '#qunit-fixture');

  equalHTML('#qunit-fixture', "<div>ohai &lt;a&gt;derp&lt;/a&gt;</div>");
});

test("innerHTML can be specified", function() {
  var view = {
    isView: true,
    innerHTML: 'ohai <a>derp</a>'
  };

  View.appendTo(view, '#qunit-fixture');

  equalHTML('#qunit-fixture', "<div>ohai <a>derp</a></div>");
});

test("element can be specified", function() {
  var view = {
    isView: true,
    element: document.createElement('i')
  };

  View.appendTo(view, '#qunit-fixture');

  equalHTML('#qunit-fixture', "<i></i>");
});

test("willInsertElement hook", function() {
  expect(4);

  var view = {
    isView: true,

    willInsertElement: function(el) {
      ok(this.element instanceof HTMLElement, "We have an element");
      equal(this.element, el, 'The element gets passed in for convenience');
      equal(this.element.parentElement, null, "The element is parentless");
      this.element.textContent = 'you gone and done inserted that element';
    }
  };

  View.appendTo(view, '#qunit-fixture');

  equalHTML('#qunit-fixture', "<div>you gone and done inserted that element</div>");
});

test("didInsertElement hook", function() {
  expect(4);

  var view = {
    isView: true,

    didInsertElement: function(el) {
      ok(this.element instanceof HTMLElement, "We have an element");
      equal(this.element, el, 'The element gets passed in for convenience');
      equal(this.element.parentElement, $('#qunit-fixture'), "The element's parent is correct");
      this.element.textContent = 'you gone and done inserted that element';
    }
  };


  Ember.run(function() { View.appendTo(view, '#qunit-fixture'); });

  equalHTML('#qunit-fixture', "<div>you gone and done inserted that element</div>");
});

test("classNames - array", function() {
  var view = {
    isView: true,
    classNames: ['foo', 'bar'],
    textContent: 'ohai'
  };

  View.appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', '<div class="foo bar">ohai</div>');
});

test("classNames - string", function() {
  var view = {
    isView: true,
    classNames: 'foo bar',
    textContent: 'ohai'
  };

  View.appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', '<div class="foo bar">ohai</div>');
});

test("attributeBindings", function() {
  var view = {
    isView: true,
    tagName: 'a',
    attributeBindings: ['href'],
    href: '/foo',
    textContent: 'ohai'
  };

  View.appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', '<a href="/foo">ohai</a>', "Attribute was set on initial render");

  set(view, 'href', '/bar');
  equalHTML('#qunit-fixture', '<a href="/bar">ohai</a>', "Attribute updated when set");
});

test("transclusion", function() {
  var originalElement = document.createElement('foo-component');
  originalElement.textContent = 'derp';

  var view = {
    isView: true,
    tagName: 'div',
    element: originalElement
  };

  View.appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', '<div>derp</div>', "The passed in element is replaced, content is maintained");

});

test("classNameBindings", function() {
  var view = {
    isView: true,
    classNameBindings: ['isEnabled'],
    isEnabled: true
  };

  View.appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', '<div class="is-enabled"></div>');

  set(view, 'isEnabled', false);
  equalHTML('#qunit-fixture', '<div class=""></div>');
});