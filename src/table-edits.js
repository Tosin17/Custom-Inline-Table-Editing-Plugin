(function($, window, document, undefined) {
  var pluginName = 'editable',
    defaults = {
      keyboard: true,
      dblclick: true,
      button: true,
      editSelector: '.edit',
      cancelSelector: '.cancel',
      deleteSelector: '.delete',
      maintainWidth: true,
      dropdowns: {},
      validations: {},
      ignore: {},
      edit: function() {},
      save: function() {},
      cancel: function() {},
      delete: function() {}
    };

  var tableModel = [];
  var inputVals = false;

  function Editable(element, options) {
    this.element = element;
    this.options = $.extend({}, defaults, options);
    tableModel.push(this);

    this._defaults = defaults;
    this._name = pluginName;

    this.init();
  }

  Editable.prototype = {
    init: function() {
      this.editing = false;

      if (this.options.dblclick) {
        $(this.element)
          .css('cursor', 'pointer')
          .bind('dblclick', this.toggle.bind(this));
      }

      if (this.options.button) {
        $(this.options.editSelector, this.element).bind(
          'click',
          this.toggle.bind(this)
        );

        $(this.options.cancelSelector, this.element).bind(
          'click',
          this.cancel.bind(this)
        );

        $(this.options.deleteSelector, this.element).bind(
          'click',
          this.delete.bind(this)
        );
      }

      var checkbox = $(this.element).find(':checkbox');
      if (checkbox) {
        checkbox.attr('disabled', true);
      }

      var select = $(this.element).find('select');
      if (select) {
        select
          .closest('.edit-plugin__state')
          .append('<span>' + $(':selected', select).text() + '</span>');
        select.hide();
      }
    },

    toggle: function(e) {
      e.preventDefault();

      this.editing = !this.editing;

      if (this.editing) {
        this.edit();
      } else {
        this.save();
      }
    },

    clearRowsFromEditMode: function(id) {
      tableModel.forEach(function(el) {
        var rowId = $('.edit-plugin__state', el.element).data('id');
        if (!rowId) {
          return;
        }

        if (rowId !== id) {
          el.cancel();
        }
      });
    },

    edit: function() {
      var instance = this,
        values = {};

      $('.edit-plugin__state', this.element).each(function() {
        var input,
          field = $(this).data('field'),
          value = $(this).text(),
          width = $(this).width();

        values[field] = value;

        if (instance.options.maintainWidth) {
          $(this).width(width);
        }

        if (field in instance.options.dropdowns) {
          $('span', this).hide();
          input = $('select', this);
          value = input.val();
          values[field] = value;
          input.show();

          input.data('old-text', $(':selected', input).text());
          input.data('old-value', input.val()).dblclick(instance._captureEvent);
          input.appendTo(this);
        } else if (field in instance.options.checkboxes) {
          input = $(':checkbox', this);
          input.attr('disabled', false);
          values[field] = input.is(':checked') ? input.val() : null;

          input
            .data('old-value', values[field])
            .dblclick(instance._captureEvent);
        } else {
          if (field in instance.options.ignore) {
            return;
          }

          $(this).empty();
          input = $('<input type="text" />')
            .val(value)
            .data('old-value', value)
            .dblclick(instance._captureEvent);

          input.appendTo(this);
        }

        if (instance.options.keyboard) {
          input.keydown(instance._captureKey.bind(instance));
        }
      });

      this.options.edit.bind(this.element)(values);
      this.clearRowsFromEditMode.bind(this)(
        $('.edit-plugin__state', this.element).data('id')
      );
    },

    save: function() {
      var instance = this,
        oldValues = {},
        values = {},
        hasEmptyField,
        hasDuplicate;

      inputVals = $('[data-field="name"]')
        .map(function() {
          return $(this).text();
        })
        .get();

      $('.edit-plugin__state', this.element).each(function() {
        var value = $(':input', this).val(),
          field = $(this).data('field');

        hasEmptyField = !!(
          field in instance.options.validations &&
          instance.options.validations[field].isEmpty &&
          !value
        );

        hasDuplicate = !!inputVals.find(el => el === value);

        if (hasEmptyField || hasDuplicate) {
          instance.editing = true;
          hasEmptyField
            ? alert('Field cannot be empty.')
            : alert('No duplicate values');
          return false;
        }

        var oldValue = $(':input', this).data('old-value');

        values[field] = value;
        oldValues[field] = oldValue;

        if (instance.options.checkboxes.hasOwnProperty(field)) {
          var checkbox = $(this).find(':checkbox');
          values[field] = checkbox.is(':checked') ? checkbox.val() : null;
          $(':checkbox', this).attr('disabled', true);
          return;
        }

        if (instance.options.dropdowns.hasOwnProperty(field)) {
          var dropdown = $('select', this).hide();
          $('span', this)
            .show()
            .text($(':selected', dropdown).text());
          return;
        }

        if (field in instance.options.ignore) {
          values[field] = $(this).text();
          return;
        }

        $(this)
          .empty()
          .text(value);
      });

      if (hasEmptyField || hasDuplicate) {
        return;
      }
      this.options.save.bind(this.element)(oldValues, values);
      instance.editing = false;
    },

    cancel: function() {
      var instance = this,
        values = {};

      if (!instance.editing) {
        return;
      }

      instance.editing = false;

      $('.edit-plugin__state', this.element).each(function() {
        var value = $(':input', this).data('old-value'),
          field = $(this).data('field');

        values[field] = value;

        if (instance.options.checkboxes.hasOwnProperty(field)) {
          var checkbox = $(':checkbox', this);

          if (value) {
            checkbox.prop('checked', true);
          } else {
            checkbox.prop('checked', false);
          }
          checkbox.attr('disabled', true);
          return;
        }

        if (instance.options.dropdowns.hasOwnProperty(field)) {
          var dropdown = $('select', this);
          var oldSelText = $(dropdown).data('old-text');
          dropdown.val(value).hide();
          $('span', this)
            .show()
            .text(oldSelText);
          return;
        }

        if (field in instance.options.ignore) {
          return;
        }

        $(this)
          .empty()
          .text(value);
      });

      this.options.cancel.bind(this.element)(values);
    },

    delete: function() {
      var instance = this,
        values = {};

      $('.edit-plugin__state', this.element).each(function() {
        var value = $(this).text() || $(':input', this).val(),
          field = $(this).data('field');

        if (instance.options.checkboxes.hasOwnProperty(field)) {
          var input = $(':checkbox', this);
          value = input.is(':checked') ? input.val() : null;
        }

        if (instance.options.dropdowns.hasOwnProperty(field)) {
          value = $('select', this).val();
        }

        values[field] = value;
      });

      this.options.delete.bind(this.element)(values);
    },

    _captureEvent: function(e) {
      e.stopPropagation();
    },

    _captureKey: function(e) {
      if (e.which === 13) {
        this.editing = false;
        this.save();
      } else if (e.which === 27) {
        this.cancel();
      }
    }
  };

  $.fn[pluginName] = function(options) {
    return this.each(function() {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Editable(this, options));
      }
    });
  };
})(jQuery, window, document);
