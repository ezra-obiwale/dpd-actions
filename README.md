# Deployd custom route action module

This custom resource type allows you to define custom actions, to be performed
outside the default collection resource, i.e., dpd-actions do not necessarily
require a collection to be executed.

## Installation

Within your deployd app, you can add dpd-actions using npm:

`npm install dpd-actions`

See [Installing Modules](http://docs.deployd.com/docs/using-modules/installing-modules.md)
for details.

## Configuration

Go to the deployd dashboard and add a new dpd-action. Specify a name for your
action ('myaction').
In the actions panel, add actions using the provided forms and add the code
necessary to execute the action.

Actions can be accessed using the dpd client or http request.

For the dpd client use:

`dpd.actions.myaction('actionname', {...}, callback);`

For http access:

`http.get/post/put/delete('http://*my-host*:*my-port*/myaction/actionname');

### Settings:

`method`

Indicate the request method for which the action should be available.

`resource`

Allows you to specify any resource in your current setup. This resource will be
directly available through the store object within your actions.

### Event API

- #### `url`

    The url of the request. e.g. `/myaction/actionname/part1/part2?query1=one&query2=two`

- #### `parts`

    The url parts array after the `<actionname>` e.g. `[part1, part2]`

- #### `query`

    The query string object e.g. `{ query1: 'one', query2: 'two' }`

- #### `body`

    The request body available on `POST` and `PUT`.

- #### `getHeader( string:` name `)`

    Shortcut method the get a header.

- #### `setHeader( string:` name `, string:` value `)`

    Shortcut method to set a header.

- #### `setResult( any:` data `, any:` error `)`

    Sets the result of the action. This `MUST` be called to terminate the request.