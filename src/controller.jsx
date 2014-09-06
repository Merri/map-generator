/**
 * @jsx React.DOM
 */

var React = require('react');

var Test = React.createClass({
    render: function() {
        return <div>Empty container</div>
    }
});

React.renderComponent(
    <Test />,
    document.getElementById('test')
);
