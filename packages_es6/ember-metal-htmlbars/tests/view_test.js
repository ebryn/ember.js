import { compile, View, $, equalHTML, set, defaultOptions } from "ember-metal-htmlbars/tests/test_helpers";

module("ember-metal-htmlbars/helpers/view");

test("it works", function() {
  var view = {isView: true, classNames: 'ember-view', template: compile("{{#view class='ember-view'}} {{foo}}{{/view}}"), templateOptions: defaultOptions};
  var context = {foo: 'foo is here'};
  Ember.set(view, 'context', context);

  var el = View.render(view);
  equalHTML(el, '<div class="ember-view"><div class="ember-view"> foo is here</div></div>');

  Ember.set(context, 'foo', 'i pity the foo');
  equalHTML(el, '<div class="ember-view"><div class="ember-view"> i pity the foo</div></div>');
});