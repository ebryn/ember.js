import { View, $, set } from "ember-metal-views/tests/test_helpers";

module("ember-metal-views - context-related tests");

test("basics", function() {
  var view = {
    isView: true,
    childViews: [
      {isView: true}
    ]
  };

  var context = {foo: 'foo is here'};
  set(view, 'context', context);

  View.render(view);
  var childView = view.childViews[0];
  equal(context, childView.context, "The parent view's context was set on the child");

  context = {foo: 'no need to pity me sucka'};
  set(view, 'context', context);
  equal(context, childView.context, "Changing a parent view's context propagates it to the child");
});

test("the shared observer for views' context doesn't leak", function() {
  expect(3);

  var context2 = {};
  var view1 = {isView: true, context: {}};
  var view2 = {isView: true, context: context2};

  View.render(view1);
  View.render(view2);

  Ember.addObserver(view1, 'context', null, function() {
    ok(true, "Observer fires for view1");
  });

  Ember.addObserver(view2, 'context', null, function() {
    ok(false, "Observer doesn't fire for view2");
  });

  var newContext = {};
  set(view1, 'context', newContext);
  equal(view1.context, newContext, "The new context was set properly");
  equal(view2.context, context2, "The new context didn't leak over to the other view");


});