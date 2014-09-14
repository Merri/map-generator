/**
 * @jsx React.DOM
 */
'use strict';

var React = require('react'),
    Generator = require('./generator'),
    Compatibility = require('./components/compatibility.jsx'),
    IncDec = require('./components/inc-dec.jsx');

var generator = new Generator();

function getRandomizedPlayers() {
    return generator.getRandomPlayerPositions(7, 80);
}

function generateAndGetResources() {
    return generator.applyResources({});
}

var App = React.createClass({
    getInitialState: function() {
        return {
            hasLocalStorage: false,
            compatibility: 'return-to-the-roots',
            players: [],
            resources: {},
            viewType: 11,
            heightOptions: {
                baseLevel: 5,
                flatten: 1,
                groundLevel: 3,
                randomize: 0.3,
                noiseOnWater: false
            },
            seedOptions: {
                width: 160,
                height: 160,
                borderProtection: 8,
                likelyhood: [
                    0,
                    0.004,
                    0.024,
                    0.640,
                    0.480,
                    0.480,
                    0.480
                ],
                massRatio: 50,
                startingPoints: 60
            },
            textureOptions: {
                mountainGenerate: 6,
                seamless: false,
                terrain: 0,
                texture: 8,
                waterTexture: 5
            },
            height: 160,
            width: 160,
            title: 'Untitled'
        }
    },

    componentWillMount: function() {
        var hasLocalStorage = false;
        // if localStorage / cookies are disabled then accessing localStorage will throw an error
        try {
            hasLocalStorage = !!localStorage;
        } catch(err) {}

        if(hasLocalStorage) {
            if(localStorage.width)
                this.state.seedOptions.width = ~~localStorage.width;
            if(localStorage.height)
                this.state.seedOptions.height = ~~localStorage.height;
        }

        this.setState({
            hasLocalStorage: hasLocalStorage,
            // make initial render of the page to have canvas elements in the right size
            width: this.state.seedOptions.width,
            height: this.state.seedOptions.height
        });

        generator.setColorMap('alternative').then(function() {
            this.setState({
                viewType: 'pretty'
            });

            this.handleSeed();
        }.bind(this), this.handleSeed);
    },

    generateHeightMap: function() {
        generator.createHeight(this.state.heightOptions);
    },

    generateTextures: function() {
        generator.createBaseTextures(this.state.textureOptions);
    },

    handleDraw: function() {
        console.time('Draw');
        generator.draw({
            canvas: this.refs.canvas.getDOMNode(),
            terrain: this.state.textureOptions.terrain,
            viewType: this.state.viewType
        });
        generator.draw({
            canvas: this.refs.seed.getDOMNode(),
            viewType: 'seed'
        });
        console.timeEnd('Draw');
    },

    handleSeed: function() {
        console.time('New Seed, Height Map, Textures and Resources');
        this.state.seedOptions.startingPoints =
            (this.state.seedOptions.width + this.state.seedOptions.height) * 0.2;
        this.state.seedOptions.likelyhood = [
            0,
            (this.state.seedOptions.width + this.state.seedOptions.height) * 0.000005 + 0.001,
            (this.state.seedOptions.width + this.state.seedOptions.height) * 0.000015 + 0.010,
            (this.state.seedOptions.width + this.state.seedOptions.height) * 0.0005 + 0.5,
            (this.state.seedOptions.width + this.state.seedOptions.height) * 0.0002 + 0.4,
            (this.state.seedOptions.width + this.state.seedOptions.height) * 0.0002 + 0.4,
            (this.state.seedOptions.width + this.state.seedOptions.height) * 0.0002 + 0.4
        ];
        
        if(this.state.hasLocalStorage) {
            localStorage.width = this.state.seedOptions.width;
            localStorage.height = this.state.seedOptions.height;
        }

        this.setState({
            width: this.state.seedOptions.width,
            height: this.state.seedOptions.height
        }, function() {
            generator.seed(this.state.seedOptions);
            this.generateHeightMap();
            this.generateTextures();
            this.setState({
                players: [],
                resources: generateAndGetResources()
            });
            console.timeEnd('New Seed, Height Map, Textures and Resources');
            this.handleDraw();
        });
    },

    handleLandscape: function() {
        console.time('Height Map, Textures and Resources');
        this.generateHeightMap();
        this.generateTextures();
        this.setState({
            players: [],
            resources: []
        });
        console.timeEnd('Height Map, Textures and Resources');
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
            terrain: this.state.textureOptions.terrain,
            title: this.state.title
        }), this.state.title.replace(/[\|&;\$%@"<>\(\)\+,]/g, '_') + '.swd');
    },

    handleCompatibility: function(value) {
        this.setState({
            compatibility: value
        });
    },

    handleSetWidth: function(event) {
        this.state.seedOptions.width = ~~event.target.value;
        this.setState({
            seedOptions: this.state.seedOptions
        });
    },

    handleSetHeight: function(event) {
        this.state.seedOptions.height = ~~event.target.value;
        this.setState({
            seedOptions: this.state.seedOptions
        });
    },

    handleTerrain: function(event) {
        this.state.textureOptions.terrain = ~~event.target.value;
        this.generateTextures();
        this.setState({
            players: [],
            resources: []
        });
        this.handleDraw();
    },

    handleMassRatio: function(value) {
        this.state.seedOptions.massRatio = ~~value;
    },

    handleBaseLevel: function(value) {
        value = ~~value;
        if(this.state.heightOptions.baseLevel !== value) {
            this.state.heightOptions.baseLevel = value;
            this.handleLandscape();
        }
    },

    handleGroundLevel: function(value) {
        value = ~~value;
        if(this.state.heightOptions.groundLevel !== value) {
            this.state.heightOptions.groundLevel = value;
            this.handleLandscape();
        }
    },

    handleFlatten: function(value) {
        value = (~~value) / 10;
        if(this.state.heightOptions.flatten !== value) {
            this.state.heightOptions.flatten = value;
            this.handleLandscape();
        }
    },

    handleNoise: function(value) {
        value = ~~value ? (~~value) / 10 : 0;
        if(this.state.heightOptions.randomize !== value) {
            this.state.heightOptions.randomize = value;
            this.handleLandscape();
        }
    },

    handleNoiseOnWater: function(event) {
        console.log(event.target.checked);
        this.state.heightOptions.noiseOnWater = event.target.checked;
        this.handleLandscape();
    },

    handleViewTypeChange: function(event) {
        var value = event.target.value;

        if(value === ''+~~value)
            value = ~~value;
        
        this.setState({
            viewType: value
        }, this.handleDraw);
    },

    handleTitleChange: function(event) {
        this.setState({
            title: generator.sanitizeStringAsCP437(event.target.value)
        });
    },

    isRttROnly: function(areas) {
        return this.state.width > 256 || this.state.height > 256 || areas.length > 250;
    },

    // This hack works around Firefox's issue with not triggering onChange when value changes.
    // The bug was reported in 2002 and it's still not fixed by 2014.
    // Quite religious take on W3C's brain fart! https://bugzilla.mozilla.org/show_bug.cgi?id=126379
    handleFirefoxOnChangeInKeyDown: function(event) {
        var el = event.target;
        // we have to delay because onKeyDown triggers before the value has changed
        setTimeout(function() {
            // onChange event triggers when blur is called...
            el.blur();
            // and then get right back in
            el.focus();
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
            }),
            totalAreas = generator.getAreas() || [],
            areas = totalAreas.reduce(function(prevValue, curValue, index, array) {
                if(curValue.type === 1) {
                    prevValue.land++;
                } else if(curValue.type === 2) {
                    prevValue.water++;
                }
                return prevValue;
            }, {land: 0, water: 0}),
            mapClass = 'settlers2-map';

        mapClass += ' ' + mapClass + '--';

        switch(this.state.textureOptions.terrain) {
        case 1:
            mapClass += 'wasteland';
            break;
        case 2:
            mapClass += 'winter-world';
            break;
        default:
            mapClass += 'greenland';
        }

        return <div>
            {/*<Compatibility onChange={this.handleCompatibility} value={this.state.compatibility} />*/}
            <p>
                <input className="settlers2-map-title" type="text" maxLength="19" value={this.state.title}
                onChange={this.handleTitleChange} placeholder="Title (19 chars in CP-437)" />
                <br />
                <button onClick={this.handleDownload}>Download</button> <small className="settlers2-playable-on">
                Map is playable on {this.isRttROnly(totalAreas)
                    ? <b>Return to the Roots only</b>
                    : <span>The Settlers II &amp; Return to the Roots</span>}</small>
            </p>
            <div className="player-positions">
                <canvas width={this.state.width} height={this.state.height} ref="seed" className="settlers2-map"></canvas>
                <canvas width={this.state.width} height={this.state.height} ref="canvas" className={mapClass}></canvas>
                {players}
            </div>
            <ul className="seed-options">
                <li>
                    <label>Width: <select value={this.state.seedOptions.width} onChange={this.handleSetWidth}
                    onKeyDown={this.handleFirefoxOnChangeInKeyDown}>
                        <optgroup label="The Settlers II &amp; RttR">
                            {[64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240, 256].map(function(value) {
                                return <option value={value}>{value}</option>
                            })}
                        </optgroup>
                        <optgroup label="Return to the Roots only">
                            {[320, 384, 448, 512, 640, 768, 1024].map(function(value) {
                                return <option value={value}>{value}</option>
                            })}
                        </optgroup>
                    </select></label>
                </li>
                <li>
                    <label>Height: <select value={this.state.seedOptions.height} onChange={this.handleSetHeight}
                    onKeyDown={this.handleFirefoxOnChangeInKeyDown}>
                        <optgroup label="The Settlers II &amp; RttR">
                            {[64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240, 256].map(function(value) {
                                return <option value={value}>{value}</option>
                            })}
                        </optgroup>
                        <optgroup label="Return to the Roots only">
                            {[320, 384, 448, 512, 640, 768, 1024].map(function(value) {
                                return <option value={value}>{value}</option>
                            })}
                        </optgroup>
                    </select></label>
                </li>
                <li>
                    Target playable landmass%: <IncDec minimumValue="1" maximumValue="99"
                    value={this.state.seedOptions.massRatio} onChange={this.handleMassRatio} />
                </li>
                <li>
                    <button onClick={this.handleSeed}>New World</button>
                </li>
            </ul>
            <br style={{clear:'both'}} />
            <p>
                <label>Display:
                    <select value={this.state.viewType} onChange={this.handleViewTypeChange}
                    onKeyDown={this.handleFirefoxOnChangeInKeyDown}>
                        <optgroup label="World">
                            <option value="fast">Settlers II (fast)</option>
                            <option value="pretty">Detailed (slow)</option>
                        </optgroup>
                        <optgroup label="Raw Data">
                            <option value="0">#0: Height Map</option>
                            <option value="4">#4: Object Index</option>
                            <option value="5">#5: Object Type</option>
                            <option value="8">#8: Building Sites</option>
                            <option value="11">#11: Resources</option>
                            <option value="12">#12: Light Map</option>
                            <option value="13">#13: Areas</option>
                        </optgroup>
                    </select>
                </label>
            </p>
            <section>
                <header>Landscape Options</header>
                <p>These settings allow you to control the base landscape, the main look and feel of the world.</p>
                <dl>
                    <dt>Environment:</dt>
                    <dd>
                        <select value={this.state.textureOptions.terrain} onChange={this.handleTerrain}
                        onKeyDown={this.handleFirefoxOnChangeInKeyDown}>
                            <option value="0">Greenland</option>
                            <option value="1">Wasteland</option>
                            <option value="2">Winter World</option>
                        </select>
                    </dd>
                    <dt>Base Level:</dt>
                    <dd>
                        <IncDec minimumValue="0" maximumValue="60"
                        value={''+this.state.heightOptions.baseLevel} onChange={this.handleBaseLevel} />
                    </dd>
                    <dt>Ground Level:</dt>
                    <dd>
                        <IncDec minimumValue="0" maximumValue="5"
                        value={''+this.state.heightOptions.groundLevel} onChange={this.handleGroundLevel} />
                    </dd>
                    <dt>Flatten:</dt>
                    <dd>
                        <IncDec minimumValue="10" maximumValue="300"
                        value={''+~~(this.state.heightOptions.flatten * 10)} onChange={this.handleFlatten} />
                    </dd>
                    <dt>Noise:</dt>
                    <dd>
                        <IncDec minimumValue="0" maximumValue="50"
                        value={''+~~(this.state.heightOptions.randomize * 10)} onChange={this.handleNoise} />
                        <br />
                        <label>
                            <input type="checkbox" checked={this.state.heightOptions.noiseOnWater}
                            onChange={this.handleNoiseOnWater} /> Use also on unplayable areas? (water, lava, etc.)
                        </label>
                    </dd>
                </dl>
            </section>
            <p>
                <button onClick={this.handleResources}>Randomize Resources</button>
                <button onClick={this.handlePlayers}>Randomize Players</button>
            </p>
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
                <dt>Land areas:</dt>
                <dd>{areas.land}</dd>
                <dt>Water areas:</dt>
                <dd>{areas.water}</dd>
            </dl>
        </div>
    }
});

window.onload = function() {
    React.renderComponent(
        <App />,
        document.getElementById('app')
    );
}
