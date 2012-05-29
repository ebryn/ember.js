require('ember-handlebars/ext');

var get = Ember.get, set = Ember.set;

var EmberHandlebars = Ember.Handlebars;
var GroupHelper = EmberHandlebars.GroupHelper = {};

EmberHandlebars.GroupView = Ember.View.extend(Ember._Metamorph);

GroupHelper.helper = function(thisContext, options) {
  var data = options.data,
      fn   = options.fn,
      view = data.view;

  var groupView = EmberHandlebars.GroupView.create({
    _context: get(view, '_context'),
    template: function(context, options) {
      options.data.insideGroup = true;
      return fn(context, options);
    }
  });

  view.appendChild(groupView);
};

EmberHandlebars.registerHelper('group', function(options) {
  EmberHandlebars.GroupHelper.helper(this, options);
});
