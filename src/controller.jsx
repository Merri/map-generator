/**
 * @jsx React.DOM
 */

var React = require('react');
var Generator = require('./generator');

generator = new Generator();

generator.setColorMap('alternative');

function generateSeed() {
    generator.seed({
        width: 256,
        height: 256,
        borderProtection: 10,
        likelyhood: [
            0,
            4 / 1000,
            24 / 1000,
            599 / 1000,
            499 / 1000,
            499 / 1000,
            499 / 1000
        ],
        massRatio: 40,
        startingPoints: 60
    });
}

function generateHeightMap() {
    generator.createHeight({
        baseLevel: 0,
        flatten: 1,
        groundLevel: 3,
        randomize: 0.25,
        noiseOnWater: false
    });
}

function generateTextures() {
    generator.createBaseTextures({
        mountainGenerate: 6,
        seamless: false,
        terrain: 0,
        texture: 8,
        waterTexture: 5
    });
}

function getRandomizedPlayers() {
    return generator.getRandomPlayerPositions(7, 80);
}

function generateAndGetResources() {
    return generator.applyResources({});
}

var App = React.createClass({
    getInitialState: function() {
        return {
            players: [],
            resources: {}
        }
    },

    handleDraw: function() {
        console.time('Draw');
        generator.draw({
            canvas: this.refs.canvas.getDOMNode(),
            terrain: 0,
            viewType: 'pretty'
        });
        console.timeEnd('Draw');
    },

    handleSeed: function() {
        console.time('New Seed, Height Map and Textures');
        generateSeed();
        generateHeightMap();
        generateTextures();
        console.timeEnd('New Seed, Height Map and Textures');
        this.handleDraw();
    },

    handleHeight: function() {
        console.time('Height Map and Textures');
        generateHeightMap();
        generateTextures();
        console.timeEnd('Height Map and Textures');
        this.handleDraw();
    },

    handleTextures: function() {
        console.time('Textures');
        generateTextures();
        console.timeEnd('Textures');
        this.handleDraw();
    },

    handlePlayers: function() {
        console.time('Players');
        this.setState({
            players: getRandomizedPlayers()
        });
        console.timeEnd('Players');
        this.handleDraw();
    },

    handleResources: function() {
        console.time('Resources');
        this.setState({
            resources: generateAndGetResources()
        });
        console.timeEnd('Resources');
        this.handleDraw();
    },

    render: function() {
        return <div>
            <canvas width="256" height="256" ref="canvas" className="settlers2-map settlers2-map--greenland"></canvas>
            <button onClick={this.handleSeed}>New Seed</button>
            <button onClick={this.handleHeight}>Create Height Map</button>
            <button onClick={this.handleTextures}>Randomize Textures</button>
            <button onClick={this.handlePlayers}>Randomize Players</button>
            <button onClick={this.handleResources}>Randomize Resources</button>
        </div>
    }
});

window.onload = function() {
    React.renderComponent(
        <App />,
        document.getElementById('app')
    );
}
