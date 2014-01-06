module("Ember.HTMLBars");

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));
  equal(div.innerHTML, html);
}

test("it works", function() {
  var template = Ember.HTMLBars.compile("ohai");
  equalHTML(template(), "ohai");
});

test("basic binding", function() {
  var template = Ember.HTMLBars.compile("{{foo}}"),
      obj = {foo: "foo is here"},
      fragment = template(obj);

  equalHTML(fragment, "foo is here");

  Ember.set(obj, 'foo', 'foo is still here');
  equalHTML(fragment, "foo is still here");
});