/* jshint node: true */
/* global _, $, ko, ui, dpd, ace, Context */

(function () {
  'use strict';

  if (window.actionsInitialized) {
    return;
  }

  window.actionsInitialized = true;

  var $editor = $('#ace-editor');
  var editor, bindings, configuration;

  function render(configuration) {

    var data = _.extend({
      actions: [],
      type: 'ActionResource'
    },
      configuration || {});

    bindings = {};

    bindings.editable = {
      id: ko.observable(''),
      name: ko.observable(''),
      method: ko.observable(''),
      title: function () {
        return this.name() ? this.name() + '  ' + this.method() : '';
      }
    };

    bindings.creatable = {
      name: ko.observable(''),
      method: ko.observable(''),
    };

    var reset = _.bind(function () {
      bindings.creatable.name('');
      bindings.creatable.method('');
    });

    bindings.actions = ko.observableArray(data.actions);

    bindings.onNew = _.bind(function () {
      bindings.editable.name('');
      bindings.editable.method('');

      $('.edit-mode').removeClass('edit-mode');
      $('#action-new').addClass('edit-mode');
      $('#editor-title').children(':last').hide();
    });

    bindings.onAdd = _.bind(function () {
      if (!bindings.creatable.name().trim()) {
        bindings.creatable.name('');
        return ui.error('Name cannot be empty!');
      }
      var action = {
        name: bindings.creatable.name(),
        method: bindings.creatable.method(),
      };

      var existing = _.detect(data.actions, function (oldAction) {
        return oldAction.name === action.name && oldAction.method === action.method;
      });
      if (existing) {
        return ui.notify('Event already exists').hide(2000).effect('slide');
      }

      data.actions.push(action);
      storeConfiguration(data);
      storeCode(bindings.creatable.name(), bindings.creatable.method());

      bindings.actions(data.actions);

      reset();

      bindings.editable.name(action.name);
      bindings.editable.method(action.method);

      $('#action-' + action.name + '-' + action.method + ' .start-editing').click();
    }, bindings);

    bindings.onEdit = _.bind(function (action) {

      $('.edit-mode').removeClass('edit-mode');
      $('#action-' + action.name + '-' + action.method).addClass('edit-mode');
      $('#editor-title').children(':last').show();

      if (!action.name) {
        return;
      }

      $('.action-edit').toggleClass('hide');

      bindings.editable.id(action.name + '-' + action.method);
      bindings.editable.name(action.name);
      bindings.editable.method(action.method);

      bindings.isNew(false);
      bindings.isEdit(true);
      bindings.isEditMode(true);

      fetchCode();
    });

    bindings.onUpdate = _.bind(function (oldAction, event) {
      if (!bindings.editable.name().trim()) {
        bindings.editable.name('');
        return ui.error('Name cannot be empty!');
      }
      _.forEach(configuration.actions, function (action, index) {
        if (oldAction.name === action.name && oldAction.method === action.method) {
          configuration.actions[index] = {
            name: bindings.editable.name(),
            method: bindings.editable.method(),
          };
        }
      });

      storeConfiguration(configuration);

      // remove old code of name or method changed
      if (oldAction.name !== bindings.editable.name()
        || oldAction.method !== bindings.editable.method()) {
        removeCode(oldAction.name, oldAction.method, true);
      }

      storeCode(bindings.editable.name(), bindings.editable.method());

      bindings.actions(configuration.actions);

      $('#action-' + oldAction.name).addClass('edit-mode');

    }, bindings);

    bindings.onDelete = _.bind(function (action, event) {

      event.preventDefault();
      event.stopPropagation();

      _.forEach(bindings.actions(), function (storedAction, index) {
        if (storedAction.name === action.name && storedAction.method === action.method) {
          data.actions.splice(index, 1);
        }
      });

      bindings.actions(data.actions);

      storeConfiguration(data);
      removeCode(action.name, action.method);
    });

    bindings.confirmDelete = _.bind(function (action, event) {
      $(event.target).parent()
        .hide().siblings().show();
      return;
    });

    bindings.cancelDelete = _.bind(function (action, event) {
      $(event.target).closest('span')
        .hide().siblings().show();
      return;
    });

    bindings.isEmpty = ko.observable(bindings.actions().length === 0);
    bindings.isNew = ko.observable(true);
    bindings.isEdit = ko.observable(false);
    bindings.isEditMode = ko.observable(false);
    bindings.isInitialized = ko.observable(true);

    $(document)
      .on('mouseover', '.component-item', function () {
        $(this)
          .find('.hide')
          .toggle(true);
      })
      .on('mouseout', '.component-item', function () {
        $(this)
          .find('.hide')
          .toggle(false);
      });

    bindings.requestMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    ko.applyBindings(bindings);
  }

  function createEditor() {
    editor = ace.edit('ace-editor');
    editor.setTheme('ace/theme/deployd');
    editor.session.setMode('ace/mode/javascript');
    editor.setShowPrintMargin(false);

    bindEditor();
  }

  function bindEditor(action) {
    if (editor) {

      var code = action || '';

      editor.getSession().setValue(code);
      editor.getSession()
        .on('change', function () {
          // trackUpdate(editor);
        });
      editor.commands.addCommand({
        name: 'save',
        bindKey: {
          win: 'Ctrl-S',
          mac: 'Command-S'
        },
        exec: function () {
          storeCode(bindings.editable.name(), bindings.editable.method());
        }
      });
    }
  }

  function storeConfiguration(configuration) {
    dpd('__resources')
      .put(Context.resourceId, configuration, function (resource, error) {
        if (error) {
          console.error(error);
        }
      });
  }

  function storeCode(name, method) {
    if (!name.trim()) {
      return ui.error('Create the action first');
    }
    var value = editor.getSession().getValue() || '';

    var fileName = name.replace(' ', '-').toLowerCase() + '-' + method + '.js';

    dpd('__resources')
      .put(Context.resourceId + '/' + fileName, {
        value: value
      }, function (resource, error) {
        if (error) {
          return ui.error('Error saving event', error.message)
            .effect('slide');
        }
        if (!$('#notifications li')
          .length) {
          ui.notify('Saved')
            .hide(1000)
            .effect('slide');
        }
      });
  }

  function removeCode(name, method, noAlert) {
    var value = editor.getSession().getValue() || '';

    var fileName = name.replace(' ', '-').toLowerCase() + '-' + method + '.js';

    dpd('__resources')
      .del(Context.resourceId + '/' + fileName, {
        value: value
      }, function (resource, error) {
        if (noAlert) return;

        if (error) {
          return ui.error('Error deleting event', error.message)
            .effect('slide');
        }
        if (!$('#notifications li').length) {
          ui.notify('Deleted').hide(1000).effect('slide');
        }
      });
  }

  function fetchCode(callback) {
    if (bindings && bindings.editable.name()) {
      var fileName = bindings.editable.name().replace(' ', '-').toLowerCase()
        + '-' + bindings.editable.method() + '.js';

      dpd('__resources')
        .get(Context.resourceId + '/' + fileName,
        function (resource, error) {
          if (!error) {
            editor.getSession()
              .setValue(resource.value);

            callback && callback(resource.value);
          }
        });
    }
  }

  function fetchProperties(callback) {
    // Update resources from disk
    dpd('__resources')
      .get(Context.resourceId, callback);
  }

  fetchProperties(function (resourceConfig) {
    configuration = resourceConfig;
    render(resourceConfig);
  });

  $('#actions').show();

  if ($editor) {
    createEditor();
    fetchCode();
  }

})();