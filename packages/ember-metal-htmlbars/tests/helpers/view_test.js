import { compile, View, $, equalHTML, set, defaultOptions, appendTo } from "ember-metal-htmlbars/tests/test_helpers";

module("ember-metal-htmlbars/helpers/view");

test("it works", function() {
  var view = {
    isView: true,
    classNames: 'ember-view',
    template: compile("{{#view class='ember-view'}} {{foo}}{{/view}}"),
    templateOptions: defaultOptions
  };

  var context = {foo: 'foo is here'};
  set(view, 'context', context);

  var el = appendTo(view, '#qunit-fixture');
  equalHTML(el, '<div class="ember-view"><div class="ember-view"> foo is here</div></div>');

  set(context, 'foo', 'i pity the foo');
  equalHTML(el, '<div class="ember-view"><div class="ember-view"> i pity the foo</div></div>');

  context = {foo: 'no need to pity me sucka'};
  set(view, 'context', context);
  equalHTML(el, '<div class="ember-view"><div class="ember-view"> no need to pity me sucka</div></div>');
});