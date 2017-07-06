/* jshint node: true, unused:true */
'use strict';

var _ = require('lodash');
var internalClient = require('deployd/lib/internal-client');
var logger = require('npmlog');
var path = require('path');
var Resource = require('deployd/lib/resource');
var Script = require('deployd/lib/script');
var util = require('util');

var _tag_;

function ActionResource(name, options) {

  Resource.apply(this, arguments);

  this.dpd = internalClient.build(this.options.server);
  this.actions = {};

  this.name = name;

  _tag_ = 'action-resource::' + this.name;

  // Store actions for later reference
  _.each(this.config.actions, function (action) {

    action.name = action.name.replace(' ', '-').toLowerCase();

    action.store = options && action.resource ? options.db.createStore(action.resource) : {};

    action.executable = Script.load(this.options.configPath + '/' + action.name + '-' + action.method + '.js',
      function (error, script) {
        if (!error) {
          action.executable = script;
        } else {
          throw new Error('Failed to init executable for action ' + action.name + '-' + action.method + '. Failed with error: ' + error.message);
        }
      });

    this.actions[action.name] = action;
  }, this);

  logger.verbose(_tag_, 'Initializing action collection... done');
}

util.inherits(ActionResource, Resource);

ActionResource.label = 'Method Action';
ActionResource.defaultPath = '/action';

ActionResource.dashboard = {
  path: path.join(__dirname, 'dashboard'),
  pages: ['Actions'],
  scripts: [
    '/js/lib/jquery-ui-1.8.22.custom.min.js',
    '/js/lib/knockout-2.1.0.js',
    '/js/lib/knockout.mapping.js',
    '/js/util/knockout-util.js',
    '/js/util/key-constants.js',
    '/js/actions.js',
    '/js/util.js',
  ]
};

ActionResource.prototype = _.extend(ActionResource.prototype, Resource.prototype);
ActionResource.prototype.clientGeneration = true;

ActionResource.prototype.handle = function (ctx, next) {

  logger.info(_tag_, 'Handling context: %j', ctx.url);

  var parts = ctx.url.substr(1).split('/');
  var requestPath = parts.shift();
  var action = this.actions[requestPath];
  if (action && ctx.req.method === action.method) {
    try {
      var data = {};
      var domain = {
        url: ctx.url,
        parts: parts,
        query: ctx.query,
        body: ctx.body,
        getHeader: function (name) {
          if (ctx.req.headers) {
            return ctx.req.headers[name];
          }
        },
        setHeader: function (name, value) {
          if (ctx.res.setHeader) {
            ctx.res.setHeader(name, value);
          }
        },
        setResult: function (val, err) {
          data = val;
          ctx.done(err, data);
        }
      };
      action.executable.run(ctx, domain, function (err) {
        if (err)
          ctx.done(err);
      });
    } catch (err) {
      logger.error(_tag_, 'Failed executing %j action: %j with error: %j',
        action.method, action.name, err.message);
      ctx.done(err);
    }
  }
  else {
    next();
  }
};

module.exports = ActionResource;
