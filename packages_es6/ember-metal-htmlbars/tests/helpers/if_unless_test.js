/*
module("Ember.HTMLBars.helpers.if");

var View = Ember.HTMLBars.View,
    defaultOptions = View.DEFAULT_TEMPLATE_OPTIONS;

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));
  equal(div.innerHTML, html);
}

test("it works", function() {
  var template = Ember.HTMLBars.compile("{{#if foo}}foo{{else}}bar{{/if}}"),
      view = View.create({
        template: template,
        context: {foo: true}
      });

  Em.run(view, view.render);

  equal(view.element.innerHTML, "foo");

  Ember.run(Ember, Ember.set, view.context, 'foo', false);
  equal(view.element.innerHTML, "bar");
});
*/