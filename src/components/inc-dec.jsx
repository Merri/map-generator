/**
 * @jsx React.DOM
 */
'use strict';

var React = require('react');

module.exports = React.createClass({
    getInitialState: function() {
        return {
            value: 0
        };
    },

    getDefaultProps: function() {
        return {
            minimumValue: 1,
            maximumValue: 99,
            value: 50
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if(nextProps) {
            this.setState({
                value: ~~nextProps.value
            });
        }
    },

    handleDecrease: function(event) {
        event.preventDefault();
        var value = ~~this.state.value - 1;
        if(value < this.props.minimumValue) {
            value = ~~this.props.minimumValue;
        }
        this.setState({
            value: value
        }, function() {
            this.props.onChange(value);
        });
    },

    handleIncrease: function(event) {
        event.preventDefault();
        var value = ~~this.state.value + 1;
        if(value > this.props.maximumValue) {
            value = ~~this.props.maximumValue;
        }
        this.setState({
            value: value
        }, function() {
            this.props.onChange(value);
        });
    },

    handleChange: function(event) {
        var value = event.target.value;
        if(value.length > 0) {
            value = ~~parseInt(value, 10);
            if(value < this.props.minimumValue) {
                value = this.state.value;
            } else if(value > this.props.maximumValue) {
                value = this.state.value;
            }
            this.setState({
                value: ''+value
            }, function() {
                this.props.onChange(value);
            });
        } else {
            this.setState({
                value: value
            });
        }
    },

    render: function() {
        return (
            <span className="inc-dec">
                <button className="inc-dec__decrease" type="button" onClick={this.handleDecrease}>-</button>
                <input className="inc-dec__input" type="text" onChange={this.handleChange} value={this.state.value} />
                <button className="inc-dec__increase" type="button" onClick={this.handleIncrease}>+</button>
            </span>
        );
    }
});