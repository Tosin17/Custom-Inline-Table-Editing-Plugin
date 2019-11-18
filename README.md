## \$.Table Edits

Table Edits is a light (1.7k) jQuery plugin for making table rows editable. Built as minimally as possible so it's easy to extend. [Demo](http://nathancahill.github.io/table-edits/)

**Table Edits** I have extended the plugin to the following:

- Replace cell values with input fields on edit
- Support checkboxes
- Handle row editing state
- Fire callbacks for edit, save, delete and cancel

#### Options

```
$("table tr").editable({
    keyboard: true,
      dblclick: true,
      button: true,
      editSelector: '.edit',
      cancelSelector: '.cancel',
      deleteSelector: '.delete',
      maintainWidth: true,
      dropdowns: {},
      edit: function(values) {},
      save: function(values) {},
      cancel: function(values) {},
      delete: function(values) {}
});
```

#### Markup

The only additional markup **Table Edits** requires is a `data-field` attribute on each editable cell with it's column name:

```
<table>
    <tr>
        <td data-field="name">Dave Gamache</td>
        <td data-field="age">26</td>
        <td data-field="sex">Male</td>
        <td>
            <a class="edit>Edit</a>
        </td>
    </tr>
<table>
```

The last cell will not become editable because it does not have the `data-field` attribute.

#### Saving, Updating and Deleting Table Data

Table Edits makes it easy to save edits. Callbacks are passed a `values` object with column names and values of the edited row.

Posting, Puting, Patching and Deleting data from an API endpoint pretty straight forward.

```
$("table tr").editable({
    save: function(oldvalues, values) {
      var id = $(this).data('id');
      $.post('/api/object/' + id, values);
    },
    delete: function(values) {
      var id = $(this).data('id');
      $.delete('/api/object/' + id, values);
      // If delete succeeds
      $(this).remove()
    }
});
```
