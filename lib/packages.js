module.exports = {
  'container':                  {trees: null,  requirements: []},
  'ember-metal':                {trees: null,  vendorRequirements: ['backburner']},
  'ember-metal-views':          {trees: null,  vendorRequirements: ['placeholder']},
  'ember-metal-htmlbars':       {trees: null,  vendorRequirements: ['bound-templates', 'htmlbars', 'handlebars', 'simple-html-tokenizer'], requirements: ['ember-metal-views']},
  'ember-debug':                {trees: null,  requirements: ['ember-metal'], skipTests: true},
  'ember-runtime':              {trees: null,  vendorRequirements: ['rsvp'], requirements: ['container', 'ember-metal']},
  'ember-views':                {trees: null,  requirements: ['ember-runtime']},
  'ember-extension-support':    {trees: null,  requirements: ['ember-application']},
  'ember-testing':              {trees: null,  requirements: ['ember-application', 'ember-routing']},
  'ember-handlebars-compiler':  {trees: null,  requirements: ['ember-views']},
  'ember-handlebars':           {trees: null,  vendorRequirements: ['metamorph'], requirements: ['ember-views', 'ember-handlebars-compiler']},
  'ember-htmlbars-compiler':    {trees: null,  requirements: ['ember-views']},
  'ember-htmlbars':             {trees: null,  vendorRequirements: [], requirements: ['ember-views', 'ember-htmlbars-compiler']},
  'ember-routing':              {trees: null,  vendorRequirements: ['router', 'route-recognizer'],
                                               requirements: ['ember-runtime', 'ember-views', 'ember-handlebars']},
  'ember-application':          {trees: null,  requirements: ['ember-routing']},
  'ember':                      {trees: null,  requirements: ['ember-application']}
};
