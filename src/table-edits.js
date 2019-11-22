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
      edit: function() {},
      save: function() {},
      cancel: function() {},
      delete: function() {}
    };

  var tableModel = [];

  // Function constructor --- new Editable(...)
  function Editable(element, options) {
    // Since this is called for each <tr>, this.element points to each <tr>
    this.element = element;
    // Works like the ES6 spread operator
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
        // Bind the dbclick event to the <tr>
        $(this.element)
          .css('cursor', 'pointer')
          .bind('dblclick', this.toggle.bind(this));
      }

      // Bind '.edit' to the click event
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

      // If row contains a checkbox, disable it
      var checkbox = $(this.element).find(':checkbox');
      if (checkbox) {
        checkbox.attr('disabled', true);
      }

      // If row contains a select, detach it and display it's value in the <td>
      var select = $(this.element).find('select');
      if (select) {
        select.closest('td').append('<span>' + select.val() + '</span>');
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
      var instance = this;

      tableModel.forEach(function(el) {
        var rowId = $(el.element).data('id');
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

      // For each <td> that has a data-field in the <tr> do the following
      $('td[data-field]', this.element).each(function() {
        // Note that $(this) here means the <td> that is being iterated
        // field --> data-field ie dataKey, value --> value displayed within <td>
        var input,
          field = $(this).data('field'),
          value = $(this).text(),
          width = $(this).width();

        // Save initial or old values in the values object
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

          // NOTE: jQuery returns the `input` object on every call to acheive method chaining
          // So here we assign `input` a value, we add the data attribute `data-old-value='value'` to input
          // And we prevent `dbClick` eventPropagation on input
          input.data('old-value', input.val()).dblclick(instance._captureEvent);
          input.appendTo(this);
        } else if (field in instance.options.checkboxes) {
          // Enable checkbox
          input = $(':checkbox', this);
          input.attr('disabled', false);
          values[field] = input.is(':checked') ? input.val() : null;

          input
            .data('old-value', values[field])
            .dblclick(instance._captureEvent);
        } else {
          $(this).empty();
          input = $('<input type="text" />')
            .val(value)
            .data('old-value', value)
            .dblclick(instance._captureEvent);

          input.appendTo(this);
        }

        // If keyboard events are enabled, bind eventhandlers to <tr>
        if (instance.options.keyboard) {
          input.keydown(instance._captureKey.bind(instance));
        }
      });

      // Create a new edit function, bind <tr> to its context so that its `this` points to <tr>,
      // call the returned function, passing `values` to it
      this.options.edit.bind(this.element)(values);
      this.clearRowsFromEditMode.bind(this)($(this.element).data('id'));
    },

    save: function() {
      var instance = this,
        oldValues = {},
        values = {};

      // Foreach <td> with a 'data-field' on this.element --> <tr>
      $('td[data-field]', this.element).each(function() {
        // Get input values
        var value = $(':input', this).val(),
          // Get old alues, so we can revert if `SAVE` fails
          oldValue = $(':input', this).data('old-value'),
          field = $(this).data('field');

        // Store input values in object with approate key
        values[field] = value;
        // Store old values
        oldValues[field] = oldValue;

        if (instance.options.checkboxes.hasOwnProperty(field)) {
          // Update checkbox value
          var checkbox = $(this).find(':checkbox');
          values[field] = checkbox.is(':checked') ? checkbox.val() : null;
          // Disable checkbox
          $(':checkbox', this).attr('disabled', true);
          return;
        }

        if (instance.options.dropdowns.hasOwnProperty(field)) {
          var dropdown = $('select', this).hide();
          $('span', this)
            .show()
            .text(dropdown.val());
          return;
        }

        $(this)
          .empty()
          .text(value);
      });

      this.options.save.bind(this.element)(oldValues, values);
    },

    cancel: function() {
      var instance = this,
        values = {};

      if (!instance.editing) {
        return;
      }

      instance.editing = false;

      $('td[data-field]', this.element).each(function() {
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
          $('select', this)
            .val(value)
            .hide();
          $('span', this)
            .show()
            .text(value);
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

      $('td[data-field]', this.element).each(function() {
        // Get input values
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

  // Attach plugin to JQuery's prototype
  // Accept options {...}
  $.fn[pluginName] = function(options) {
    // `this` here, points to jQuery
    // Iterate through returned <tr>
    return this.each(function() {
      // `this` here refers to each <tr>
      if (!$.data(this, 'plugin_' + pluginName)) {
        // new Editable() is being called for each <tr>
        // $.data(<tr>, name, data)
        $.data(this, 'plugin_' + pluginName, new Editable(this, options));
      }
    });
  };
})(jQuery, window, document);
