/**
 * @jsx React.DOM
 */
'use strict';

var React = require('react');
var constants = require('../constants'),
    TEXTURE_INFO = constants.TEXTURE_INFO;

module.exports = React.createClass({
    getInitialState: function() {
        return {
            texture: 0
        };
    },

    getDefaultProps: function() {
        return {
            texture: 0,
            // usable texture indexes in The Settlers II
            textures: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 34]
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({
            texture: nextProps.texture
        });
    },

    handleChange: function(event) {
        var texture = ~~event.target.value;
        this.setState({
            texture: texture
        });
        this.props.onChange(texture);
    },

    render: function() {
        var textures = this.props.textures.map(function(texture) {
                var selected = this.state.texture === texture,
                    className = 'texture-option texture-option--terrain' + this.props.terrain,
                    textureInfo = TEXTURE_INFO[texture],
                    ratio = Math.max(50 / textureInfo.WIDTH, 50 / textureInfo.HEIGHT),
                    style = {
                        backgroundPosition: ~~(-textureInfo.X * ratio) + 'px ' + ~~(-textureInfo.Y * ratio) + 'px',
                        backgroundSize: ~~(256 * ratio) + 'px ' + ~~(256 * ratio) + 'px'
                    },
                    name = textureInfo.NAME[this.props.terrain];

                if(selected) {
                    className += ' texture-option--selected';
                }

                return <li className={className} title={name}>
                    <label className="texture-option__label" style={style}>
                        <input className="texture-option__input"
                        checked={selected}
                        onChange={this.handleChange}
                        type="radio"
                        value={texture} />
                        <span className="texture-option__name">{name}</span>
                    </label>
                </li>;
            }.bind(this));

        return <ul className="texture-option-list">
            {textures}
        </ul>;
    }
});