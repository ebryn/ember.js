import { testsFor, View, $, equalHTML, triggerEvent } from "ember-metal-views/tests/test_helpers";

testsFor("ember-metal-views - events");

test("click", function() {
  var clicks = 0;
  var view = {
    isView: true,
    innerHTML: '<div><span>click me too</span></div>',

    click: function() {
      clicks++;
    }
  };

  View.appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', '<div><div><span>click me too</span></div></div>');

  triggerEvent(view.element, 'click');
  equal(clicks, 1, "Click handler was called");
  triggerEvent(view.element.querySelector('span'), 'click');
  equal(clicks, 2, "Click handler was called twice");
});