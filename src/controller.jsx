/**
 * @jsx React.DOM
 */
'use strict';

var React = require('react'),
    Generator = require('./generator'),
    Compatibility = require('./components/compatibility.jsx');

var generator = new Generator();

function generateSeed() {
    generator.seed({
        width: 256,
        height: 256,
        borderProtection: 8,
        likelyhood: [
            0,
            4 / 1000,
            24 / 1000,
            640 / 1000,
            480 / 1000,
            480 / 1000,
            480 / 1000
        ],
        massRatio: 50,
        startingPoints: 60
    });
}

function generateHeightMap() {
    generator.createHeight({
        baseLevel: 5,
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
            compatibility: 'return-to-the-roots',
            players: [],
            resources: {},
            viewType: 'light'
        }
    },

    componentWillMount: function() {
        generator.setColorMap('alternative').then(function() {
            this.setState({
                viewType: 'pretty'
            });
            this.handleSeed();
        }.bind(this), this.handleSeed);
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
        console.time('New Seed, Height Map, Textures and Resources');
        generateSeed();
        generateHeightMap();
        generateTextures();
        this.setState({
            players: [],
            resources: generateAndGetResources()
        });
        console.timeEnd('New Seed, Height Map, Textures and Resources');
        this.handleDraw();
    },

    handleHeight: function() {
        console.time('Height Map, Textures and Resources');
        generateHeightMap();
        generateTextures();
        this.setState({
            players: [],
            resources: generateAndGetResources()
        });
        console.timeEnd('Height Map, Textures and Resources');
        this.handleDraw();
    },

    handleTextures: function() {
        console.time('Textures and Resources');
        generateTextures();
        this.setState({
            players: [],
            resources: generateAndGetResources()
        });
        console.timeEnd('Textures and Resources');
        this.handleDraw();
    },

    handleResources: function() {
        console.time('Resources');
        this.setState({
            players: [],
            resources: generateAndGetResources()
        });
        console.timeEnd('Resources');
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

    handleDownload: function() {
        saveAs(generator.getFileBlob({
            terrain: 0,
            title: 'Untitled'
        }), 'Untitled.swd');
    },

    handleCompatibility: function(value) {
        this.setState({
            compatibility: value
        });
    },

    render: function() {
        var gold = this.state.resources.mineGold || 0,
            coal = this.state.resources.mineCoal || 0,
            ironOre = this.state.resources.mineIronOre || 0,
            granite = this.state.resources.mineGranite || 0,
            mineTotal = gold + coal + ironOre + granite + 0.0001,
            players = this.state.players.map(function(player, index) {
                var className = 'player-position',
                    style = {
                        left: player.x + 'px',
                        top: player.y + 'px',
                    };

                if(index > 6) {
                    className += ' ' + className + '--rttr';
                }

                return (
                    <i className={className} id={'player' + index} style={style}></i>
                );
            });

        return <div>
            {/*<Compatibility onChange={this.handleCompatibility} value={this.state.compatibility} />*/}
            <div className="player-positions">
                <canvas width="256" height="256" ref="canvas" className="settlers2-map settlers2-map--greenland"></canvas>
                {players}
            </div>
            <p>
                <button onClick={this.handleSeed}>New Seed</button>
                <button onClick={this.handleHeight}>Create Height Map</button>
                <button onClick={this.handleTextures}>Randomize Textures</button>
                <button onClick={this.handleResources}>Randomize Resources</button>
                <button onClick={this.handlePlayers}>Randomize Players</button>
                <button onClick={this.handleDownload}>Download</button>
            </p>
            <p>
                <dl className="generator-statistics">
                    <dt>Players:</dt>
                    <dd>{this.state.players.length}</dd>
                    <dt>Trees:</dt>
                    <dd>{this.state.resources.tree || 0}</dd>
                    <dt>Granite:</dt>
                    <dd>{this.state.resources.granite || 0}</dd>
                    <dt>Coal:</dt>
                    <dd>{Math.round(coal / mineTotal * 100, 1)} %</dd>
                    <dt>Iron ore:</dt>
                    <dd>{Math.round(ironOre / mineTotal * 100, 1)} %</dd>
                    <dt>Gold:</dt>
                    <dd>{Math.round(gold / mineTotal * 100, 1)} %</dd>
                    <dt>Granite:</dt>
                    <dd>{Math.round(granite / mineTotal * 100, 1)} %</dd>
                </dl>
            </p>
        </div>
    }
});

window.onload = function() {
    React.renderComponent(
        <App />,
        document.getElementById('app')
    );
}
