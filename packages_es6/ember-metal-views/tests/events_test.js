import { testsFor, View, $, equalHTML, triggerEvent } from "ember-metal-views/tests/test_helpers";

testsFor("ember-metal-views - events");

test("simple click handler", function() {
  expect(2);

  var view = {
    isView: true,

    click: function() {
      ok(true, "Click handler was called");
    }
  };

  View.appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', '<div></div>');

  triggerEvent(view.element, 'click');
});