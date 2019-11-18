
; (function ($, window, document, undefined) {
    var pluginName = "editable",
        defaults = {
            keyboard: true,
            dblclick: true,
            button: true,
            editSelector: ".edit",
            cancelSelector: ".cancel",
            deleteSelector: ".delete",
            maintainWidth: true,
            dropdowns: {},
            edit: function () { },
            save: function () { },
            cancel: function () { },
            delete: function () { }
        };

    // Function constructor --- new Editable(...)
    function Editable(element, options) {
        // Since this is called for each <tr>, this.element points to each <tr> 
        this.element = element;
        // Works like the ES6 spread operator
        this.options = $.extend({}, defaults, options);

        this._defaults = defaults;
        this._name = pluginName;

        this.init();
    }

    Editable.prototype = {
        init: function () {
            this.editing = false;

            if (this.options.dblclick) {
                // Bind the dbclick event to the <tr>
                $(this.element)
                    .css('cursor', 'pointer')
                    .bind('dblclick', this.toggle.bind(this));
            }

            // Bind '.edit' to the click event
            if (this.options.button) {
                $(this.options.editSelector, this.element)
                    .bind('click', this.toggle.bind(this));

                $(this.options.cancelSelector, this.element)
                    .bind('click', this.cancel.bind(this));

                $(this.options.deleteSelector, this.element)
                    .bind('click', this.delete.bind(this));
            }
        },

        toggle: function (e) {
            e.preventDefault();

            this.editing = !this.editing;

            if (this.editing) {
                this.edit();
            } else {
                this.save();
            }
        },

        edit: function () {
            var instance = this,
                values = {};

            // For each <td> that has a data-field in the <tr> do the following  
            $('td[data-field]', this.element).each(function () {

                // Note that $(this) here means the <td> that is being iterated
                // field --> data-field ie dataKey, value --> value displayed within <td>
                var input,
                    field = $(this).data('field'),
                    value = $(this).text(),
                    width = $(this).width(),
                    dropdownOptions = $(this).data('options');

                // Save initial or old values in the values object    
                values[field] = value;

                if (instance.options.maintainWidth) {
                    $(this).width(width);
                }

                // E.g options = { dropdowns : { sex: ['male', 'female'] } }
                if (field in instance.options.dropdowns && dropdownOptions) {
                    // Empty <td> for new DOM elements
                    $(this).empty();
                    input = $('<select></select>');

                    for (var i = 0; i < dropdownOptions.length; i++) {
                        $('<option></option>')
                            .text(dropdownOptions[i])
                            .appendTo(input);
                    };

                    // NOTE: jQuery returns the `input` object on every call to acheive method chaining
                    // So here we assign `input` a value, we add the data attribute `data-old-value='value'` to input
                    // And we prevent `dbClick` eventPropagation on input
                    input.val(value)
                        .data('old-value', value)
                        .dblclick(instance._captureEvent);

                    input.appendTo(this);

                } else if (field in instance.options.checkboxes) {
                    // Enable checkbox
                    input = $(':checkbox', this);
                    input.attr('disabled', false);
                    values[field] = input.is(':checked') ? input.val() : null;

                    input.data('old-value', values[field])
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
        },

        save: function () {
            var instance = this,
                oldValues = {},
                values = {};

            // Foreach <td> with a 'data-field' on this.element --> <tr>    
            $('td[data-field]', this.element).each(function () {
                // Get input values
                var value = $(':input', this).val(),
                    // Get old alues, so we can revert if `SAVE` fails
                    oldValue = $(':input', this).data('old-value'),
                    field = $(this).data('field');

                // Store input values in object with approate key
                values[field] = value;
                // Store old values
                oldValues[field] = oldValue;

                // Empty <td> and replace it's text with new values if it's not a checkbox
                if (!instance.options.checkboxes.hasOwnProperty(field)) {
                    $(this).empty()
                        .text(value);
                } else {
                    // Disable checkbox
                    $(':checkbox', this).attr('disabled', true);
                }
            });

            this.options.save.bind(this.element)(oldValues, values);
        },

        cancel: function () {
            var instance = this,
                values = {};

            if (!instance.editing) {
                return;
            }

            instance.editing = false;

            $('td[data-field]', this.element).each(function () {
                var value = $(':input', this).data('old-value'),
                    field = $(this).data('field');

                values[field] = value;

                if (!instance.options.checkboxes.hasOwnProperty(field)) {
                    $(this).empty()
                        .text(value);
                } else {
                    $(':checkbox', this).val(value);
                    $(':checkbox', this).attr('disabled', true);
                }
            });

            this.options.cancel.bind(this.element)(values);
        },

        delete: function () {
            var instance = this,
                values = {};

            $('td[data-field]', this.element).each(function () {
                // Get input values
                var value = $(this).text(),
                    field = $(this).data('field');

                if (instance.options.checkboxes.hasOwnProperty(field)) {
                    var input = $(':checkbox', this);
                    value = input.is(':checked') ? input.val() : null;
                }

                values[field] = value;
            });

            this.options.delete.bind(this.element)(values);
        },

        _captureEvent: function (e) {
            e.stopPropagation();
        },

        _captureKey: function (e) {
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
    $.fn[pluginName] = function (options) {
        // `this` here, points to jQuery
        // Iterate through returned <tr>
        return this.each(function () {

            // `this` here refers to each <tr> 
            if (!$.data(this, "plugin_" + pluginName)) {
                // new Editable() is being called for each <tr>
                // $.data(<tr>, name, data)
                $.data(this, "plugin_" + pluginName,
                    new Editable(this, options));
            }
        });
    };

})(jQuery, window, document);
