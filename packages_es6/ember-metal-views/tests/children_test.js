var View = requireModule('ember-metal-views'),
    $ = function(selector) { return document.querySelector(selector); },
    equalHTML = function(selector, expectedHTML) { equal($(selector).innerHTML, expectedHTML, "HTML matches"); };

module("ember-metal-views - children", {
  setup: function() {
    $('#qunit-fixture').innerHTML = '';
  }
});

test("a view can have child views", function() {
  var view = {
    isView: true,
    tagName: 'ul',
    childViews: [
      {isView: true, tagName: 'li', textContent: 'ohai'}
    ]
  };

  Ember.run(function() {
    View.appendTo(view, '#qunit-fixture');
  });
  equalHTML('#qunit-fixture', "<ul><li>ohai</li></ul>");
});

test("didInsertElement fires after children are rendered", function() {
  expect(2);

  var view = {
    isView: true,
    tagName: 'ul',
    childViews: [
      {isView: true, tagName: 'li', textContent: 'ohai'}
    ],

    didInsertElement: function(el) {
      equal(el.outerHTML, "<ul><li>ohai</li></ul>", "Children are rendered");
    }
  };

  Ember.run(function() {
    View.appendTo(view, '#qunit-fixture');
  });
  equalHTML('#qunit-fixture', "<ul><li>ohai</li></ul>");
});