import { testsFor, View, $, equalHTML } from "ember-metal-views/tests/test_helpers";

testsFor("ember-metal-views - children");

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
      equalHTML(el.parentElement, "<ul><li>ohai</li></ul>", "Children are rendered");
    }
  };

  Ember.run(function() {
    View.appendTo(view, '#qunit-fixture');
  });
  equalHTML('#qunit-fixture', "<ul><li>ohai</li></ul>");
});