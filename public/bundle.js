require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"Generator":[function(require,module,exports){
'use strict';

var Promise = require('promise'),
    Map = require('./map');

var constants = require('./constants'),
    AREA = constants.AREA,
    CP437 = constants.CP437,
    COLOR = constants.COLOR,
    OBJECT_TYPE = constants.OBJECT_TYPE,
    RESOURCE = constants.RESOURCE,
    SITE = constants.SITE,
    TERRAIN = constants.TERRAIN,
    TEXTURE = constants.TEXTURE,
    TEXTURE_INFO = constants.TEXTURE_INFO,
    TREE_INFO = constants.TREE_INFO;

var Generator = function() {
    var map,
        x,
        y,
        i,
        j,
        k,
        l,
        around,
        aroundExpandTo,
        baseLevel,
        borderProtection,
        colorMap,
        colors = [],
        data,
        deletedNodes,
        height,
        index,
        mass,
        massRatio,
        nodes,
        players = [],
        size,
        seedMap,
        startingPoints,
        total,
        value,
        viewType,
        width;

    function expandTo(index, value, current) {
        aroundExpandTo = map.getNodesByIndex(index);

        seedMap[index] = value;
        if(current !== void 0) {
            delete nodes[current];
            deletedNodes.push(current);
        }
        mass++;

        Object.keys(aroundExpandTo).forEach(function(key) {
            index = aroundExpandTo[key];
            if(seedMap[index] === 0) {
                seedMap[index] = 1;
                if(deletedNodes.length) {
                    nodes[deletedNodes.pop()] = index
                } else {
                    nodes.push(index);
                }
            }
        });
    }

    var seed = function(options) {
        //if(!options || !options.length) options = {};
        console.time('Generate');
        var likelyhood = options.likelyhood,
            givenStartingPoints = ~~options.startingPoints,
            givenMassRatio = ~~options.massRatio

        //width = 1024 || (~~(Math.random() * 20) + 7) * 16,
        //height = 1024 || (~~(Math.random() * 20) + 7) * 16,
        width = ~~options.width;
        height = ~~options.height;
        size = width * height;
        borderProtection = ~~options.borderProtection;
        if(borderProtection) borderProtection = ~~(Math.min(width, height) / borderProtection);
        seedMap = new Uint8Array(size);

        // sanitize user input
        if(givenStartingPoints < 1) givenStartingPoints = 1;
        else if(givenStartingPoints > 512) givenStartingPoints = 512;
        if(givenStartingPoints > size >> 2) givenStartingPoints = size >> 2;
        
        if(givenMassRatio < 1) givenMassRatio = 1;
        else if(givenMassRatio > 99) givenMassRatio = 99;

        nodes = [];
        deletedNodes = [];
        mass = 0;
        massRatio = ~~(size / 100 * givenMassRatio);
        startingPoints = 0;

        map = new Map(width, height);
        data = map.getRawData();

        // randomize some starting points
        value = 255;
        while(startingPoints < givenStartingPoints) {
            x = ~~(Math.random() * (width - borderProtection * 2)) + borderProtection;
            y = ~~(Math.random() * (height - borderProtection * 2)) + borderProtection;
            index = y * width + x;

            if(seedMap[index] === 0) {
                expandTo(index, value);
                startingPoints++;
            }
        }

        // do the land expansion
        if(mass > 0) {
            while(mass < massRatio) {
                value--;
                for(i = nodes.length; i > 0; --i) {
                    index = nodes[i];
                    if(index !== void 0) {
                        total = 0;
                        around = map.getNodesByIndex(index);

                        if(seedMap[around.left] > 1) total++;
                        if(seedMap[around.right] > 1) total++;
                        if(seedMap[around.topLeft] > 1) total++;
                        if(seedMap[around.topRight] > 1) total++;
                        if(seedMap[around.bottomLeft] > 1) total++;
                        if(seedMap[around.bottomRight] > 1) total++;

                        if(Math.random() <= likelyhood[total]) expandTo(index, ~~(value / 7 * total) + 2, i);
                    }
                }
                if(value > 8) {}
                else if(value === 8 && Math.random() <= likelyhood[1]) value = 256;
                else if(value === 7 && Math.random() <= likelyhood[2]) value = 56;
                else if(value === 6 && Math.random() <= likelyhood[3]) value = 64;
                else if(value === 5 && Math.random() <= likelyhood[4]) value = 72;
                else if(value === 4 && Math.random() <= likelyhood[5]) value = 80;
                else if(value === 3 && Math.random() <= likelyhood[6]) value = 96;
                else /*if(value === 2) */value = 128;
            }
        }

        console.timeEnd('Generate');
    };

    //options: baseLevel
    var createHeight = function(options) {
        //if(!options || !options.length) options = {};
        console.time('Height map');

        baseLevel = options.baseLevel = ~~options.baseLevel;
        options.groundLevel = Math.abs(~~options.groundLevel);
        options.flatten = Math.abs(options.flatten);
        options.noiseOnWater = !!options.noiseOnWater;

        if(options.groundLevel > 5) options.groundLevel = 5;
        if(options.flatten < 1) options.flatten = 1;
        else if(options.flatten > 30) options.flatten = 30;

        map.initializeHeight(options.baseLevel);

        // push land up or down before we start!
        i = options.baseLevel <= 30 ? options.groundLevel : -options.groundLevel;
        index = 0;
        for(y = 0; y < height; y++) {
            for(x = 0; x < width; x++) {
                if(seedMap[index] > 1) {
                    map.changeHeight(x, y, 0, i);
                }
                index++;
            }
        }

        // draw the final height map based on what we have
        index = 0;
        for(y = 0; y < height; y++) {
            for(x = 0; x < width; x++) {
                value = seedMap[index];
                if(value > 1) {
                    around = map.getNodesByIndex(index);
                    // calculate avarage around node
                    i = Math.round((seedMap[around.left] +
                        seedMap[around.right] +
                        seedMap[around.topLeft] +
                        seedMap[around.topRight] +
                        seedMap[around.bottomLeft] +
                        seedMap[around.bottomRight]) / 6);
                    // go up or down
                    map.changeHeight(x, y, ((value & 15) & (i & 15)) / 2, ~~((value - i) / 8));
                }
                index++;
            }
        }

        // flatten
        if(options.flatten > 1) {
            baseLevel = ~~(baseLevel / options.flatten);
            for(i = 0; i < size; i++) {
                data[i] = ~~(data[i] / options.flatten);
            }
        }

        // some extra randomize
        if(options.randomize > 0) {
            if(!options.noiseOnWater) {
                index = 0;
                for(y = 0; y < height; y++) {
                    for(x = 0; x < width; x++) {
                        if(seedMap[index] > 1 || data[index] !== baseLevel) {
                            map.changeHeight(x, y, 0, ~~(Math.random() * ((options.randomize * 2) + 1) - options.randomize));
                        }
                        index++;
                    }
                }
            } else {
                index = 0;
                for(y = 0; y < height; y++) {
                    for(x = 0; x < width; x++) {
                        map.changeHeight(x, y, 0, ~~(Math.random() * ((options.randomize * 2) + 1) - options.randomize));
                        index++;
                    }
                }
            }
        }

        console.timeEnd('Height map');

        console.time('lightMap');
        map.calculateLightMap();
        console.timeEnd('lightMap');
    };

    var createBaseTextures = function(options) {
        var changed = false,
            i,
            mountainTextures = [1, 11, 12, 13],
            textureBlock1 = size * 1,
            textureBlock2 = size * 2,
            siteBlock = size * 8,
            siteNodes;

        console.time('Texture');

        // sanitize
        options.mountainGenerate = ~~options.mountainGenerate;
        options.seamless = !!~~options.seamless;
        options.texture = ~~options.texture & TEXTURE.TO_ID_VALUE;
        options.waterTexture = ~~options.waterTexture & TEXTURE.TO_ID_VALUE;

        map.initializeTexture(options.texture);

        // draw water texture
        for(i = 0; i < size; i++) {
            if(data[i] >= (baseLevel - 2) && data[i] <= (baseLevel + 2) && seedMap[i] < 2) {
                map.setTexture(i, options.waterTexture);
            }
        }

        console.time('Draw Mountains (requires x2 calculateSites)');
        map.calculateSiteMap();
        
        // draw mountain texture
        if(options.mountainGenerate === 7) {
            for(i = 0; i < size; i++) {
                if(
                    data[textureBlock1 + i] !== 0x04
                    && data[textureBlock1 + i] !== 0x07
                    && data[textureBlock1 + i] !== 0x11
                    && data[textureBlock2 + i] !== 0x04
                    && data[textureBlock2 + i] !== 0x07
                    && data[textureBlock2 + i] !== 0x11
                ) {
                    siteNodes = map.getNodesByIndex(i);
                    if(
                        (data[siteBlock + siteNodes.left] & 0xF7) === 0x01
                        && (data[siteBlock + siteNodes.right] & 0xF7) === 0x01
                        && (data[siteBlock + siteNodes.topLeft] & 0xF7) === 0x01
                        && (data[siteBlock + siteNodes.topRight] & 0xF7) === 0x01
                        && (data[siteBlock + siteNodes.bottomLeft] & 0xF7) === 0x01
                        && (data[siteBlock + siteNodes.bottomRight] & 0xF7) === 0x01
                    ) {
                        map.setTexture(i, mountainTextures[~~(Math.random() * 4)]);
                    }
                }
            }
        } else if(options.mountainGenerate === 6) {
            for(i = 0; i < size; i++) {
                if(
                    (data[siteBlock + i] & 0xF7) === 0x01
                    && data[textureBlock1 + i] !== 0x04
                    && data[textureBlock1 + i] !== 0x07
                    && data[textureBlock1 + i] !== 0x11
                    && data[textureBlock2 + i] !== 0x04
                    && data[textureBlock2 + i] !== 0x07
                    && data[textureBlock2 + i] !== 0x11
                ) {
                    siteNodes = map.getNodesByIndex(i);
                    if(
                        (data[siteBlock + siteNodes.left] & 0xF7) === 0x01
                        && (data[siteBlock + siteNodes.right] & 0xF7) === 0x01
                        && (data[siteBlock + siteNodes.topLeft] & 0xF7) === 0x01
                        && (data[siteBlock + siteNodes.topRight] & 0xF7) === 0x01
                        && (data[siteBlock + siteNodes.bottomLeft] & 0xF7) === 0x01
                        && (data[siteBlock + siteNodes.bottomRight] & 0xF7) === 0x01
                    ) {
                        map.setTexture(i, mountainTextures[~~(Math.random() * 4)]);
                    }
                }
            }
        } else {
            for(i = 0; i < size; i++) {
                if(
                    (data[siteBlock + i] & 0xF7) === 0x01
                    && data[textureBlock1 + i] !== 0x04
                    && data[textureBlock1 + i] !== 0x07
                    && data[textureBlock1 + i] !== 0x11
                    && data[textureBlock2 + i] !== 0x04
                    && data[textureBlock2 + i] !== 0x07
                    && data[textureBlock2 + i] !== 0x11
                ) {
                    siteNodes = map.getNodesByIndex(i);
                    if(
                        options.mountainGenerate <= (((data[siteBlock + siteNodes.left] & 0xF7) === 0x01)
                        + ((data[siteBlock + siteNodes.right] & 0xF7) === 0x01)
                        + ((data[siteBlock + siteNodes.topLeft] & 0xF7) === 0x01)
                        + ((data[siteBlock + siteNodes.topRight] & 0xF7) === 0x01)
                        + ((data[siteBlock + siteNodes.bottomLeft] & 0xF7) === 0x01)
                        + ((data[siteBlock + siteNodes.bottomRight] & 0xF7) === 0x01))
                    ) {
                        map.setTexture(i, mountainTextures[~~(Math.random() * 4)]);
                    }
                }
            }
        }

        // seamless mode
        if(!options.seamless) {
            for(i = 0; i < width; i++) {
                switch(data[textureBlock1 + i]) {
                // savannah and steppe
                case 0x00:
                case 0x0E:
                    map.setTexture(i, 0x03); // swamp
                    break;
                // meadow
                case 0x08:
                case 0x09:
                case 0x0A:
                case 0x0F:
                    map.setTexture(i, 0x03); // swamp
                    break;
                // desert
                case 0x04:
                case 0x07:
                    map.setTexture(i, 0x02); // snow
                    break;
                // magenta
                case 0x11:
                    map.setTexture(i, 0x10); // lava
                    break;
                // mountain meadow
                case 0x12:
                case 0x22:
                    map.setTexture(i, 0x10); // lava
                    break;
                // mountain
                case 0x01:
                case 0x0B:
                case 0x0C:
                case 0x0D:
                    map.setTexture(i, 0x02); // snow
                    break;
                // water
                case 0x05:
                case 0x06:
                    map.setTexture(i, 0x13); // water (no ships)
                    break;
                default:
                    switch(data[textureBlock2 + i]) {
                    // savannah and steppe
                    case 0x00:
                    case 0x0E:
                        map.setTexture(i, 0x03); // swamp
                        break;
                    // meadow
                    case 0x08:
                    case 0x09:
                    case 0x0A:
                    case 0x0F:
                        map.setTexture(i, 0x03); // swamp
                        break;
                    // desert
                    case 0x04:
                    case 0x07:
                        map.setTexture(i, 0x02); // snow
                        break;
                    // magenta
                    case 0x11:
                        map.setTexture(i, 0x10); // lava
                        break;
                    // mountain meadow
                    case 0x12:
                    case 0x22:
                        map.setTexture(i, 0x10); // lava
                        break;
                    // mountain
                    case 0x01:
                    case 0x0B:
                    case 0x0C:
                    case 0x0D:
                        map.setTexture(i, 0x02); // snow
                        break;
                    // water
                    case 0x05:
                    case 0x06:
                        map.setTexture(i, 0x13); // water (no ships)
                        break;
                    }
                }
            }
            for(; i < size; i += width) {
                switch(data[textureBlock1 + i]) {
                // savannah and steppe
                case 0x00:
                case 0x0E:
                    map.setTexture(i, 0x03); // swamp
                    break;
                // meadow
                case 0x08:
                case 0x09:
                case 0x0A:
                case 0x0F:
                    map.setTexture(i, 0x03); // swamp
                    break;
                // desert
                case 0x04:
                case 0x07:
                    map.setTexture(i, 0x02); // snow
                    break;
                // magenta
                case 0x11:
                    map.setTexture(i, 0x10); // lava
                    break;
                // mountain meadow
                case 0x12:
                case 0x22:
                    map.setTexture(i, 0x10); // lava
                    break;
                // mountain
                case 0x01:
                case 0x0B:
                case 0x0C:
                case 0x0D:
                    map.setTexture(i, 0x02); // snow
                    break;
                // water
                case 0x05:
                case 0x06:
                    map.setTexture(i, 0x13); // water (no ships)
                    break;
                default:
                    switch(data[textureBlock2 + i]) {
                    // savannah and steppe
                    case 0x00:
                    case 0x0E:
                        map.setTexture(i, 0x03); // swamp
                        break;
                    // meadow
                    case 0x08:
                    case 0x09:
                    case 0x0A:
                    case 0x0F:
                        map.setTexture(i, 0x03); // swamp
                        break;
                    // desert
                    case 0x04:
                    case 0x07:
                        map.setTexture(i, 0x02); // snow
                        break;
                    // magenta
                    case 0x11:
                        map.setTexture(i, 0x10); // lava
                        break;
                    // mountain meadow
                    case 0x12:
                    case 0x22:
                        map.setTexture(i, 0x10); // lava
                        break;
                    // mountain
                    case 0x01:
                    case 0x0B:
                    case 0x0C:
                    case 0x0D:
                        map.setTexture(i, 0x02); // snow
                        break;
                    // water
                    case 0x05:
                    case 0x06:
                        map.setTexture(i, 0x13); // water (no ships)
                        break;
                    default:
                    }
                }
            }
        }

        map.calculateSiteMap();
        console.timeEnd('Draw Mountains (requires x2 calculateSites)');

        console.timeEnd('Texture');
    };

    var getRandomPlayerPositions = function(maxPlayerCount, radius) {
        players = [];

        console.time('getRandomPlayerPositions');

        // sanitize
        maxPlayerCount = ~~maxPlayerCount;
        if(maxPlayerCount < 0) maxPlayerCount = 0;
        else if(maxPlayerCount > 10) maxPlayerCount = 10;

        radius = ~~radius;

        function generateRandomPlayers(sites) {
            var index,
                nodes,
                x,
                y;

            if(sites.length > 0 && players.length < maxPlayerCount) {
                // randomize a position from given plausible sites
                index = sites[~~(Math.random() * sites.length)];
                x = index % width;
                y = ~~((index - x) / width);

                // getRadiusNodes returns a typed array; must convert it to regular array
                nodes = Array.apply([], map.getRadiusNodes(x, y, radius));

                // remove nodes near newly randomized player
                sites = sites.filter(function(index) {
                    return nodes.indexOf(index) === -1;
                });

                // add player to list of known players
                players.push({
                    index: index,
                    x: x,
                    y: y
                });

                // get the next player
                generateRandomPlayers(sites, radius);
            }
        }

        // start the recursive call (if necessary)
        if(maxPlayerCount > 0) generateRandomPlayers(map.getAllSitesOfType(SITE.CASTLE));

        console.timeEnd('getRandomPlayerPositions');

        return players;
    };

    var applyResources = function(options) {
        var i,
            j,
            k,
            eachTextureIsSameKind,
            usableLandmass = 0,
            newResource,
            nodes,
            resources = {
                freshWater: 0,
                mineCoal: 0,
                mineIronOre: 0,
                mineGold: 0,
                mineGranite: 0,
                fish: 0,
                granite: 0,
                tree: 0
            },
            texture,
            textureFlag,
            textures,
            textureBlocks = size,
            objectIndexBlock = size * 4,
            objectTypeBlock = size * 5,
            siteBlock = size * 8,
            touchBlock = size * 10,
            resourceBlock = size * 11;

        console.time('applyResources');

        // clean up
        for(i = 0; i < size; i++) {
            data[objectIndexBlock + i] = 0;
            data[objectTypeBlock + i] = 0;
        }

        options = options || {};
        // sanitize values
        options.treeRatio = (options.treeRatio !== void 0) ? ~~options.treeRatio : 33;
        if(options.treeRatio < 0) options.treeRatio = 0;
        else if(options.treeRatio > 50) options.treeRatio = 0.5;
        else options.treeRatio = options.treeRatio / 100;

        options.graniteRatio = (options.graniteRatio !== void 0) ? ~~options.graniteRatio : 15;
        if(options.graniteRatio < 0) options.graniteRatio = 0;
        else if(options.graniteRatio > 25) options.graniteRatio = 0.25;
        else options.graniteRatio = options.graniteRatio / 100;

        for(i = 0; i < size; i++) {
            newResource = 0;
            textures = map.getTexturesByIndex(i);
            // we have to drop support flags so that ie. Mountain Meadow is comparable to the Habitable Mountain texture (essentially the same)
            textureFlag = TEXTURE_INFO[textures.topLeft].FLAG & TEXTURE.DROP_SUPPORT;
            eachTextureIsSameKind = (
                textureFlag === (TEXTURE_INFO[textures.top].FLAG & TEXTURE.DROP_SUPPORT)
                && textureFlag === (TEXTURE_INFO[textures.topRight].FLAG & TEXTURE.DROP_SUPPORT)
                && textureFlag === (TEXTURE_INFO[textures.bottomLeft].FLAG & TEXTURE.DROP_SUPPORT)
                && textureFlag === (TEXTURE_INFO[textures.bottom].FLAG & TEXTURE.DROP_SUPPORT)
                && textureFlag === (TEXTURE_INFO[textures.bottomRight].FLAG & TEXTURE.DROP_SUPPORT)
            );
            if(eachTextureIsSameKind) {
                // water?
                if(textures.topLeft === 0x05) {
                    nodes = map.getNodesByIndex(i);
                    // can we find an accessible site around?
                    if(
                        (data[siteBlock + nodes.left] !== SITE.IMPASSABLE)
                        || (data[siteBlock + nodes.right] !== SITE.IMPASSABLE)
                        || (data[siteBlock + nodes.topLeft] !== SITE.IMPASSABLE)
                        || (data[siteBlock + nodes.topRight] !== SITE.IMPASSABLE)
                        || (data[siteBlock + nodes.bottomLeft] !== SITE.IMPASSABLE)
                        || (data[siteBlock + nodes.bottomRight] !== SITE.IMPASSABLE)
                    ) {
                        // fish!
                        newResource = RESOURCE.FISH;
                        resources.fish++;
                    }
                } else if (textureFlag & TEXTURE.ROCK) {
                    // add coal / iron ore / gold / granite
                    newResource = seedMap[i] & 0x3F;
                    if(newResource < 0x20) {
                        newResource = RESOURCE.COAL | 0x07;
                        resources.mineCoal++;
                    } else if (newResource < 0x2E) {
                        newResource = RESOURCE.GOLD | 0x07;
                        resources.mineGold++;
                    } else if (newResource < 0x3C) {
                        newResource = RESOURCE.IRON_ORE | 0x07;
                        resources.mineIronOre++;
                    } else {
                        newResource = RESOURCE.GRANITE | 0x07;
                        resources.mineGranite++;
                    }
                } else if (textureFlag & TEXTURE.HABITABLE) {
                    if(textureFlag & TEXTURE.ARABLE) {
                        // fresh water!
                        newResource = RESOURCE.FRESH_WATER;
                        resources.freshWater++;
                    }
                }
            }

            data[resourceBlock + i] = newResource;
            // mark spot unfit for trees and granite
            if(data[siteBlock + i] === SITE.IMPASSABLE) {
                data[touchBlock + i] = 1;
            } else {
                usableLandmass++;
            }
        }

        // mark spots around headquarters unfir for trees and granite
        for(i = 0; i < players.length; i++) {
            nodes = map.getRadiusNodes(players[i].x, players[i].y, 5);
            for(j = 0; j < nodes.length; j++) {
                data[touchBlock + nodes[j]] = 1;
            }
            usableLandmass -= j;
        }

        // calculate target amounts for trees
        options.treeRatio = usableLandmass * options.treeRatio;

        // apply trees
        while(usableLandmass > 0 && resources.tree < options.treeRatio) {
            i = ~~(Math.random() * size);
            if(data[touchBlock + i] === 0) {
                nodes = map.getRadiusNodes(i % width, ~~((i - (i % width)) / width), seedMap[i] & 0x07);
                for(j = 0; j < nodes.length; j++) {
                    k = nodes[j];
                    // see if we this location is free to use
                    if(data[touchBlock + k] === 0) {
                        // random here avoids getting stuck...
                        if( (seedMap[k] & 0x03) || Math.random() < 0.2 ) {
                            // mark done
                            data[touchBlock + k] = 1;
                            // type
                            data[objectTypeBlock + k] = 0xC4;
                            // Pine / Birch / Oak / Palm 1
                            data[objectIndexBlock + k] = 0x30 + (~~(Math.random() * 4) * 0x40) + (~~(Math.random() * 0x08));
                            // increase counter
                            resources.tree++;
                            usableLandmass--;
                        }
                    }
                }
            }
        }

        // calculate target amounts for granite
        options.graniteRatio = usableLandmass * options.graniteRatio;

        // apply granite
        while(usableLandmass > 0 && resources.granite < options.graniteRatio) {
            i = ~~(Math.random() * size);
            if(data[touchBlock + i] === 0) {
                nodes = map.getRadiusNodes(i % width, ~~((i - (i % width)) / width), seedMap[i] & 0x07);
                for(j = 0; j < nodes.length; j++) {
                    k = nodes[j];
                    // see if we this location is free to use
                    if(data[touchBlock + k] === 0) {
                        // random here avoids getting stuck...
                        if( (seedMap[k] & 0x03) || Math.random() < 0.2 ) {
                            // mark done
                            data[touchBlock + k] = 1;
                            // type
                            data[objectTypeBlock + k] = 0xCC | (seedMap[k] & 0x01);
                            // quantity
                            data[objectIndexBlock + k] = ~~(Math.random() * 5) + 2;
                            // increase counter
                            resources.granite++;
                            usableLandmass--;
                        }
                    }
                }
            }
        }

        // clean up
        for(i = 0; i < size; i++) {
            data[touchBlock + i] = 0;
        }

        // must do this again now
        map.calculateSiteMap();

        console.timeEnd('applyResources')

        return resources;
    };

    var draw = function(options) {
        //if(!options || !options.length) options = {};
        // draw the stuff so we can see stuff
        var canvas = options.canvas,
            buffer = canvas.getContext('2d'),
            image = buffer.getImageData(0, 0, width, height),
            view = image.data,
            lightMapBlock = size * 12;

        canvas.width = width;
        canvas.height = height;

        viewType = options.viewType;
        options.terrain = ~~options.terrain || TERRAIN.GREENLAND;

        switch(viewType) {
        case 'seed':
            for(i = 0, j = 0; i < size; i++) {
                view[j++] = seedMap[i];
                view[j++] = seedMap[i];
                view[j++] = seedMap[i];
                view[j++] = 255;
            }

            nodes.forEach(function(i) {
                view[(i << 2)] = 96;
                view[(i << 2) + 1] = 176;
                view[(i << 2) + 2] = 255;
            });
            break;
        case 'height':
            for(i = 0, j = 0; i < size; i++) {
                if(data[i] === baseLevel && seedMap[i] < 2) {
                    view[j++] = 80;
                    view[j++] = 160;
                    view[j++] = 192;
                } else {
                    view[j++] = data[i] << 2;
                    view[j++] = data[i] << 2;
                    view[j++] = data[i] << 2;
                }
                view[j++] = 255;
            }
            break;
        case 'light':
            for(i = 0, j = 0; i < size; i++) {
                if(data[i] === baseLevel && seedMap[i] < 2) {
                    view[j++] = data[lightMapBlock + i] * 0.25 + 40;
                    view[j++] = data[lightMapBlock + i] * 0.75 + 80;
                    view[j++] = data[lightMapBlock + i] * 0.85 + 96;
                } else {
                    view[j++] = data[lightMapBlock + i] * 0.9 + 48;
                    view[j++] = data[lightMapBlock + i] * 1.1 + 32;
                    view[j++] = data[lightMapBlock + i] * 0.5 + 32;
                }
                view[j++] = 255;
            }
            break;
        case 'pretty':
            var color = colors[options.terrain].data,
                // row information so we can do some graphical adjustments
                y = -1,
                texture_color_merri = COLOR.MERRI[options.terrain],
                texture_color_original = COLOR.ORIGINAL[options.terrain],
                treeIndex, g, g2, c1, c2, c3, c4, c5, c6, c7, c8, c9, cA, cB, cC, j,
                color1, color2, color3, colorAlpha,
                drawNodes,
                leftNodes,
                textures,
                objectIndexBlock = size * 4,
                objectTypeBlock = size * 5,
                drawPos = 0;
    
            // and then we just loop through!
            for(i = 0; i < size; i++) {
                // keep track of current row
                if( i % width === 0) y++;
                drawNodes = map.getNodesByIndex(i);
                leftNodes = map.getNodesByIndex(drawNodes.left);
                // light and shadow calculation (not like the one in the game!)
                g = 96, j = data[i];
                g += 12 * (data[ drawNodes.topRight ] - j);
                g += 8 * (data[ drawNodes.topLeft ] - j);
                g -= 8 * (data[ drawNodes.left ] - j);
                g -= 16 * (data[ leftNodes.bottomLeft ] - j);
                // keep value within valid range
                g = Math.max(Math.min(255, g), 0);
                // grab some textures
                textures = map.getTexturesByIndex(i);
                // get a few color indexes...
                c1 = (g + 256 * texture_color_merri[ textures.topLeft ]) * 4;
                c2 = (g + 256 * texture_color_original[ textures.topLeft ]) * 4;
                c3 = (g + 256 * texture_color_merri[ textures.top ]) * 4;
                c4 = (g + 256 * texture_color_original[ textures.top ]) * 4;
                c5 = (g + 256 * texture_color_merri[ textures.topRight ]) * 4;
                c6 = (g + 256 * texture_color_original[ textures.topRight ]) * 4;
                c7 = (g + 256 * texture_color_merri[ textures.bottomLeft ]) * 4;
                c8 = (g + 256 * texture_color_original[ textures.bottomLeft ]) * 4;
                c9 = (g + 256 * texture_color_merri[ textures.bottom ]) * 4;
                cA = (g + 256 * texture_color_original[ textures.bottom ]) * 4;
                cB = (g + 256 * texture_color_merri[ textures.bottomRight ]) * 4;
                cC = (g + 256 * texture_color_original[ textures.bottomRight ]) * 4;
                // then make a color mixture...
                color1 = ((color[c1++] + color[c2++] + color[c3++] + color[c4++] + color[c5++] + color[c6++] + color[c7++] + color[c8++] + color[c9++] + color[cA++] + color[cB++] + color[cC++] ) / 12) | 0;
                color2 = ((color[c1++] + color[c2++] + color[c3++] + color[c4++] + color[c5++] + color[c6++] + color[c7++] + color[c8++] + color[c9++] + color[cA++] + color[cB++] + color[cC++] ) / 12) | 0;
                color3 = ((color[c1++] + color[c2++] + color[c3++] + color[c4++] + color[c5++] + color[c6++] + color[c7++] + color[c8++] + color[c9++] + color[cA++] + color[cB++] + color[cC++] ) / 12) | 0;
                // water is almost transparent (water only node = 255 - 160)
                colorAlpha = 255 - 30 * ((textures.topLeft === 5) + (textures.top === 5) + (textures.topRight === 5) + 
                    (textures.bottomLeft === 5) + (textures.bottom === 5) + (textures.bottomRight === 5));
                
                // not done yet! check for objects!
                switch(data[objectTypeBlock + i]) {
                // trees
                case 196:
                case 197:
                case 198:
                case 199:
                    treeIndex = ((data[objectTypeBlock + i] & 2) << 2) | ((data[objectIndexBlock + i] & 0xC0) >> 6);
                    g = TREE_INFO[options.terrain][treeIndex].ALPHA + (((data[objectIndexBlock + i] & 7) + 1) / 25) - 0.32;
                    g2 = (1 - g);
                    color1 = ~~(color1 * g2 + TREE_INFO[options.terrain][treeIndex].RED * g);
                    color2 = ~~(color2 * g2 + TREE_INFO[options.terrain][treeIndex].GREEN * g);
                    color3 = ~~(color3 * g2 + TREE_INFO[options.terrain][treeIndex].BLUE * g);
                    break;
                // granite
                case 204:
                case 205:
                    g = data[objectIndexBlock + i] / 10;
                    g2 = ((color1 + color2 + color3) / 3 + 64 ) * g;
                    color1 = Math.min(255, color1 * (1 - g) + g2);
                    color2 = Math.min(255, color2 * (1 - g) + g2);
                    color3 = Math.min(255, color3 * (1 - g) + g2);
                    break;
                }
                view[drawPos++] = color1;
                view[drawPos++] = color2;
                view[drawPos++] = color3;
                view[drawPos++] = colorAlpha;
            }
            break;
        default:
            console.log('WTF');
        }
        
        buffer.putImageData(image, 0, 0);
    }

    function veryInefficientStringToCP437(text, length) {
        var output = [],
            code;
        for(i = 0; i < length; i++) {
            code = CP437.indexOf(~~text.charCodeAt(i));
            if(code > -1) output.push(code);
            else output.push(0xDB);
        }
        return output;
    }

    var getFileBlob = function(options) {
        // 2577 => header 2352
        //       + block headers 16 * 14 = 224
        //       + footer 0xFF
        var areas,
            buffer = new ArrayBuffer(2577 + size * 14),
            view = new DataView(buffer),
            byteView = void 0,
            pos = 0,
            i,
            objectIndexBlock = size * 4,
            objectTypeBlock = size * 5;

        options = options || {};

        options.title = options.title || 'Unknown map'
        options.author = options.author || 'Merri\'sMapGenerator';
        options.terrain = ~~options.terrain || TERRAIN.GREENLAND;
        // WORLD_V1.0
        view.setUint8(pos++, 0x57);
        view.setUint8(pos++, 0x4F);
        view.setUint8(pos++, 0x52);
        view.setUint8(pos++, 0x4C);
        view.setUint8(pos++, 0x44);
        view.setUint8(pos++, 0x5F);
        view.setUint8(pos++, 0x56);
        view.setUint8(pos++, 0x31);
        view.setUint8(pos++, 0x2E);
        view.setUint8(pos++, 0x30);
        // TITLE
        veryInefficientStringToCP437(options.title, 19).forEach(function(character) {
            view.setUint8(pos++, character);
        });
        view.setUint8(pos++, 0);
        // WIDTH & HEIGHT
        view.setUint16(pos++, width, true);
        pos++;
        view.setUint16(pos++, height, true);
        pos++;
        // TERRAIN
        view.setUint8(pos++, options.terrain);
        // PLAYER COUNT
        view.setUint8(pos++, players.length);
        // AUTHOR
        veryInefficientStringToCP437(options.author, 19).forEach(function(character) {
            view.setUint8(pos++, character);
        });
        view.setUint8(pos++, 0);
        // HEADQUARTERS
        if(players.length > 0) {
            view.setUint16(pos, players[0].x, true);
            view.setUint16(pos + 14, players[0].y, true);
        } else {
            view.setUint16(pos, 0xFFFF, true);
            view.setUint16(pos + 14, 0xFFFF, true);
        }
        
        if(players.length > 1) {
            view.setUint16(pos + 2, players[1].x, true);
            view.setUint16(pos + 16, players[1].y, true);
        } else {
            view.setUint16(pos + 2, 0xFFFF, true);
            view.setUint16(pos + 16, 0xFFFF, true);
        }
        
        if(players.length > 2) {
            view.setUint16(pos + 4, players[2].x, true);
            view.setUint16(pos + 18, players[2].y, true);
        } else {
            view.setUint16(pos + 4, 0xFFFF, true);
            view.setUint16(pos + 18, 0xFFFF, true);
        }
        
        if(players.length > 3) {
            view.setUint16(pos + 6, players[3].x, true);
            view.setUint16(pos + 20, players[3].y, true);
        } else {
            view.setUint16(pos + 6, 0xFFFF, true);
            view.setUint16(pos + 20, 0xFFFF, true);
        }
        
        if(players.length > 4) {
            view.setUint16(pos + 8, players[4].x, true);
            view.setUint16(pos + 22, players[4].y, true);
        } else {
            view.setUint16(pos + 8, 0xFFFF, true);
            view.setUint16(pos + 22, 0xFFFF, true);
        }
        
        if(players.length > 5) {
            view.setUint16(pos + 10, players[5].x, true);
            view.setUint16(pos + 24, players[5].y, true);
        } else {
            view.setUint16(pos + 10, 0xFFFF, true);
            view.setUint16(pos + 24, 0xFFFF, true);
        }
        
        if(players.length > 6) {
            view.setUint16(pos + 12, players[6].x, true);
            view.setUint16(pos + 26, players[6].y, true);
        } else {
            view.setUint16(pos + 12, 0xFFFF, true);
            view.setUint16(pos + 26, 0xFFFF, true);
        }

        pos += 28;

        // set object types and indexes for players
        for(i = 0; i < players.length; i++) {
            data[objectIndexBlock + players[i].index] = i;
            data[objectTypeBlock + players[i].index] = 0x80;
        }

        // UNPLAYABILITY INDICATOR
        view.setUint8(pos++, 0, true);
        // LEADER FACES
        view.setUint8(pos++, 0);
        view.setUint8(pos++, 3);
        view.setUint8(pos++, 6);
        view.setUint8(pos++, 9);
        view.setUint8(pos++, 1);
        view.setUint8(pos++, 4);
        view.setUint8(pos++, 7);

        // GET AREAS
        areas = map.calculateAreaMap();

        // SET AREAS
        for(i = 0; i < Math.min(areas.length, 250); i++) {
            view.setUint8(pos++, areas[i].type);
            view.setUint16(pos++, areas[i].x, true);
            pos++;
            view.setUint16(pos++, areas[i].y, true);
            pos++;
            view.setUint32(pos, areas[i].mass, true);
            pos+=4;
        }

        // SKIP UNUSED AREAS
        pos += (250 - i) * 9;

        // MAP FILE IDENTIFICATION
        view.setUint8(pos++, 0x11);
        view.setUint8(pos++, 0x27);
        view.setUint32(pos, 0, true);
        pos += 4;
        view.setUint16(pos++, width, true);
        pos++;
        view.setUint16(pos++, height, true);
        pos++;
        // MAP DATA
        for(i = 0; i < 14; i++) {
            view.setUint8(pos++, 0x10);
            view.setUint8(pos++, 0x27);
            view.setUint32(pos, 0);
            pos += 4;
            view.setUint16(pos++, width, true);
            pos++;
            view.setUint16(pos++, height, true);
            pos++;
            view.setUint16(pos++, 1, true);
            pos++;
            view.setUint32(pos, size, true);
            pos += 4;
            byteView = new Uint8Array(buffer, pos, size);
            pos += size;
            byteView.set(data.subarray(i * size, (i + 1) * size));
        }
        // END OF FILE
        view.setUint8(pos++, 0xFF);

        // restore object types and indexes for players
        for(i = 0; i < players.length; i++) {
            data[objectIndexBlock + players[i].index] = 0;
            data[objectTypeBlock + players[i].index] = 0;
        }

        // we are done!
        return new Blob([new Uint8Array(buffer)], {type: 'application/octet-binary'});
    }

    var isReadyToDraw = function() {
        return colorMap;
    };

    var setColorMap = function(name) {
        return new Promise(function(resolve, reject) {
            colorMap = document.createElement('img');

            colorMap.onload = function(e) {
                // create a canvas where we can get our needs
                var buffer,
                    canvas = document.createElement('canvas');

                try {
                    canvas.width = 256;
                    canvas.height = 768;
                    // get drawing context
                    buffer = canvas.getContext('2d');
                    // and draw the image
                    buffer.drawImage(e.target, 0, 0);
                    // greenland
                    colors[0] = buffer.getImageData(0, 0, 256, 256);
                    // wasteland
                    colors[1] = buffer.getImageData(0, 256, 256, 256);
                    // winter world
                    colors[2] = buffer.getImageData(0, 512, 256, 256);
                    // mark as done
                    colorMap = true;
                    // resolve promise with colors array
                    resolve(colors);
                } catch(err) {
                    colorMap = false;
                    // just pass the error
                    reject(err);
                }
            };

            colorMap.onerror = reject;

            switch(name) {
                case 'alternative':
                    colorMap.src = './lightmap_index_alternative.png';
                    break;
                case 'high-contrast':
                    colorMap.src = './lightmap_index_high-contrast.png';
                    break;
                default:
                    colorMap.src = './lightmap_index.png';
            }
        });
    };

    return {
        applyResources: applyResources,
        createBaseTextures: createBaseTextures,
        createHeight: createHeight,
        draw: draw,
        getFileBlob: getFileBlob,
        getRandomPlayerPositions: getRandomPlayerPositions,
        isReadyToDraw: isReadyToDraw,
        seed: seed,
        setColorMap: setColorMap
    };
};

module.exports = Generator;
},{"./constants":"c:\\Users\\Merri\\documents\\git\\map-generator\\src\\constants.js","./map":"c:\\Users\\Merri\\documents\\git\\map-generator\\src\\map.js","promise":"c:\\Users\\Merri\\documents\\git\\map-generator\\node_modules\\promise\\index.js"}],"c:\\Users\\Merri\\AppData\\Roaming\\npm\\node_modules\\watchify\\node_modules\\browserify\\node_modules\\process\\browser.js":[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],"c:\\Users\\Merri\\documents\\git\\map-generator\\node_modules\\promise\\core.js":[function(require,module,exports){
'use strict';

var asap = require('asap')

module.exports = Promise
function Promise(fn) {
  if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
  if (typeof fn !== 'function') throw new TypeError('not a function')
  var state = null
  var value = null
  var deferreds = []
  var self = this

  this.then = function(onFulfilled, onRejected) {
    return new Promise(function(resolve, reject) {
      handle(new Handler(onFulfilled, onRejected, resolve, reject))
    })
  }

  function handle(deferred) {
    if (state === null) {
      deferreds.push(deferred)
      return
    }
    asap(function() {
      var cb = state ? deferred.onFulfilled : deferred.onRejected
      if (cb === null) {
        (state ? deferred.resolve : deferred.reject)(value)
        return
      }
      var ret
      try {
        ret = cb(value)
      }
      catch (e) {
        deferred.reject(e)
        return
      }
      deferred.resolve(ret)
    })
  }

  function resolve(newValue) {
    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.')
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then
        if (typeof then === 'function') {
          doResolve(then.bind(newValue), resolve, reject)
          return
        }
      }
      state = true
      value = newValue
      finale()
    } catch (e) { reject(e) }
  }

  function reject(newValue) {
    state = false
    value = newValue
    finale()
  }

  function finale() {
    for (var i = 0, len = deferreds.length; i < len; i++)
      handle(deferreds[i])
    deferreds = null
  }

  doResolve(fn, resolve, reject)
}


function Handler(onFulfilled, onRejected, resolve, reject){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.resolve = resolve
  this.reject = reject
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, onFulfilled, onRejected) {
  var done = false;
  try {
    fn(function (value) {
      if (done) return
      done = true
      onFulfilled(value)
    }, function (reason) {
      if (done) return
      done = true
      onRejected(reason)
    })
  } catch (ex) {
    if (done) return
    done = true
    onRejected(ex)
  }
}

},{"asap":"c:\\Users\\Merri\\documents\\git\\map-generator\\node_modules\\promise\\node_modules\\asap\\asap.js"}],"c:\\Users\\Merri\\documents\\git\\map-generator\\node_modules\\promise\\index.js":[function(require,module,exports){
'use strict';

//This file contains then/promise specific extensions to the core promise API

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise

/* Static Functions */

function ValuePromise(value) {
  this.then = function (onFulfilled) {
    if (typeof onFulfilled !== 'function') return this
    return new Promise(function (resolve, reject) {
      asap(function () {
        try {
          resolve(onFulfilled(value))
        } catch (ex) {
          reject(ex);
        }
      })
    })
  }
}
ValuePromise.prototype = Object.create(Promise.prototype)

var TRUE = new ValuePromise(true)
var FALSE = new ValuePromise(false)
var NULL = new ValuePromise(null)
var UNDEFINED = new ValuePromise(undefined)
var ZERO = new ValuePromise(0)
var EMPTYSTRING = new ValuePromise('')

Promise.resolve = function (value) {
  if (value instanceof Promise) return value

  if (value === null) return NULL
  if (value === undefined) return UNDEFINED
  if (value === true) return TRUE
  if (value === false) return FALSE
  if (value === 0) return ZERO
  if (value === '') return EMPTYSTRING

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex)
      })
    }
  }

  return new ValuePromise(value)
}

Promise.from = Promise.cast = function (value) {
  var err = new Error('Promise.from and Promise.cast are deprecated, use Promise.resolve instead')
  err.name = 'Warning'
  console.warn(err.stack)
  return Promise.resolve(value)
}

Promise.denodeify = function (fn, argumentCount) {
  argumentCount = argumentCount || Infinity
  return function () {
    var self = this
    var args = Array.prototype.slice.call(arguments)
    return new Promise(function (resolve, reject) {
      while (args.length && args.length > argumentCount) {
        args.pop()
      }
      args.push(function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
      fn.apply(self, args)
    })
  }
}
Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
    try {
      return fn.apply(this, arguments).nodeify(callback)
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) { reject(ex) })
      } else {
        asap(function () {
          callback(ex)
        })
      }
    }
  }
}

Promise.all = function () {
  var calledWithArray = arguments.length === 1 && Array.isArray(arguments[0])
  var args = Array.prototype.slice.call(calledWithArray ? arguments[0] : arguments)

  if (!calledWithArray) {
    var err = new Error('Promise.all should be called with a single array, calling it with multiple arguments is deprecated')
    err.name = 'Warning'
    console.warn(err.stack)
  }

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([])
    var remaining = args.length
    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then
          if (typeof then === 'function') {
            then.call(val, function (val) { res(i, val) }, reject)
            return
          }
        }
        args[i] = val
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex)
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i])
    }
  })
}

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) { 
    reject(value);
  });
}

Promise.race = function (values) {
  return new Promise(function (resolve, reject) { 
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    })
  });
}

/* Prototype Methods */

Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this
  self.then(null, function (err) {
    asap(function () {
      throw err
    })
  })
}

Promise.prototype.nodeify = function (callback) {
  if (typeof callback != 'function') return this

  this.then(function (value) {
    asap(function () {
      callback(null, value)
    })
  }, function (err) {
    asap(function () {
      callback(err)
    })
  })
}

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
}

},{"./core.js":"c:\\Users\\Merri\\documents\\git\\map-generator\\node_modules\\promise\\core.js","asap":"c:\\Users\\Merri\\documents\\git\\map-generator\\node_modules\\promise\\node_modules\\asap\\asap.js"}],"c:\\Users\\Merri\\documents\\git\\map-generator\\node_modules\\promise\\node_modules\\asap\\asap.js":[function(require,module,exports){
(function (process){

// Use the fastest possible means to execute a task in a future turn
// of the event loop.

// linked list of tasks (single, with head node)
var head = {task: void 0, next: null};
var tail = head;
var flushing = false;
var requestFlush = void 0;
var isNodeJS = false;

function flush() {
    /* jshint loopfunc: true */

    while (head.next) {
        head = head.next;
        var task = head.task;
        head.task = void 0;
        var domain = head.domain;

        if (domain) {
            head.domain = void 0;
            domain.enter();
        }

        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function() {
                   throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    flushing = false;
}

if (typeof process !== "undefined" && process.nextTick) {
    // Node.js before 0.9. Note that some fake-Node environments, like the
    // Mocha test runner, introduce a `process` global without a `nextTick`.
    isNodeJS = true;

    requestFlush = function () {
        process.nextTick(flush);
    };

} else if (typeof setImmediate === "function") {
    // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
    if (typeof window !== "undefined") {
        requestFlush = setImmediate.bind(window, flush);
    } else {
        requestFlush = function () {
            setImmediate(flush);
        };
    }

} else if (typeof MessageChannel !== "undefined") {
    // modern browsers
    // http://www.nonblocking.io/2011/06/windownexttick.html
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    requestFlush = function () {
        channel.port2.postMessage(0);
    };

} else {
    // old browsers
    requestFlush = function () {
        setTimeout(flush, 0);
    };
}

function asap(task) {
    tail = tail.next = {
        task: task,
        domain: isNodeJS && process.domain,
        next: null
    };

    if (!flushing) {
        flushing = true;
        requestFlush();
    }
};

module.exports = asap;


}).call(this,require('_process'))
},{"_process":"c:\\Users\\Merri\\AppData\\Roaming\\npm\\node_modules\\watchify\\node_modules\\browserify\\node_modules\\process\\browser.js"}],"c:\\Users\\Merri\\documents\\git\\map-generator\\src\\constants.js":[function(require,module,exports){
'use strict';

var AREA = {
    UNUSED: 0,
    LAND: 1,
    WATER: 2,
    IMPASSABLE: 254
};

var COLOR = {
    ORIGINAL: [
        [233, 216, 123, 233, 199, 240, 240, 199, 231, 233, 230, 216, 216, 215, 236, 231, 57, 254, 216, 240, 57, 57, 57,0xFF,0xFF,0xFF,0xFF,
        0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,216,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
        0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
        [114, 167, 139, 160, 85, 42, 42, 85, 165, 166, 166, 33, 212, 212, 167, 114, 248, 254, 160, 42, 248, 248, 248,0xFF,0xFF,0xFF,0xFF,
        0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,33,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
        0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
        [123, 116, 244, 244, 183, 240, 240, 183, 36, 102, 123, 117, 118, 118, 233, 120, 248, 254, 122, 240, 248, 248, 248,0xFF,0xFF,0xFF,
        0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,117,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
        0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF]
    ],
    MERRI: [
        [236, 195, 124, 231, 199, 242, 242, 199, 233, 232, 231, 195, 194, 193, 217, 232, 249, 254, 169, 242, 249, 249, 249,0xFF,0xFF,0xFF,
        0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,195,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
        0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
        [98, 145, 23, 41, 85, 42, 42, 85, 32, 166, 33, 113, 245, 41, 34, 33, 251, 254, 97, 42, 251, 251, 251,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
        0xFF,0xFF,0xFF,0xFF,0xFF,113,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
        0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
        [122, 118, 179, 178, 182, 242, 242, 182, 122, 172, 101, 120, 144, 119, 171, 101, 249, 252, 123, 242, 249, 249, 249,0xFF,0xFF,0xFF,
        0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,120,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
        0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF]
    ]
};

var CP437 = [0, 9786, 9787, 9829, 9830, 9827, 9824, 8226, 9688, 9675, 9689, 9794, 9792, 9834, 9835, 9788, 9658, 9668, 8597, 8252, 182, 167,
    9644, 8616, 8593, 8595, 8594, 8592, 8735, 8596, 9650, 9660, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
    52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86,
    87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117,
    118, 119, 120, 121, 122, 123, 124, 125, 126, 8962, 199, 252, 233, 226, 228, 224, 229, 231, 234, 235, 232, 239, 238, 236, 196, 197, 201, 230,
    198, 244, 246, 242, 251, 249, 255, 214, 220, 162, 163, 165, 8359, 402, 225, 237, 243, 250, 241, 209, 170, 186, 191, 8976, 172, 189, 188, 161,
    171, 187, 9617, 9618, 9619, 9474, 9508, 9569, 9570, 9558, 9557, 9571, 9553, 9559, 9565, 9564, 9563, 9488, 9492, 9524, 9516, 9500, 37, 37,
    9566, 567, 9562, 9556, 9577, 9574, 9568, 9552, 9580, 9575, 9576, 9572, 9573, 9561, 9560, 9554, 9555, 9579, 9578, 9496, 9484, 9608, 9604,
    9612, 9616, 9600, 945, 223, 915, 960, 931, 963, 181, 964, 934, 920, 937, 948, 8734, 966, 949, 8745, 8801, 177, 8805, 8804, 8992, 8993, 247,
    8776, 176, 8729, 183, 8730, 8319, 178, 9632, 160];

var OBJECT_TYPE = {
    TREE: 0xC4,
    GRANITE: 0xCC,
    MATCH: 0xFC
};

var RESOURCE = {
    FRESH_WATER: 0x21,
    COAL: 0x40, // 0x40 - 0x47
    IRON_ORE: 0x48, // 0x48 - 0x4F
    GOLD: 0x50, // 0x50 - 0x57
    GRANITE: 0x58, // 0x58 - 0x5F
    FISH: 0x87
};

var SITE = {
    FLAG: 0x01,
    HUT: 0x02,
    HOUSE: 0x03,
    CASTLE: 0x04,
    MINE: 0x05,
    OCCUPIED: 0x08,
    FLAG_OCCUPIED: 0x09,
    HUT_OCCUPIED: 0x0A,
    CASTLE_OCCUPIED: 0x0C,
    MINE_OCCUPIED: 0x0D,
    TREE: 0x68,
    IMPASSABLE: 0x78
};

var TERRAIN = {
    GREENLAND: 0,
    WASTELAND: 1,
    WINTERWORLD: 2
};

var TEXTURE = {
    SUPPORT_S2: 0x01,   // texture is usable in The Settlers II
    SUPPORT_RTTR: 0x02, // texture is usable in Return to the Roots
    ARABLE: 0x04,       // you can expect farm fields to grow here
    HABITABLE: 0x08,    // you can build buildings here
    ARID: 0x10,         // it's too hard to build anything here, but you can make roads
    ROCK: 0x20,         // mines be here
    WET: 0x40,          // swamp and water
    EXTREME: 0x80,      // snow and lava
    IMPASSABLE: 0xC0,   // bitflag for matching WET and EXTREME for all areas that not usable for the player

    // for actual texture ID matching
    TO_ID_VALUE: 0x3F,  // bitflag for removing two highest bits that are used for bitflags!
    HARBOR: 0x40,       // this is the other bitflag for the two highest bits
    UNKNOWN: 0x80,      // we do not know the meaning of this bitflag; only exists on one or two BlueByte maps
    DROP_SUPPORT: 0xFC  // to get rid of support flags
};

var TEXTURE_INFO = {
    0: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.ARABLE | TEXTURE.HABITABLE,
        NAME: {
            0: 'Savannah',
            1: 'Dark Steppe',
            2: 'Taiga'
        }
    },
    1: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.ROCK,
        NAME: {
            0: 'Mountain #1',
            1: 'Mountain #1',
            2: 'Mountain #1'
        }
    },
    2: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.EXTREME,
        NAME: {
            0: 'Snow',
            1: 'Lava Stones',
            2: 'Pack Ice'
        }
    },
    3: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.WET,
        NAME: {
            0: 'Swamp',
            1: 'Lava Ground',
            2: 'Drift Ice'
        }
    },
    4: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.ARID,
        NAME: {
            0: 'Desert',
            1: 'Wasteland',
            2: 'Ice'
        }
    },
    5: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.WET,
        NAME: {
            0: 'Water',
            1: 'Moor',
            2: 'Water'
        }
    },
    6: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.HABITABLE,
        NAME: {
            0: 'Habitable Water',
            1: 'Habitable Moor',
            2: 'Habitable Water'
        }
    },
    7: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.ARID,
        NAME: {
            0: 'Clone Desert',
            1: 'Clone Wasteland',
            2: 'Clone Ice'
        }
    },
    8: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.ARABLE | TEXTURE.HABITABLE,
        NAME: {
            0: 'Meadow #1',
            1: 'Pasture #1',
            2: 'Taiga / Tundra'
        }
    },
    9: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.ARABLE | TEXTURE.HABITABLE,
        NAME: {
            0: 'Meadow #2',
            1: 'Pasture #2',
            2: 'Tundra #1'
        }
    },
    10: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.ARABLE | TEXTURE.HABITABLE,
        NAME: {
            0: 'Meadow #3',
            1: 'Pasture #3',
            2: 'Tundra #2'
        }
    },
    11: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.ROCK,
        NAME: {
            0: 'Mountain #2',
            1: 'Mountain #2',
            2: 'Mountain #2'
        }
    },
    12: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.ROCK,
        NAME: {
            0: 'Mountain #3',
            1: 'Mountain #3',
            2: 'Mountain #3'
        }
    },
    13: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.ROCK,
        NAME: {
            0: 'Mountain #4',
            1: 'Mountain #4',
            2: 'Mountain #4'
        }
    },
    14: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.ARABLE | TEXTURE.HABITABLE,
        NAME: {
            0: 'Steppe',
            1: 'Light Steppe',
            2: 'Tundra #3'
        }
    },
    15: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.ARABLE | TEXTURE.HABITABLE,
        NAME: {
            0: 'Flower Meadow',
            1: 'Flower Pasture',
            2: 'Tundra #4'
        }
    },
    16: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.EXTREME,
        NAME: {
            0: 'Lava',
            1: 'Lava',
            2: 'Lava'
        }
    },
    17: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.ARID,
        NAME: {
            0: 'Solid Color (Magenta)',
            1: 'Solid Color (Dark Red)',
            2: 'Solid Color (Black)'
        }
    },
    18: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.SUPPORT_RTTR | TEXTURE.HABITABLE,
        NAME: {
            0: 'Mountain Meadow',
            1: 'Alpine Pasture',
            2: 'Snow'
        }
    },
    19: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.EXTREME,
        NAME: {
            0: 'Border Water',
            1: 'Border Moor',
            2: 'Border Water'
        }
    },
    20: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.EXTREME,
        NAME: {
            0: 'Solid Color Lava #1 (Magenta)',
            1: 'Solid Color Lava #1 (Dark Red)',
            2: 'Solid Color Lava #1 (Black)'
        }
    },
    21: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.EXTREME,
        NAME: {
            0: 'Solid Color Lava #2 (Magenta)',
            1: 'Solid Color Lava #2 (Dark Red)',
            2: 'Solid Color Lava #2 (Black)'
        }
    },
    22: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.EXTREME,
        NAME: {
            0: 'Solid Color Lava #3 (Magenta)',
            1: 'Solid Color Lava #3 (Dark Red)',
            2: 'Solid Color Lava #3 (Black)'
        }
    },
    34: {
        FLAG: TEXTURE.SUPPORT_S2 | TEXTURE.HABITABLE,
        NAME: {
            0: 'Mountain #2 (Habitable)',
            1: 'Mountain #2 (Habitable)',
            2: 'Mountain #2 (Habitable)'
        }
    }
}

var TREE_INFO = [
    [
        {
            RED: 21,
            GREEN: 73,
            BLUE: 15,
            ALPHA: 0.62352941176470588235294117647059,
            NAME: 'Pine'
        },
        {
            RED: 23,
            GREEN: 70,
            BLUE: 27,
            ALPHA: 0.55686274509803921568627450980392,
            NAME: 'Birch'
        },
        {
            RED: 21,
            GREEN: 65,
            BLUE: 16,
            ALPHA: 0.70196078431372549019607843137255,
            NAME: 'Oak'
        },
        {
            RED: 48,
            GREEN: 87,
            BLUE: 24,
            ALPHA: 0.32549019607843137254901960784314,
            NAME: 'Palm 1'
        },
        {
            RED: 42,
            GREEN: 78,
            BLUE: 19,
            ALPHA: 0.25490196078431372549019607843137,
            NAME: 'Palm 2'
        },
        {
            RED: 34,
            GREEN: 73,
            BLUE: 19,
            ALPHA: 0.36470588235294117647058823529412,
            NAME: 'Pine Apple'
        },
        {
            RED: 34,
            GREEN: 71,
            BLUE: 18,
            ALPHA: 0.45882352941176470588235294117647,
            NAME: 'Cypress'
        },
        {
            RED: 131,
            GREEN: 53,
            BLUE: 36,
            ALPHA: 0.38431372549019607843137254901961,
            NAME: 'Cherry'
        },
        {
            RED: 20,
            GREEN: 78,
            BLUE: 18,
            ALPHA: 0.46274509803921568627450980392157,
            NAME: 'Fir'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #1'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #2'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #3'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #4'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #5'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #6'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #7'
        }
    ], [
        {
            RED: 117,
            GREEN: 80,
            BLUE: 62,
            ALPHA: 0.38431372549019607843137254901961,
            NAME: 'Spider'
        },
        {
            RED: 127,
            GREEN: 70,
            BLUE: 49,
            ALPHA: 0.45490196078431372549019607843137,
            NAME: 'Marley'
        },
        {
            RED: 117,
            GREEN: 80,
            BLUE: 62,
            ALPHA: 0.38431372549019607843137254901961,
            NAME: 'Clone Spider #1'
        },
        {
            RED: 127,
            GREEN: 70,
            BLUE: 49,
            ALPHA: 0.45490196078431372549019607843137,
            NAME: 'Clone Marley #1'
        },
        {
            RED: 117,
            GREEN: 80,
            BLUE: 62,
            ALPHA: 0.38431372549019607843137254901961,
            NAME: 'Clone Spider #2'
        },
        {
            RED: 34,
            GREEN: 73,
            BLUE: 19,
            ALPHA: 0.36470588235294117647058823529412,
            NAME: 'Pine Apple'
        },
        {
            RED: 117,
            GREEN: 80,
            BLUE: 62,
            ALPHA: 0.38431372549019607843137254901961,
            NAME: 'Clone Spider #3'
        },
        {
            RED: 131,
            GREEN: 53,
            BLUE: 36,
            ALPHA: 0.38431372549019607843137254901961,
            NAME: 'Cherry'
        },
        {
            RED: 127,
            GREEN: 70,
            BLUE: 49,
            ALPHA: 0.45490196078431372549019607843137,
            NAME: 'Clone Marley #2'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #1'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #2'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #3'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #4'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #5'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #6'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #7'
        }
    ], [
        {
            RED: 88,
            GREEN: 99,
            BLUE: 77,
            ALPHA: 0.50196078431372549019607843137255,
            NAME: 'Pine'
        },
        {
            RED: 63,
            GREEN: 82,
            BLUE: 58,
            ALPHA: 0.49019607843137254901960784313725,
            NAME: 'Birch'
        },
        {
            RED: 77,
            GREEN: 94,
            BLUE: 60,
            ALPHA: 0.4078431372549019607843137254902,
            NAME: 'Fir'
        },
        {
            RED: 48,
            GREEN: 87,
            BLUE: 24,
            ALPHA: 0.32549019607843137254901960784314,
            NAME: 'Palm 1'
        },
        {
            RED: 42,
            GREEN: 78,
            BLUE: 19,
            ALPHA: 0.25490196078431372549019607843137,
            NAME: 'Palm 2'
        },
        {
            RED: 34,
            GREEN: 73,
            BLUE: 19,
            ALPHA: 0.36470588235294117647058823529412,
            NAME: 'Pine Apple'
        },
        {
            RED: 83,
            GREEN: 85,
            BLUE: 58,
            ALPHA: 0.41176470588235294117647058823529,
            NAME: 'Cypress'
        },
        {
            RED: 77,
            GREEN: 94,
            BLUE: 60,
            ALPHA: 0.4078431372549019607843137254902,
            NAME: 'Clone Fir #1'
        },
        {
            RED: 77,
            GREEN: 94,
            BLUE: 60,
            ALPHA: 0.4078431372549019607843137254902,
            NAME: 'Clone Fir #2'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #1'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #2'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #3'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #4'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #5'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #6'
        },
        {
            RED: 0,
            GREEN: 0,
            BLUE: 0,
            ALPHA: 0.1,
            NAME: 'Unused #7'
        }
    ]
];

exports.AREA = AREA;
exports.CP437 = CP437;
exports.COLOR = COLOR;
exports.OBJECT_TYPE = OBJECT_TYPE;
exports.RESOURCE = RESOURCE;
exports.SITE = SITE;
exports.TERRAIN = TERRAIN;
exports.TEXTURE = TEXTURE;
exports.TEXTURE_INFO = TEXTURE_INFO;
exports.TREE_INFO = TREE_INFO;

},{}],"c:\\Users\\Merri\\documents\\git\\map-generator\\src\\map.js":[function(require,module,exports){
'use strict';

var constants = require('./constants'),
    AREA = constants.AREA,
    OBJECT_TYPE = constants.OBJECT_TYPE,
    RESOURCE = constants.RESOURCE,
    SITE = constants.SITE,
    TERRAIN = constants.TERRAIN,
    TEXTURE = constants.TEXTURE,
    TEXTURE_INFO = constants.TEXTURE_INFO;

// internal constants
var MAX_ELEVATION = 5,
    MAX_HEIGHT = 60,
    // bitflags for marking touch level
    TOUCH_MARKED = 0x01,
    TOUCH_FROM_RIGHT = 0x02,
    TOUCH_FROM_LEFT = 0x04,
    TOUCH_FROM_BOTTOM_RIGHT = 0x08,
    TOUCH_FROM_TOP_LEFT = 0x10,
    TOUCH_FROM_BOTTOM_LEFT = 0x20,
    TOUCH_FROM_TOP_RIGHT = 0x40,
    // calculateAreaMap
    EXTREME_AND_WET = TEXTURE.EXTREME | TEXTURE.WET;

var Map = function(width, height) {
    var _width = Math.abs(~~width) & 0x0FFC,
        _height = Math.abs(~~height) & 0x0FFC,
        _size = _width * _height,
        // storage for raw map data
        _rawMapBuffer = new ArrayBuffer(_size * 14),
        _rawMap = new Uint8Array(_rawMapBuffer),
        // fast helper cache
        _cache32bit = new Uint32Array(_size),
        // other cache
        _lastTextureIndex,
        _lastTextureTopLeft,
        _lastTextureTop,
        _lastTextureTopRight,
        _lastTextureBottomLeft,
        _lastTextureBottom,
        _lastTextureBottomRight,
        // indexes to each block
        _blockHeight = 0,
        _blockTextures = _size,
        _blockTex1 = _size,
        _blockTex2 = _size * 2,
        _blockRoad = _size * 3,
        _blockObjIdx = _size * 4,
        _blockObjType = _size * 5,
        _blockAnimals = _size * 6,
        _blockEmpty = _size * 7,    // unknown; always empty in WLD/SWD
        _blockSites = _size * 8,
        _blockOfSeven = _size * 9,  // everything is always 7 in WLD/SWD
        _blockTouch = _size * 10,   // used here for temporary bitflagging and marking stuff
        _blockRes = _size * 11,
        _blockLight = _size * 12,
        _blockArea = _size * 13;

    // always seven
    for(var i = _blockOfSeven; i < _blockOfSeven + _size; i++) {
        _rawMap[i] = 7;
    }

    var calculateAreaMap = function() {
        var i,
            index = 0,
            areas = [],
            bitMask,
            current,
            nodes,
            mass,
            textures,
            total;

        for(i = 0; i < _size; i++) {
            if(_rawMap[_blockTouch + i] === 0x00) {
                // see if it is water
                if(index < 250 && isEachTextureSame(i, 0x05)) {
                    // so we start looping water
                    _rawMap[_blockArea + i] = index;
                    _rawMap[_blockTouch + i] = 1;
                    mass = 1;
                    // add index and bitmask while also reseting a few variables
                    _cache32bit[current = total = 0] = (i << 6) | 0x3F;
                    // this loop here is unoptimal, but does the job
                    while(current <= total) {
                        // bitmask for nodes to follow (small optimization: always three bits active, one for each direction)
                        bitMask = _cache32bit[current] & 0x3F;
                        // get the nodes around
                        nodes = getNodesByIndex((_cache32bit[current++] & 0xFFFFFFC0) >> 6);
                        // check points for matching land/water
                        if((bitMask & 0x01) === 0x01 && _rawMap[_blockTouch + nodes.left] === 0x00 && isEachTextureSame(nodes.left, 0x05)) {
                            _cache32bit[++total] = (nodes.left << 6) | 0x23;
                            _rawMap[_blockArea + nodes.left] = index;
                            _rawMap[_blockTouch + nodes.left] = 1;
                            mass++;
                        }
                        if((bitMask & 0x02) === 0x02 && _rawMap[_blockTouch + nodes.topLeft] === 0x00 && isEachTextureSame(nodes.topLeft, 0x05)) {
                            _cache32bit[++total] = (nodes.topLeft << 6) | 0x07;
                            _rawMap[_blockArea + nodes.topLeft] = index;
                            _rawMap[_blockTouch + nodes.topLeft] = 1;
                            mass++;
                        }
                        if((bitMask & 0x04) === 0x04 && _rawMap[_blockTouch + nodes.topRight] === 0x00 && isEachTextureSame(nodes.topRight, 0x05)) {
                            _cache32bit[++total] = (nodes.topRight << 6) | 0x0E;
                            _rawMap[_blockArea + nodes.topRight] = index;
                            _rawMap[_blockTouch + nodes.topRight] = 1;
                            mass++;
                        }
                        if((bitMask & 0x08) === 0x08 && _rawMap[_blockTouch + nodes.right] === 0x00 && isEachTextureSame(nodes.right, 0x05)) {
                            _cache32bit[++total] = (nodes.right << 6) | 0x1C;
                            _rawMap[_blockArea + nodes.right] = index;
                            _rawMap[_blockTouch + nodes.right] = 1;
                            mass++;
                        }
                        if((bitMask & 0x10) === 0x10 && _rawMap[_blockTouch + nodes.bottomRight] === 0x00 && isEachTextureSame(nodes.bottomRight, 0x05)) {
                            _cache32bit[++total] = (nodes.bottomRight << 6) | 0x38;
                            _rawMap[_blockArea + nodes.bottomRight] = index;
                            _rawMap[_blockTouch + nodes.bottomRight] = 1;
                            mass++;
                        }
                        if((bitMask & 0x20) === 0x20 && _rawMap[_blockTouch + nodes.bottomLeft] === 0x00 && isEachTextureSame(nodes.bottomLeft, 0x05)) {
                            _cache32bit[++total] = (nodes.bottomLeft << 6) | 0x31;
                            _rawMap[_blockArea + nodes.bottomLeft] = index;
                            _rawMap[_blockTouch + nodes.bottomLeft] = 1;
                            mass++;
                        }
                    }
                    areas[index] = {
                        mass: mass,
                        type: AREA.WATER,
                        x: i % _width,
                        y: ~~((i - (i % _width)) / _width)
                    };
                    // next index
                    index++;
                } else if(isEachTextureWithAnyOfFlags(i, EXTREME_AND_WET)) {
                    _rawMap[_blockArea + i] = AREA.IMPASSABLE;
                    _rawMap[_blockTouch + i] = 1;
                } else if(index < 250) {
                    // so we start looping land
                    _rawMap[_blockArea + i] = index;
                    _rawMap[_blockTouch + i] = 1;
                    mass = 1;
                    // add index and bitmask while also reseting a few variables
                    _cache32bit[current = total = 0] = (i << 6) | 0x3F;
                    // this loop here is unoptimal, but does the job
                    while(current <= total) {
                        // bitmask for nodes to follow (small optimization: always three bits active, one for each direction)
                        bitMask = _cache32bit[current] & 0x3F;
                        // get the nodes around
                        nodes = getNodesByIndex((_cache32bit[current++] & 0xFFFFFFC0) >> 6);
                        // check points for matching land/water
                        if((bitMask & 0x01) === 0x01 && _rawMap[_blockTouch + nodes.left] === 0x00 && !isEachTextureWithAnyOfFlags(nodes.left, EXTREME_AND_WET)) {
                            _cache32bit[++total] = (nodes.left << 6) | 0x23; // topLeft, left, bottomLeft
                            _rawMap[_blockArea + nodes.left] = index;
                            _rawMap[_blockTouch + nodes.left] = 1;
                            mass++;
                        }
                        if((bitMask & 0x02) === 0x02 && _rawMap[_blockTouch + nodes.topLeft] === 0x00 && !isEachTextureWithAnyOfFlags(nodes.topLeft, EXTREME_AND_WET)) {
                            _cache32bit[++total] = (nodes.topLeft << 6) | 0x07; // left, topLeft, topRight
                            _rawMap[_blockArea + nodes.topLeft] = index;
                            _rawMap[_blockTouch + nodes.topLeft] = 1;
                            mass++;
                        }
                        if((bitMask & 0x04) === 0x04 && _rawMap[_blockTouch + nodes.topRight] === 0x00 && !isEachTextureWithAnyOfFlags(nodes.topRight, EXTREME_AND_WET)) {
                            _cache32bit[++total] = (nodes.topRight << 6) | 0x0E; // topLeft, topRight, right
                            _rawMap[_blockArea + nodes.topRight] = index;
                            _rawMap[_blockTouch + nodes.topRight] = 1;
                            mass++;
                        }
                        if((bitMask & 0x08) === 0x08 && _rawMap[_blockTouch + nodes.right] === 0x00 && !isEachTextureWithAnyOfFlags(nodes.right, EXTREME_AND_WET)) {
                            _cache32bit[++total] = (nodes.right << 6) | 0x1C; // topRight, right, bottomRight
                            _rawMap[_blockArea + nodes.right] = index;
                            _rawMap[_blockTouch + nodes.right] = 1;
                            mass++;
                        }
                        if((bitMask & 0x10) === 0x10 && _rawMap[_blockTouch + nodes.bottomRight] === 0x00 && !isEachTextureWithAnyOfFlags(nodes.bottomRight, EXTREME_AND_WET)) {
                            _cache32bit[++total] = (nodes.bottomRight << 6) | 0x38; // right, bottomRight, bottomLeft
                            _rawMap[_blockArea + nodes.bottomRight] = index;
                            _rawMap[_blockTouch + nodes.bottomRight] = 1;
                            mass++;
                        }
                        if((bitMask & 0x20) === 0x20 && _rawMap[_blockTouch + nodes.bottomLeft] === 0x00 && !isEachTextureWithAnyOfFlags(nodes.bottomLeft, EXTREME_AND_WET)) {
                            _cache32bit[++total] = (nodes.bottomLeft << 6) | 0x31; // bottomRight, bottomLeft, left
                            _rawMap[_blockArea + nodes.bottomLeft] = index;
                            _rawMap[_blockTouch + nodes.bottomLeft] = 1;
                            mass++;
                        }
                    }
                    areas[index] = {
                        mass: mass,
                        type: AREA.LAND,
                        x: i % _width,
                        y: ~~((i - (i % _width)) / _width)
                    };
                    // next index
                    index++;
                } else {
                    areas[index] = {
                        mass: 0,
                        type: AREA.UNUSED,
                        x: i % _width,
                        y: ~~((i - (i % _width)) / _width)
                    }
                    // next index
                    index++;
                }
            }
        }

        //  cleanup
        for(i = 0; i < _size; i++) {
            _rawMap[_blockTouch + i] = 0;
        }

        return areas;
    };

    var calculateLightMap = function() {
        var around,
            aroundLeft,
            i,
            j,
            k;

        for(i = 0; i < _size; i++) {
            j = 64;
            k = _rawMap[_blockHeight + i];
            around = getNodesByIndex(i);
            aroundLeft = getNodesByIndex(around.left);
            j += 9 * (_rawMap[_blockHeight + around.topRight] - k);
            j -= 6 * (_rawMap[_blockHeight + around.left] - k);
            j -= 3 * (_rawMap[_blockHeight + aroundLeft.left] - k);
            j -= 9 * (_rawMap[_blockHeight + aroundLeft.bottomLeft] - k);
            _rawMap[_blockLight + i] = Math.max(Math.min(128, j), 0);
        }
    };

    var calculateSiteMap = function() {
        var i,
            mines = 0,
            node = 0,
            nodes,
            radiusNodes,
            tex1,
            tex2,
            tex3,
            tex4,
            tex5,
            tex6,
            tex7,
            tex8,
            tex9,
            texA,
            texNodes,
            waters = 0;

        // needs further investigation to the rules of original game; 99.9% correct for generated maps, but lacks information of ingame objects...
        for(i = 0; i < _size; i++) {
            // cache nearby nodes
            nodes = getNodesByIndex(i);
            // cache texture information
            texNodes = getTextureNodesByIndex(i);
            tex1 = _rawMap[_blockTextures + texNodes.topLeft] & TEXTURE.TO_ID_VALUE;
            tex2 = _rawMap[_blockTextures + texNodes.top] & TEXTURE.TO_ID_VALUE;
            tex3 = _rawMap[_blockTextures + texNodes.topRight] & TEXTURE.TO_ID_VALUE;
            tex4 = _rawMap[_blockTextures + texNodes.bottomLeft] & TEXTURE.TO_ID_VALUE;
            tex5 = _rawMap[_blockTextures + texNodes.bottom] & TEXTURE.TO_ID_VALUE;
            tex6 = _rawMap[_blockTextures + texNodes.bottomRight] & TEXTURE.TO_ID_VALUE;
            texNodes = getTextureNodesByIndex(nodes.bottomRight);
            tex7 = _rawMap[_blockTextures + texNodes.topRight] & TEXTURE.TO_ID_VALUE;
            tex8 = _rawMap[_blockTextures + texNodes.bottomLeft] & TEXTURE.TO_ID_VALUE;
            tex9 = _rawMap[_blockTextures + texNodes.bottom] & TEXTURE.TO_ID_VALUE;
            texA = _rawMap[_blockTextures + texNodes.bottomRight] & TEXTURE.TO_ID_VALUE;

            if ( ((TEXTURE_INFO[tex1].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                || ((TEXTURE_INFO[tex2].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                || ((TEXTURE_INFO[tex3].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                || ((TEXTURE_INFO[tex4].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                || ((TEXTURE_INFO[tex5].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                || ((TEXTURE_INFO[tex6].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                // water or swamp
                || 6 === (waters = ((TEXTURE_INFO[tex1].FLAG & TEXTURE.WET) === TEXTURE.WET)
                + ((TEXTURE_INFO[tex2].FLAG & TEXTURE.WET) === TEXTURE.WET)
                + ((TEXTURE_INFO[tex3].FLAG & TEXTURE.WET) === TEXTURE.WET)
                + ((TEXTURE_INFO[tex4].FLAG & TEXTURE.WET) === TEXTURE.WET)
                + ((TEXTURE_INFO[tex5].FLAG & TEXTURE.WET) === TEXTURE.WET)
                + ((TEXTURE_INFO[tex6].FLAG & TEXTURE.WET) === TEXTURE.WET) )
                // granite
                || ((_rawMap[_blockObjType + i] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.GRANITE)
            ) {

                _rawMap[_blockSites + i] = SITE.IMPASSABLE;

            } else if ( (_rawMap[_blockObjType + i] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.TREE ) {

                _rawMap[_blockSites + i] = SITE.TREE;

            } else if (
                // water nearby?
                waters > 0
                // granite nearby?
                || (_rawMap[_blockObjType + nodes.left] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.GRANITE
                || (_rawMap[_blockObjType + nodes.right] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.GRANITE
                || (_rawMap[_blockObjType + nodes.topLeft] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.GRANITE
                || (_rawMap[_blockObjType + nodes.topRight] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.GRANITE
                || (_rawMap[_blockObjType + nodes.bottomLeft] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.GRANITE
                || (_rawMap[_blockObjType + nodes.bottomRight] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.GRANITE
                // any texture that forces flags
                || ((TEXTURE_INFO[tex1].FLAG & TEXTURE.ARID) === TEXTURE.ARID)
                || ((TEXTURE_INFO[tex2].FLAG & TEXTURE.ARID) === TEXTURE.ARID)
                || ((TEXTURE_INFO[tex3].FLAG & TEXTURE.ARID) === TEXTURE.ARID)
                || ((TEXTURE_INFO[tex4].FLAG & TEXTURE.ARID) === TEXTURE.ARID)
                || ((TEXTURE_INFO[tex5].FLAG & TEXTURE.ARID) === TEXTURE.ARID)
                || ((TEXTURE_INFO[tex6].FLAG & TEXTURE.ARID) === TEXTURE.ARID)
            ) {

                // point next to a swamp, water (outdated comment? "or there is a tree in bottom right point!")
                _rawMap[_blockSites + i] = SITE.FLAG_OCCUPIED;

            } else if ( 6 === (mines = ((TEXTURE_INFO[tex1].FLAG & TEXTURE.ROCK) === TEXTURE.ROCK)
                + ((TEXTURE_INFO[tex2].FLAG & TEXTURE.ROCK) === TEXTURE.ROCK)
                + ((TEXTURE_INFO[tex3].FLAG & TEXTURE.ROCK) === TEXTURE.ROCK)
                + ((TEXTURE_INFO[tex4].FLAG & TEXTURE.ROCK) === TEXTURE.ROCK)
                + ((TEXTURE_INFO[tex5].FLAG & TEXTURE.ROCK) === TEXTURE.ROCK)
                + ((TEXTURE_INFO[tex6].FLAG & TEXTURE.ROCK) === TEXTURE.ROCK) )
                // but some height rules apply to mines as well
                && (_rawMap[i] - _rawMap[nodes.bottomRight]) >= -3
            ) {
                if ( ((TEXTURE_INFO[tex7].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                    || ((TEXTURE_INFO[tex8].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                    || ((TEXTURE_INFO[tex9].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                    || ((TEXTURE_INFO[texA].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                    || ((_rawMap[_blockObjType + nodes.bottomRight] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.TREE)
                ) {
                    // snow or lava too close or a tree
                    _rawMap[_blockSites + i] = SITE.FLAG_OCCUPIED;
                } else {
                    // woohoo, a mine!
                    _rawMap[_blockSites + i] = SITE.MINE_OCCUPIED;
                }
            } else if ( mines > 0 ) {

                _rawMap[_blockSites + i] = SITE.FLAG_OCCUPIED;

            } else if (
                ((_rawMap[_blockObjType + nodes.bottomRight] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.TREE)
                // height differences
                || ((_rawMap[i] - _rawMap[nodes.bottomRight]) > 3)
                || ((_rawMap[nodes.bottomRight] - _rawMap[i]) > 1)
                || (Math.abs(_rawMap[i] - _rawMap[nodes.topLeft]) > 3)
                || (Math.abs(_rawMap[i] - _rawMap[nodes.topRight]) > 3)
                || (Math.abs(_rawMap[i] - _rawMap[nodes.left]) > 3)
                || (Math.abs(_rawMap[i] - _rawMap[nodes.right]) > 3)
                || (Math.abs(_rawMap[i] - _rawMap[nodes.bottomLeft]) > 3)
            ) {
                // so we can build a road, check for mountain meadow
                if (tex1 === 0x12 || tex2 === 0x12 || tex3 === 0x12 || tex4 === 0x12 || tex5 === 0x12 || tex6 === 0x12) {

                    _rawMap[_blockSites + i] = SITE.FLAG_OCCUPIED;

                } else {

                    _rawMap[_blockSites + i] = SITE.FLAG;

                }
            } else if ( ((TEXTURE_INFO[tex7].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                || ((TEXTURE_INFO[tex8].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                || ((TEXTURE_INFO[tex9].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
                || ((TEXTURE_INFO[texA].FLAG & TEXTURE.EXTREME) === TEXTURE.EXTREME)
            ) {

                _rawMap[_blockSites + i] = SITE.FLAG_OCCUPIED;

            } else if ( ((_rawMap[_blockObjType + nodes.topLeft] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.TREE)
                || ((_rawMap[_blockObjType + nodes.topRight] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.TREE)
                || ((_rawMap[_blockObjType + nodes.left] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.TREE)
                || ((_rawMap[_blockObjType + nodes.right] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.TREE)
                || ((_rawMap[_blockObjType + nodes.bottomLeft] & OBJECT_TYPE.MATCH) === OBJECT_TYPE.TREE)
                // or a too big height difference further away, so first get some nodes for us to work with
                || !(radiusNodes = getRadiusNodes(i % _width, ~~((i - (i % _width)) / _width), 2, true))
                || (Math.abs(_rawMap[i] - _rawMap[radiusNodes[0]]) > 2)
                || (Math.abs(_rawMap[i] - _rawMap[radiusNodes[1]]) > 2)
                || (Math.abs(_rawMap[i] - _rawMap[radiusNodes[2]]) > 2)
                || (Math.abs(_rawMap[i] - _rawMap[radiusNodes[3]]) > 2)
                || (Math.abs(_rawMap[i] - _rawMap[radiusNodes[4]]) > 2)
                || (Math.abs(_rawMap[i] - _rawMap[radiusNodes[5]]) > 2)
                || (Math.abs(_rawMap[i] - _rawMap[radiusNodes[6]]) > 2)
                || (Math.abs(_rawMap[i] - _rawMap[radiusNodes[7]]) > 2)
                || (Math.abs(_rawMap[i] - _rawMap[radiusNodes[8]]) > 2)
                || (Math.abs(_rawMap[i] - _rawMap[radiusNodes[9]]) > 2)
                || (Math.abs(_rawMap[i] - _rawMap[radiusNodes[10]]) > 2)
                || (Math.abs(_rawMap[i] - _rawMap[radiusNodes[11]]) > 2)
            ) {
                // can build a hut, check for mountain meadow texture
                if (tex1 === 0x12 || tex2 === 0x12 || tex3 === 0x12 || tex4 === 0x12 || tex5 === 0x12 || tex6 === 0x12) {

                    _rawMap[_blockSites + i] = SITE.HUT_OCCUPIED;

                } else {

                    _rawMap[_blockSites + i] = SITE.HUT;

                }
            } else {
                // can build a castle, check for mountain meadow texture
                if (tex1 === 0x12 || tex2 === 0x12 || tex3 === 0x12 || tex4 === 0x12 || tex5 === 0x12 || tex6 === 0x12) {

                    _rawMap[_blockSites + i] = SITE.CASTLE_OCCUPIED;

                } else {

                    _rawMap[_blockSites + i] = SITE.CASTLE;

                }
            }
        }
    };

    // TODO: replace mark array with _cache32bit to improve performance
    var changeHeight = function(x, y, radius, strength) {
        var newHeight,
            nodes,
            diff,
            maxDiff,
            i,
            j,
            k,
            index,
            around,
            mark = [],
            marked;
        // sanitize
        strength = ~~strength;
        radius = Math.abs(~~radius);
        // optimize for speed by reducing unnecessary processing related to being positive or negative
        if(strength < 0) {
            if(strength < -MAX_ELEVATION) strength = -MAX_ELEVATION;
            nodes = getRadiusNodes(x, y, radius);
            for(i = 0; i < nodes.length; i++) {
                index = nodes[i];
                newHeight = _rawMap[index] + strength;
                if(newHeight < 0) newHeight = 0;
                // any change?
                if(_rawMap[index] !== newHeight) {
                    _rawMap[index] = newHeight;
                    // get nodes around the current index
                    around = getNodesByIndex(index);
                    // store in an array that we use to clean up the _blockTouch
                    if(_rawMap[_blockTouch + index] === 0) mark.push(index);
                    if(_rawMap[_blockTouch + around.left] === 0) mark.push(around.left);
                    if(_rawMap[_blockTouch + around.right] === 0) mark.push(around.right);
                    if(_rawMap[_blockTouch + around.topLeft] === 0) mark.push(around.topLeft);
                    if(_rawMap[_blockTouch + around.topRight] === 0) mark.push(around.topRight);
                    if(_rawMap[_blockTouch + around.bottomLeft] === 0) mark.push(around.bottomLeft);
                    if(_rawMap[_blockTouch + around.bottomRight] === 0) mark.push(around.bottomRight);
                    // mark the level of touch so we know how to avoid doing unnecessary work
                    _rawMap[_blockTouch + index] |= TOUCH_MARKED;
                    _rawMap[_blockTouch + around.left] |= TOUCH_FROM_RIGHT;
                    _rawMap[_blockTouch + around.right] |= TOUCH_FROM_LEFT;
                    _rawMap[_blockTouch + around.topLeft] |= TOUCH_FROM_BOTTOM_RIGHT;
                    _rawMap[_blockTouch + around.bottomRight] |= TOUCH_FROM_TOP_LEFT;
                    _rawMap[_blockTouch + around.topRight] |= TOUCH_FROM_BOTTOM_LEFT;
                    _rawMap[_blockTouch + around.bottomLeft] |= TOUCH_FROM_TOP_RIGHT;
                }
            }
            marked = nodes.length;
        } else if(strength > 0) {
            if(strength > MAX_ELEVATION) strength = MAX_ELEVATION;
            nodes = getRadiusNodes(x, y, radius);
            for(i = 0; i < nodes.length; i++) {
                index = nodes[i];
                newHeight = _rawMap[index] + strength;
                if(newHeight > MAX_HEIGHT) newHeight = MAX_HEIGHT;
                // any change?
                if(_rawMap[index] !== newHeight) {
                    _rawMap[index] = newHeight;
                    // get nodes around the current index
                    around = getNodesByIndex(index);
                    // store in an array that we use to clean up the _blockTouch
                    if(_rawMap[_blockTouch + index] === 0) mark.push(index);
                    if(_rawMap[_blockTouch + around.left] === 0) mark.push(around.left);
                    if(_rawMap[_blockTouch + around.right] === 0) mark.push(around.right);
                    if(_rawMap[_blockTouch + around.topLeft] === 0) mark.push(around.topLeft);
                    if(_rawMap[_blockTouch + around.topRight] === 0) mark.push(around.topRight);
                    if(_rawMap[_blockTouch + around.bottomLeft] === 0) mark.push(around.bottomLeft);
                    if(_rawMap[_blockTouch + around.bottomRight] === 0) mark.push(around.bottomRight);
                    // mark the level of touch so we know how to avoid doing unnecessary work
                    _rawMap[_blockTouch + index] |= TOUCH_MARKED;
                    _rawMap[_blockTouch + around.left] |= TOUCH_FROM_RIGHT;
                    _rawMap[_blockTouch + around.right] |= TOUCH_FROM_LEFT;
                    _rawMap[_blockTouch + around.topLeft] |= TOUCH_FROM_BOTTOM_RIGHT;
                    _rawMap[_blockTouch + around.bottomRight] |= TOUCH_FROM_TOP_LEFT;
                    _rawMap[_blockTouch + around.topRight] |= TOUCH_FROM_BOTTOM_LEFT;
                    _rawMap[_blockTouch + around.bottomLeft] |= TOUCH_FROM_TOP_RIGHT;
                }
            }
            marked = nodes.length;
        }
        while(mark.length > marked) {
            for(i = 0; i < mark.length; i++) {
                index = mark[i];
                j = _rawMap[_blockTouch + index];
                // are we done with this node already?
                if((j & TOUCH_MARKED) === 0) {
                    // we have processed it now!
                    _rawMap[_blockTouch + index] |= TOUCH_MARKED;
                    marked++;
                    // reset difference indicator
                    maxDiff = 0;
                    // cache the current value
                    k = _rawMap[index];
                    // get the surrounding nodes
                    around = getNodesByIndex(index);
                    // see if we need to adjust the elevation of this node
                    if(j & TOUCH_FROM_RIGHT) {
                        diff = k - _rawMap[around.right];
                        if(Math.abs(diff) > MAX_ELEVATION && Math.abs(diff) > Math.abs(maxDiff)) maxDiff = diff;
                    }
                    if(j & TOUCH_FROM_LEFT) {
                        diff = k - _rawMap[around.left];
                        if(Math.abs(diff) > MAX_ELEVATION && Math.abs(diff) > Math.abs(maxDiff)) maxDiff = diff;
                    }
                    if(j & TOUCH_FROM_TOP_LEFT) {
                        diff = k - _rawMap[around.topLeft];
                        if(Math.abs(diff) > MAX_ELEVATION && Math.abs(diff) > Math.abs(maxDiff)) maxDiff = diff;
                    }
                    if(j & TOUCH_FROM_BOTTOM_RIGHT) {
                        diff = k - _rawMap[around.bottomRight];
                        if(Math.abs(diff) > MAX_ELEVATION && Math.abs(diff) > Math.abs(maxDiff)) maxDiff = diff;
                    }
                    if(j & TOUCH_FROM_TOP_RIGHT) {
                        diff = k - _rawMap[around.topRight];
                        if(Math.abs(diff) > MAX_ELEVATION && Math.abs(diff) > Math.abs(maxDiff)) maxDiff = diff;
                    }
                    if(j & TOUCH_FROM_BOTTOM_LEFT) {
                        diff = k - _rawMap[around.bottomLeft];
                        if(Math.abs(diff) > MAX_ELEVATION && Math.abs(diff) > Math.abs(maxDiff)) maxDiff = diff;
                    }
                    // okay, do we have anything to change in this node?
                    if(maxDiff) {
                        // calculate how much to change the height in this node
                        if(maxDiff < 0) maxDiff += MAX_ELEVATION;
                        else if(maxDiff > 0) maxDiff -= MAX_ELEVATION;
                        // now we know how much change has to be done
                        newHeight = k - maxDiff;
                        // TODO: commented out because these two lines should never get executed anyway, so remove later?
                        //if(newHeight < 0) { newHeight = 0; }
                        //else if(newHeight > MAX_HEIGHT) { newHeight = MAX_HEIGHT; }
                        // it is always a good idea to draw your changes
                        _rawMap[index] = newHeight;
                        // mark the level of touch so we know how to avoid doing unnecessary work
                        if((j & TOUCH_FROM_LEFT) === 0) {
                            if(_rawMap[_blockTouch + around.left] === 0) mark.push(around.left);
                            _rawMap[_blockTouch + around.left] |= TOUCH_FROM_RIGHT;
                        }
                        if((j & TOUCH_FROM_RIGHT) === 0) {
                            if(_rawMap[_blockTouch + around.right] === 0) mark.push(around.right);
                            _rawMap[_blockTouch + around.right] |= TOUCH_FROM_LEFT;
                        }
                        if((j & TOUCH_FROM_TOP_LEFT) === 0) {
                            if(_rawMap[_blockTouch + around.topLeft] === 0) mark.push(around.topLeft);
                            _rawMap[_blockTouch + around.topLeft] |= TOUCH_FROM_BOTTOM_RIGHT;
                        }
                        if((j & TOUCH_FROM_BOTTOM_RIGHT) === 0) {
                            if(_rawMap[_blockTouch + around.bottomRight] === 0) mark.push(around.bottomRight);
                            _rawMap[_blockTouch + around.bottomRight] |= TOUCH_FROM_TOP_LEFT;
                        }
                        if((j & TOUCH_FROM_TOP_RIGHT) === 0) {
                            if(_rawMap[_blockTouch + around.topRight] === 0) mark.push(around.topRight);
                            _rawMap[_blockTouch + around.topRight] |= TOUCH_FROM_BOTTOM_LEFT;
                        }
                        if((j & TOUCH_FROM_BOTTOM_LEFT) === 0) {
                            if(_rawMap[_blockTouch + around.bottomLeft] === 0) mark.push(around.bottomLeft);
                            _rawMap[_blockTouch + around.bottomLeft] |= TOUCH_FROM_TOP_RIGHT;
                        }
                    }
                }
            }
        }
        // clean our changes in the touch block
        for(i = 0; i < mark.length; i++) {
            _rawMap[_blockTouch + mark[i]] = 0;
        }
    };

    var getAllSitesOfType = function(siteType, strictMode) {
        var i,
            mask = 0xFF,
            sites = [];

        if(!strictMode && (siteType & 0xF0) === 0) {
            mask = 0x0F;
            siteType &= mask;
        }

        for(i = 0; i < _size; i++) {
            if((_rawMap[_blockSites + i] & mask) === siteType) {
                sites.push(i);
            }
        }

        return sites;
    };

    var getBlock = function(index) {
        index = ~~index;
        if(index >= 0 && index <= 13) {
            return _rawMap.subarray(index * _size, ++index * _size);
        }
    };

    var getNodesByIndex = function(index) {
        var x = index % _width,
            y = (index - x) / _width,
            xL = (x > 0 ? x : _width) - 1,
            xR = (x + 1) % _width,
            yT = ((y > 0 ? y : _height) - 1) * _width,
            yB = ((y + 1) % _height) * _width,
            odd = (y & 1) === 1;

        y *= _width;

        if(odd) {
            // odd
            return {
                left: y + xL,
                right: y + xR,
                topLeft: yT + x,
                topRight: yT + xR,
                bottomLeft: yB + x,
                bottomRight: yB + xR
            }
        } else {
            // even
            return {
                left: y + xL,
                right: y + xR,
                topLeft: yT + xL,
                topRight: yT + x,
                bottomLeft: yB + xL,
                bottomRight: yB + x
            }
        }
    };

    // return array of indexes for nearby points
    // outset = boolean, return only the outermost radius points
    var getRadiusNodes = function(x, y, radius, outset, buffer) {
        var nodes,
            i,
            j,
            k = 0,
            l,
            m,
            first = 0,
            last = 0,
            removeLast = 1 === (y & 1),
            xCache,
            yCache,
            maxRadius;

        // sanitize input
        radius = Math.abs(~~radius);
        outset = !!outset;
        // see if we add the point itself to result blocks
        if(radius === 0) {
            nodes = new Uint32Array(buffer || 1);
            nodes[0] = y * _width + x;
        // make sure the radius does not overlap itself
        } else {
            // some limits have to be in place
            maxRadius = ~~((Math.min(_width, _height) - 2) / 2);
            if(radius > maxRadius) radius = maxRadius;
            // cache X and Y values to avoid recalculating all the time
            xCache = new Uint32Array(radius * 2 + 1);
            yCache = new Uint32Array(radius * 2 + 1);
            // see if we need to care about borders
            if((x - radius) >= 0 && (y - radius) >= 0 && (x + radius) < _width && (y + radius) < _height) {
                // we are nowhere close
                for(j = 0, i = -radius; i <= radius; i++) {
                    xCache[j] = x + i;
                    yCache[j++] = y + i;
                }
            } else {
                // have to play it safe
                for(j = 0, i = -radius; i <= radius; i++) {
                    xCache[j] = (_width + x + i) % _width;
                    yCache[j++] = (_height + y + i) % _height;
                }
            }
            // last index in X
            last = radius * 2;
            // all nodes or only the edge nodes?
            if(!outset) {
                // calculate the total size of resulting array
                nodes = new Uint32Array(buffer || 1 + 6 * (radius * (radius + 1) >> 1));
                // start pushing out the results
                for(i = 0; i < xCache.length; i++) {
                    nodes[k++] = yCache[radius] * _width + xCache[i];
                }
                // then all the other Y rows
                for(j = 1; j <= radius; j++) {
                    if(removeLast) {
                        last--;
                    } else {
                        first++;
                    }
                    removeLast = !removeLast;
                    l = yCache[radius - j] * _width;
                    m = yCache[radius + j] * _width;
                    for(i = first; i <= last; i++) {
                        nodes[k++] = l + xCache[i];
                        nodes[k++] = m + xCache[i];
                    }
                }
            } else {
                // calculate the total size of resulting array
                nodes = new Uint32Array(buffer || 6 * radius);
                // current line first and last
                nodes[k++] = yCache[radius] * _width + xCache[first];
                nodes[k++] = yCache[radius] * _width + xCache[last];
                // first and last on all lines except the topmost and bottommost row
                for(j = 1; j < radius; j++) {
                    if(removeLast) {
                        last--;
                    } else {
                        first++;
                    }
                    removeLast = !removeLast;
                    l = yCache[radius - j] * _width;
                    m = yCache[radius + j] * _width;
                    nodes[k++] = l + xCache[first];
                    nodes[k++] = l + xCache[last];
                    nodes[k++] = m + xCache[first];
                    nodes[k++] = m + xCache[last];
                }
                // all nodes in topmost and bottommost row
                if(removeLast) {
                    last--;
                } else {
                    first++;
                }
                l = yCache[radius - j] * _width;
                m = yCache[radius + j] * _width;
                for(i = first; i <= last; i++) {
                    nodes[k++] = l + xCache[i];
                    nodes[k++] = m + xCache[i];
                }
            }
        }

        return nodes;
    };

    var getRawData = function() {
        return _rawMap;
    };

    var getTextureNodesByIndex = function(index) {
        var x = index % _width,
            y = (index - x) / _width,
            xL = (x > 0 ? x : _width) - 1,
            xR,
            yT = ((y > 0 ? y : _height) - 1) * _width,
            odd = (y & 1) === 1;

        y *= _width;

        if(odd) {
            // only needed here
            xR = (x + 1) % _width
            // odd
            return {
                bottomLeft: y + xL + _size,
                bottom: index,
                bottomRight: index + _size,
                topLeft: yT + x,
                top: yT + x + _size,
                topRight: yT + xR
            }
        } else {
            // even
            return {
                bottomLeft: y + xL + _size,
                bottom: index,
                bottomRight: index + _size,
                topLeft: yT + xL,
                top: yT + xL + _size,
                topRight: yT + x
            }
        }
    };

    // will not maintain harbor flag
    var getTexturesByIndex = function(index) {
        var nodes = getTextureNodesByIndex(index);

        return {
            topLeft: _rawMap[_blockTextures + nodes.topLeft] & TEXTURE.TO_ID_VALUE,
            top: _rawMap[_blockTextures + nodes.top] & TEXTURE.TO_ID_VALUE,
            topRight: _rawMap[_blockTextures + nodes.topRight] & TEXTURE.TO_ID_VALUE,
            bottomLeft: _rawMap[_blockTextures + nodes.bottomLeft] & TEXTURE.TO_ID_VALUE,
            bottom: _rawMap[_blockTextures + nodes.bottom] & TEXTURE.TO_ID_VALUE,
            bottomRight: _rawMap[_blockTextures + nodes.bottomRight] & TEXTURE.TO_ID_VALUE
        }
    };

    // flats out the height map, doesn't do anything else
    var initializeHeight = function(baseLevel) {
        var i;

        baseLevel = ~~baseLevel;

        if(baseLevel < 0) baseLevel = 0;
        else if(baseLevel > MAX_HEIGHT) baseLevel = MAX_HEIGHT;

        for(i = 0; i < _size; i++) {
            _rawMap[_blockHeight + i] = baseLevel;
        }
    };

    var initializeTexture = function(texture) {
        var i;
        // sanitize
        texture = Math.abs(~~texture) & TEXTURE.TO_ID_VALUE;
        // is this a known texture?
        if(TEXTURE_INFO[texture]) {
            for(i = 0; i < _size * 2; i++) {
                _rawMap[_blockTextures + i] = texture;
            }
        }
    };

    var isEachTextureSame = function(index, texture) {
        var nodes,
            topLeft,
            top,
            topRight,
            bottomLeft,
            bottom,
            bottomRight;

        if(_lastTextureIndex === index) {
            topLeft = _lastTextureTopLeft;
            top = _lastTextureTop;
            topRight = _lastTextureTopRight;
            bottomLeft = _lastTextureBottomLeft;
            bottom = _lastTextureBottom;
            bottomRight = _lastTextureBottomRight;
        } else {
            nodes = getTextureNodesByIndex(index);
            _lastTextureIndex = index;
            _lastTextureTopLeft     = topLeft     = _rawMap[_blockTextures + nodes.topLeft    ] & TEXTURE.TO_ID_VALUE;
            _lastTextureTop         = top         = _rawMap[_blockTextures + nodes.top        ] & TEXTURE.TO_ID_VALUE;
            _lastTextureTopRight    = topRight    = _rawMap[_blockTextures + nodes.topRight   ] & TEXTURE.TO_ID_VALUE;
            _lastTextureBottomLeft  = bottomLeft  = _rawMap[_blockTextures + nodes.bottomLeft ] & TEXTURE.TO_ID_VALUE;
            _lastTextureBottom      = bottom      = _rawMap[_blockTextures + nodes.bottom     ] & TEXTURE.TO_ID_VALUE;
            _lastTextureBottomRight = bottomRight = _rawMap[_blockTextures + nodes.bottomRight] & TEXTURE.TO_ID_VALUE;
        }

        return (topLeft === texture)
            && (top === texture)
            && (topRight === texture)
            && (bottomLeft === texture)
            && (bottom === texture)
            && (bottomRight === texture);
    };

    var isEachTextureWithAnyOfFlags = function(index, flags) {
        var nodes,
            topLeft,
            top,
            topRight,
            bottomLeft,
            bottom,
            bottomRight;

        if(_lastTextureIndex === index) {
            topLeft = _lastTextureTopLeft;
            top = _lastTextureTop;
            topRight = _lastTextureTopRight;
            bottomLeft = _lastTextureBottomLeft;
            bottom = _lastTextureBottom;
            bottomRight = _lastTextureBottomRight;
        } else {
            nodes = getTextureNodesByIndex(index);
            _lastTextureIndex = index;
            _lastTextureTopLeft     = topLeft     = _rawMap[_blockTextures + nodes.topLeft    ] & TEXTURE.TO_ID_VALUE;
            _lastTextureTop         = top         = _rawMap[_blockTextures + nodes.top        ] & TEXTURE.TO_ID_VALUE;
            _lastTextureTopRight    = topRight    = _rawMap[_blockTextures + nodes.topRight   ] & TEXTURE.TO_ID_VALUE;
            _lastTextureBottomLeft  = bottomLeft  = _rawMap[_blockTextures + nodes.bottomLeft ] & TEXTURE.TO_ID_VALUE;
            _lastTextureBottom      = bottom      = _rawMap[_blockTextures + nodes.bottom     ] & TEXTURE.TO_ID_VALUE;
            _lastTextureBottomRight = bottomRight = _rawMap[_blockTextures + nodes.bottomRight] & TEXTURE.TO_ID_VALUE;
        }

        return !!(TEXTURE_INFO[topLeft    ].FLAG & flags)
            && !!(TEXTURE_INFO[top        ].FLAG & flags)
            && !!(TEXTURE_INFO[topRight   ].FLAG & flags)
            && !!(TEXTURE_INFO[bottomLeft ].FLAG & flags)
            && !!(TEXTURE_INFO[bottom     ].FLAG & flags)
            && !!(TEXTURE_INFO[bottomRight].FLAG & flags);
    };

    var setTexture = function(index, texture) {
        var nodes;
        // sanitize
        texture = Math.abs(~~texture);
        // is this a known texture?
        if(TEXTURE_INFO[texture]) {
            nodes = getTextureNodesByIndex(index);
            _rawMap[_blockTextures + nodes.bottomLeft] = texture;
            _rawMap[_blockTextures + nodes.bottom] = texture;
            _rawMap[_blockTextures + nodes.bottomRight] = texture;
            _rawMap[_blockTextures + nodes.topLeft] = texture;
            _rawMap[_blockTextures + nodes.top] = texture;
            _rawMap[_blockTextures + nodes.topRight] = texture;
        }
    };

    return {
        calculateAreaMap: calculateAreaMap,
        calculateLightMap: calculateLightMap,
        calculateSiteMap: calculateSiteMap,
        changeHeight: changeHeight,
        getAllSitesOfType: getAllSitesOfType,
        getBlock: getBlock,
        getNodesByIndex: getNodesByIndex,
        getRadiusNodes: getRadiusNodes,
        getRawData: getRawData,
        getTextureNodesByIndex: getTextureNodesByIndex,
        getTexturesByIndex: getTexturesByIndex,
        initializeHeight: initializeHeight,
        initializeTexture: initializeTexture,
        isEachTextureSame: isEachTextureSame,
        isEachTextureWithAnyOfFlags: isEachTextureWithAnyOfFlags,
        setTexture: setTexture
    };
}

module.exports = Map;
},{"./constants":"c:\\Users\\Merri\\documents\\git\\map-generator\\src\\constants.js"}]},{},[])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImM6XFxVc2Vyc1xcTWVycmlcXEFwcERhdGFcXFJvYW1pbmdcXG5wbVxcbm9kZV9tb2R1bGVzXFx3YXRjaGlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXItcGFja1xcX3ByZWx1ZGUuanMiLCIuL3NyYy9nZW5lcmF0b3IuanMiLCJjOi9Vc2Vycy9NZXJyaS9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiYzovVXNlcnMvTWVycmkvZG9jdW1lbnRzL2dpdC9tYXAtZ2VuZXJhdG9yL25vZGVfbW9kdWxlcy9wcm9taXNlL2NvcmUuanMiLCJjOi9Vc2Vycy9NZXJyaS9kb2N1bWVudHMvZ2l0L21hcC1nZW5lcmF0b3Ivbm9kZV9tb2R1bGVzL3Byb21pc2UvaW5kZXguanMiLCJjOi9Vc2Vycy9NZXJyaS9kb2N1bWVudHMvZ2l0L21hcC1nZW5lcmF0b3Ivbm9kZV9tb2R1bGVzL3Byb21pc2Uvbm9kZV9tb2R1bGVzL2FzYXAvYXNhcC5qcyIsImM6L1VzZXJzL01lcnJpL2RvY3VtZW50cy9naXQvbWFwLWdlbmVyYXRvci9zcmMvY29uc3RhbnRzLmpzIiwiYzovVXNlcnMvTWVycmkvZG9jdW1lbnRzL2dpdC9tYXAtZ2VuZXJhdG9yL3NyYy9tYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1b0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2b0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBQcm9taXNlID0gcmVxdWlyZSgncHJvbWlzZScpLFxyXG4gICAgTWFwID0gcmVxdWlyZSgnLi9tYXAnKTtcclxuXHJcbnZhciBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLFxyXG4gICAgQVJFQSA9IGNvbnN0YW50cy5BUkVBLFxyXG4gICAgQ1A0MzcgPSBjb25zdGFudHMuQ1A0MzcsXHJcbiAgICBDT0xPUiA9IGNvbnN0YW50cy5DT0xPUixcclxuICAgIE9CSkVDVF9UWVBFID0gY29uc3RhbnRzLk9CSkVDVF9UWVBFLFxyXG4gICAgUkVTT1VSQ0UgPSBjb25zdGFudHMuUkVTT1VSQ0UsXHJcbiAgICBTSVRFID0gY29uc3RhbnRzLlNJVEUsXHJcbiAgICBURVJSQUlOID0gY29uc3RhbnRzLlRFUlJBSU4sXHJcbiAgICBURVhUVVJFID0gY29uc3RhbnRzLlRFWFRVUkUsXHJcbiAgICBURVhUVVJFX0lORk8gPSBjb25zdGFudHMuVEVYVFVSRV9JTkZPLFxyXG4gICAgVFJFRV9JTkZPID0gY29uc3RhbnRzLlRSRUVfSU5GTztcclxuXHJcbnZhciBHZW5lcmF0b3IgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBtYXAsXHJcbiAgICAgICAgeCxcclxuICAgICAgICB5LFxyXG4gICAgICAgIGksXHJcbiAgICAgICAgaixcclxuICAgICAgICBrLFxyXG4gICAgICAgIGwsXHJcbiAgICAgICAgYXJvdW5kLFxyXG4gICAgICAgIGFyb3VuZEV4cGFuZFRvLFxyXG4gICAgICAgIGJhc2VMZXZlbCxcclxuICAgICAgICBib3JkZXJQcm90ZWN0aW9uLFxyXG4gICAgICAgIGNvbG9yTWFwLFxyXG4gICAgICAgIGNvbG9ycyA9IFtdLFxyXG4gICAgICAgIGRhdGEsXHJcbiAgICAgICAgZGVsZXRlZE5vZGVzLFxyXG4gICAgICAgIGhlaWdodCxcclxuICAgICAgICBpbmRleCxcclxuICAgICAgICBtYXNzLFxyXG4gICAgICAgIG1hc3NSYXRpbyxcclxuICAgICAgICBub2RlcyxcclxuICAgICAgICBwbGF5ZXJzID0gW10sXHJcbiAgICAgICAgc2l6ZSxcclxuICAgICAgICBzZWVkTWFwLFxyXG4gICAgICAgIHN0YXJ0aW5nUG9pbnRzLFxyXG4gICAgICAgIHRvdGFsLFxyXG4gICAgICAgIHZhbHVlLFxyXG4gICAgICAgIHZpZXdUeXBlLFxyXG4gICAgICAgIHdpZHRoO1xyXG5cclxuICAgIGZ1bmN0aW9uIGV4cGFuZFRvKGluZGV4LCB2YWx1ZSwgY3VycmVudCkge1xyXG4gICAgICAgIGFyb3VuZEV4cGFuZFRvID0gbWFwLmdldE5vZGVzQnlJbmRleChpbmRleCk7XHJcblxyXG4gICAgICAgIHNlZWRNYXBbaW5kZXhdID0gdmFsdWU7XHJcbiAgICAgICAgaWYoY3VycmVudCAhPT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBub2Rlc1tjdXJyZW50XTtcclxuICAgICAgICAgICAgZGVsZXRlZE5vZGVzLnB1c2goY3VycmVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG1hc3MrKztcclxuXHJcbiAgICAgICAgT2JqZWN0LmtleXMoYXJvdW5kRXhwYW5kVG8pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgICAgIGluZGV4ID0gYXJvdW5kRXhwYW5kVG9ba2V5XTtcclxuICAgICAgICAgICAgaWYoc2VlZE1hcFtpbmRleF0gPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHNlZWRNYXBbaW5kZXhdID0gMTtcclxuICAgICAgICAgICAgICAgIGlmKGRlbGV0ZWROb2Rlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBub2Rlc1tkZWxldGVkTm9kZXMucG9wKCldID0gaW5kZXhcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZXMucHVzaChpbmRleCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc2VlZCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcclxuICAgICAgICAvL2lmKCFvcHRpb25zIHx8ICFvcHRpb25zLmxlbmd0aCkgb3B0aW9ucyA9IHt9O1xyXG4gICAgICAgIGNvbnNvbGUudGltZSgnR2VuZXJhdGUnKTtcclxuICAgICAgICB2YXIgbGlrZWx5aG9vZCA9IG9wdGlvbnMubGlrZWx5aG9vZCxcclxuICAgICAgICAgICAgZ2l2ZW5TdGFydGluZ1BvaW50cyA9IH5+b3B0aW9ucy5zdGFydGluZ1BvaW50cyxcclxuICAgICAgICAgICAgZ2l2ZW5NYXNzUmF0aW8gPSB+fm9wdGlvbnMubWFzc1JhdGlvXHJcblxyXG4gICAgICAgIC8vd2lkdGggPSAxMDI0IHx8ICh+fihNYXRoLnJhbmRvbSgpICogMjApICsgNykgKiAxNixcclxuICAgICAgICAvL2hlaWdodCA9IDEwMjQgfHwgKH5+KE1hdGgucmFuZG9tKCkgKiAyMCkgKyA3KSAqIDE2LFxyXG4gICAgICAgIHdpZHRoID0gfn5vcHRpb25zLndpZHRoO1xyXG4gICAgICAgIGhlaWdodCA9IH5+b3B0aW9ucy5oZWlnaHQ7XHJcbiAgICAgICAgc2l6ZSA9IHdpZHRoICogaGVpZ2h0O1xyXG4gICAgICAgIGJvcmRlclByb3RlY3Rpb24gPSB+fm9wdGlvbnMuYm9yZGVyUHJvdGVjdGlvbjtcclxuICAgICAgICBpZihib3JkZXJQcm90ZWN0aW9uKSBib3JkZXJQcm90ZWN0aW9uID0gfn4oTWF0aC5taW4od2lkdGgsIGhlaWdodCkgLyBib3JkZXJQcm90ZWN0aW9uKTtcclxuICAgICAgICBzZWVkTWFwID0gbmV3IFVpbnQ4QXJyYXkoc2l6ZSk7XHJcblxyXG4gICAgICAgIC8vIHNhbml0aXplIHVzZXIgaW5wdXRcclxuICAgICAgICBpZihnaXZlblN0YXJ0aW5nUG9pbnRzIDwgMSkgZ2l2ZW5TdGFydGluZ1BvaW50cyA9IDE7XHJcbiAgICAgICAgZWxzZSBpZihnaXZlblN0YXJ0aW5nUG9pbnRzID4gNTEyKSBnaXZlblN0YXJ0aW5nUG9pbnRzID0gNTEyO1xyXG4gICAgICAgIGlmKGdpdmVuU3RhcnRpbmdQb2ludHMgPiBzaXplID4+IDIpIGdpdmVuU3RhcnRpbmdQb2ludHMgPSBzaXplID4+IDI7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYoZ2l2ZW5NYXNzUmF0aW8gPCAxKSBnaXZlbk1hc3NSYXRpbyA9IDE7XHJcbiAgICAgICAgZWxzZSBpZihnaXZlbk1hc3NSYXRpbyA+IDk5KSBnaXZlbk1hc3NSYXRpbyA9IDk5O1xyXG5cclxuICAgICAgICBub2RlcyA9IFtdO1xyXG4gICAgICAgIGRlbGV0ZWROb2RlcyA9IFtdO1xyXG4gICAgICAgIG1hc3MgPSAwO1xyXG4gICAgICAgIG1hc3NSYXRpbyA9IH5+KHNpemUgLyAxMDAgKiBnaXZlbk1hc3NSYXRpbyk7XHJcbiAgICAgICAgc3RhcnRpbmdQb2ludHMgPSAwO1xyXG5cclxuICAgICAgICBtYXAgPSBuZXcgTWFwKHdpZHRoLCBoZWlnaHQpO1xyXG4gICAgICAgIGRhdGEgPSBtYXAuZ2V0UmF3RGF0YSgpO1xyXG5cclxuICAgICAgICAvLyByYW5kb21pemUgc29tZSBzdGFydGluZyBwb2ludHNcclxuICAgICAgICB2YWx1ZSA9IDI1NTtcclxuICAgICAgICB3aGlsZShzdGFydGluZ1BvaW50cyA8IGdpdmVuU3RhcnRpbmdQb2ludHMpIHtcclxuICAgICAgICAgICAgeCA9IH5+KE1hdGgucmFuZG9tKCkgKiAod2lkdGggLSBib3JkZXJQcm90ZWN0aW9uICogMikpICsgYm9yZGVyUHJvdGVjdGlvbjtcclxuICAgICAgICAgICAgeSA9IH5+KE1hdGgucmFuZG9tKCkgKiAoaGVpZ2h0IC0gYm9yZGVyUHJvdGVjdGlvbiAqIDIpKSArIGJvcmRlclByb3RlY3Rpb247XHJcbiAgICAgICAgICAgIGluZGV4ID0geSAqIHdpZHRoICsgeDtcclxuXHJcbiAgICAgICAgICAgIGlmKHNlZWRNYXBbaW5kZXhdID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBleHBhbmRUbyhpbmRleCwgdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgc3RhcnRpbmdQb2ludHMrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZG8gdGhlIGxhbmQgZXhwYW5zaW9uXHJcbiAgICAgICAgaWYobWFzcyA+IDApIHtcclxuICAgICAgICAgICAgd2hpbGUobWFzcyA8IG1hc3NSYXRpbykge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUtLTtcclxuICAgICAgICAgICAgICAgIGZvcihpID0gbm9kZXMubGVuZ3RoOyBpID4gMDsgLS1pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggPSBub2Rlc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICBpZihpbmRleCAhPT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJvdW5kID0gbWFwLmdldE5vZGVzQnlJbmRleChpbmRleCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzZWVkTWFwW2Fyb3VuZC5sZWZ0XSA+IDEpIHRvdGFsKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHNlZWRNYXBbYXJvdW5kLnJpZ2h0XSA+IDEpIHRvdGFsKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHNlZWRNYXBbYXJvdW5kLnRvcExlZnRdID4gMSkgdG90YWwrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc2VlZE1hcFthcm91bmQudG9wUmlnaHRdID4gMSkgdG90YWwrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc2VlZE1hcFthcm91bmQuYm90dG9tTGVmdF0gPiAxKSB0b3RhbCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzZWVkTWFwW2Fyb3VuZC5ib3R0b21SaWdodF0gPiAxKSB0b3RhbCsrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoTWF0aC5yYW5kb20oKSA8PSBsaWtlbHlob29kW3RvdGFsXSkgZXhwYW5kVG8oaW5kZXgsIH5+KHZhbHVlIC8gNyAqIHRvdGFsKSArIDIsIGkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKHZhbHVlID4gOCkge31cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYodmFsdWUgPT09IDggJiYgTWF0aC5yYW5kb20oKSA8PSBsaWtlbHlob29kWzFdKSB2YWx1ZSA9IDI1NjtcclxuICAgICAgICAgICAgICAgIGVsc2UgaWYodmFsdWUgPT09IDcgJiYgTWF0aC5yYW5kb20oKSA8PSBsaWtlbHlob29kWzJdKSB2YWx1ZSA9IDU2O1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpZih2YWx1ZSA9PT0gNiAmJiBNYXRoLnJhbmRvbSgpIDw9IGxpa2VseWhvb2RbM10pIHZhbHVlID0gNjQ7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmKHZhbHVlID09PSA1ICYmIE1hdGgucmFuZG9tKCkgPD0gbGlrZWx5aG9vZFs0XSkgdmFsdWUgPSA3MjtcclxuICAgICAgICAgICAgICAgIGVsc2UgaWYodmFsdWUgPT09IDQgJiYgTWF0aC5yYW5kb20oKSA8PSBsaWtlbHlob29kWzVdKSB2YWx1ZSA9IDgwO1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpZih2YWx1ZSA9PT0gMyAmJiBNYXRoLnJhbmRvbSgpIDw9IGxpa2VseWhvb2RbNl0pIHZhbHVlID0gOTY7XHJcbiAgICAgICAgICAgICAgICBlbHNlIC8qaWYodmFsdWUgPT09IDIpICovdmFsdWUgPSAxMjg7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnNvbGUudGltZUVuZCgnR2VuZXJhdGUnKTtcclxuICAgIH07XHJcblxyXG4gICAgLy9vcHRpb25zOiBiYXNlTGV2ZWxcclxuICAgIHZhciBjcmVhdGVIZWlnaHQgPSBmdW5jdGlvbihvcHRpb25zKSB7XHJcbiAgICAgICAgLy9pZighb3B0aW9ucyB8fCAhb3B0aW9ucy5sZW5ndGgpIG9wdGlvbnMgPSB7fTtcclxuICAgICAgICBjb25zb2xlLnRpbWUoJ0hlaWdodCBtYXAnKTtcclxuXHJcbiAgICAgICAgYmFzZUxldmVsID0gb3B0aW9ucy5iYXNlTGV2ZWwgPSB+fm9wdGlvbnMuYmFzZUxldmVsO1xyXG4gICAgICAgIG9wdGlvbnMuZ3JvdW5kTGV2ZWwgPSBNYXRoLmFicyh+fm9wdGlvbnMuZ3JvdW5kTGV2ZWwpO1xyXG4gICAgICAgIG9wdGlvbnMuZmxhdHRlbiA9IE1hdGguYWJzKG9wdGlvbnMuZmxhdHRlbik7XHJcbiAgICAgICAgb3B0aW9ucy5ub2lzZU9uV2F0ZXIgPSAhIW9wdGlvbnMubm9pc2VPbldhdGVyO1xyXG5cclxuICAgICAgICBpZihvcHRpb25zLmdyb3VuZExldmVsID4gNSkgb3B0aW9ucy5ncm91bmRMZXZlbCA9IDU7XHJcbiAgICAgICAgaWYob3B0aW9ucy5mbGF0dGVuIDwgMSkgb3B0aW9ucy5mbGF0dGVuID0gMTtcclxuICAgICAgICBlbHNlIGlmKG9wdGlvbnMuZmxhdHRlbiA+IDMwKSBvcHRpb25zLmZsYXR0ZW4gPSAzMDtcclxuXHJcbiAgICAgICAgbWFwLmluaXRpYWxpemVIZWlnaHQob3B0aW9ucy5iYXNlTGV2ZWwpO1xyXG5cclxuICAgICAgICAvLyBwdXNoIGxhbmQgdXAgb3IgZG93biBiZWZvcmUgd2Ugc3RhcnQhXHJcbiAgICAgICAgaSA9IG9wdGlvbnMuYmFzZUxldmVsIDw9IDMwID8gb3B0aW9ucy5ncm91bmRMZXZlbCA6IC1vcHRpb25zLmdyb3VuZExldmVsO1xyXG4gICAgICAgIGluZGV4ID0gMDtcclxuICAgICAgICBmb3IoeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKykge1xyXG4gICAgICAgICAgICBmb3IoeCA9IDA7IHggPCB3aWR0aDsgeCsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZihzZWVkTWFwW2luZGV4XSA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICBtYXAuY2hhbmdlSGVpZ2h0KHgsIHksIDAsIGkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaW5kZXgrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZHJhdyB0aGUgZmluYWwgaGVpZ2h0IG1hcCBiYXNlZCBvbiB3aGF0IHdlIGhhdmVcclxuICAgICAgICBpbmRleCA9IDA7XHJcbiAgICAgICAgZm9yKHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspIHtcclxuICAgICAgICAgICAgZm9yKHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzZWVkTWFwW2luZGV4XTtcclxuICAgICAgICAgICAgICAgIGlmKHZhbHVlID4gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFyb3VuZCA9IG1hcC5nZXROb2Rlc0J5SW5kZXgoaW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSBhdmFyYWdlIGFyb3VuZCBub2RlXHJcbiAgICAgICAgICAgICAgICAgICAgaSA9IE1hdGgucm91bmQoKHNlZWRNYXBbYXJvdW5kLmxlZnRdICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VlZE1hcFthcm91bmQucmlnaHRdICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VlZE1hcFthcm91bmQudG9wTGVmdF0gK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWVkTWFwW2Fyb3VuZC50b3BSaWdodF0gK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWVkTWFwW2Fyb3VuZC5ib3R0b21MZWZ0XSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlZWRNYXBbYXJvdW5kLmJvdHRvbVJpZ2h0XSkgLyA2KTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBnbyB1cCBvciBkb3duXHJcbiAgICAgICAgICAgICAgICAgICAgbWFwLmNoYW5nZUhlaWdodCh4LCB5LCAoKHZhbHVlICYgMTUpICYgKGkgJiAxNSkpIC8gMiwgfn4oKHZhbHVlIC0gaSkgLyA4KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpbmRleCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBmbGF0dGVuXHJcbiAgICAgICAgaWYob3B0aW9ucy5mbGF0dGVuID4gMSkge1xyXG4gICAgICAgICAgICBiYXNlTGV2ZWwgPSB+fihiYXNlTGV2ZWwgLyBvcHRpb25zLmZsYXR0ZW4pO1xyXG4gICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGRhdGFbaV0gPSB+fihkYXRhW2ldIC8gb3B0aW9ucy5mbGF0dGVuKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc29tZSBleHRyYSByYW5kb21pemVcclxuICAgICAgICBpZihvcHRpb25zLnJhbmRvbWl6ZSA+IDApIHtcclxuICAgICAgICAgICAgaWYoIW9wdGlvbnMubm9pc2VPbldhdGVyKSB7XHJcbiAgICAgICAgICAgICAgICBpbmRleCA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IoeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvcih4ID0gMDsgeCA8IHdpZHRoOyB4KyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc2VlZE1hcFtpbmRleF0gPiAxIHx8IGRhdGFbaW5kZXhdICE9PSBiYXNlTGV2ZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcC5jaGFuZ2VIZWlnaHQoeCwgeSwgMCwgfn4oTWF0aC5yYW5kb20oKSAqICgob3B0aW9ucy5yYW5kb21pemUgKiAyKSArIDEpIC0gb3B0aW9ucy5yYW5kb21pemUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgIGZvcih5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yKHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXAuY2hhbmdlSGVpZ2h0KHgsIHksIDAsIH5+KE1hdGgucmFuZG9tKCkgKiAoKG9wdGlvbnMucmFuZG9taXplICogMikgKyAxKSAtIG9wdGlvbnMucmFuZG9taXplKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ0hlaWdodCBtYXAnKTtcclxuXHJcbiAgICAgICAgY29uc29sZS50aW1lKCdsaWdodE1hcCcpO1xyXG4gICAgICAgIG1hcC5jYWxjdWxhdGVMaWdodE1hcCgpO1xyXG4gICAgICAgIGNvbnNvbGUudGltZUVuZCgnbGlnaHRNYXAnKTtcclxuICAgIH07XHJcblxyXG4gICAgdmFyIGNyZWF0ZUJhc2VUZXh0dXJlcyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcclxuICAgICAgICB2YXIgY2hhbmdlZCA9IGZhbHNlLFxyXG4gICAgICAgICAgICBpLFxyXG4gICAgICAgICAgICBtb3VudGFpblRleHR1cmVzID0gWzEsIDExLCAxMiwgMTNdLFxyXG4gICAgICAgICAgICB0ZXh0dXJlQmxvY2sxID0gc2l6ZSAqIDEsXHJcbiAgICAgICAgICAgIHRleHR1cmVCbG9jazIgPSBzaXplICogMixcclxuICAgICAgICAgICAgc2l0ZUJsb2NrID0gc2l6ZSAqIDgsXHJcbiAgICAgICAgICAgIHNpdGVOb2RlcztcclxuXHJcbiAgICAgICAgY29uc29sZS50aW1lKCdUZXh0dXJlJyk7XHJcblxyXG4gICAgICAgIC8vIHNhbml0aXplXHJcbiAgICAgICAgb3B0aW9ucy5tb3VudGFpbkdlbmVyYXRlID0gfn5vcHRpb25zLm1vdW50YWluR2VuZXJhdGU7XHJcbiAgICAgICAgb3B0aW9ucy5zZWFtbGVzcyA9ICEhfn5vcHRpb25zLnNlYW1sZXNzO1xyXG4gICAgICAgIG9wdGlvbnMudGV4dHVyZSA9IH5+b3B0aW9ucy50ZXh0dXJlICYgVEVYVFVSRS5UT19JRF9WQUxVRTtcclxuICAgICAgICBvcHRpb25zLndhdGVyVGV4dHVyZSA9IH5+b3B0aW9ucy53YXRlclRleHR1cmUgJiBURVhUVVJFLlRPX0lEX1ZBTFVFO1xyXG5cclxuICAgICAgICBtYXAuaW5pdGlhbGl6ZVRleHR1cmUob3B0aW9ucy50ZXh0dXJlKTtcclxuXHJcbiAgICAgICAgLy8gZHJhdyB3YXRlciB0ZXh0dXJlXHJcbiAgICAgICAgZm9yKGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmKGRhdGFbaV0gPj0gKGJhc2VMZXZlbCAtIDIpICYmIGRhdGFbaV0gPD0gKGJhc2VMZXZlbCArIDIpICYmIHNlZWRNYXBbaV0gPCAyKSB7XHJcbiAgICAgICAgICAgICAgICBtYXAuc2V0VGV4dHVyZShpLCBvcHRpb25zLndhdGVyVGV4dHVyZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnNvbGUudGltZSgnRHJhdyBNb3VudGFpbnMgKHJlcXVpcmVzIHgyIGNhbGN1bGF0ZVNpdGVzKScpO1xyXG4gICAgICAgIG1hcC5jYWxjdWxhdGVTaXRlTWFwKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gZHJhdyBtb3VudGFpbiB0ZXh0dXJlXHJcbiAgICAgICAgaWYob3B0aW9ucy5tb3VudGFpbkdlbmVyYXRlID09PSA3KSB7XHJcbiAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYoXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YVt0ZXh0dXJlQmxvY2sxICsgaV0gIT09IDB4MDRcclxuICAgICAgICAgICAgICAgICAgICAmJiBkYXRhW3RleHR1cmVCbG9jazEgKyBpXSAhPT0gMHgwN1xyXG4gICAgICAgICAgICAgICAgICAgICYmIGRhdGFbdGV4dHVyZUJsb2NrMSArIGldICE9PSAweDExXHJcbiAgICAgICAgICAgICAgICAgICAgJiYgZGF0YVt0ZXh0dXJlQmxvY2syICsgaV0gIT09IDB4MDRcclxuICAgICAgICAgICAgICAgICAgICAmJiBkYXRhW3RleHR1cmVCbG9jazIgKyBpXSAhPT0gMHgwN1xyXG4gICAgICAgICAgICAgICAgICAgICYmIGRhdGFbdGV4dHVyZUJsb2NrMiArIGldICE9PSAweDExXHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICBzaXRlTm9kZXMgPSBtYXAuZ2V0Tm9kZXNCeUluZGV4KGkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoZGF0YVtzaXRlQmxvY2sgKyBzaXRlTm9kZXMubGVmdF0gJiAweEY3KSA9PT0gMHgwMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiAoZGF0YVtzaXRlQmxvY2sgKyBzaXRlTm9kZXMucmlnaHRdICYgMHhGNykgPT09IDB4MDFcclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgKGRhdGFbc2l0ZUJsb2NrICsgc2l0ZU5vZGVzLnRvcExlZnRdICYgMHhGNykgPT09IDB4MDFcclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgKGRhdGFbc2l0ZUJsb2NrICsgc2l0ZU5vZGVzLnRvcFJpZ2h0XSAmIDB4RjcpID09PSAweDAxXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICYmIChkYXRhW3NpdGVCbG9jayArIHNpdGVOb2Rlcy5ib3R0b21MZWZ0XSAmIDB4RjcpID09PSAweDAxXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICYmIChkYXRhW3NpdGVCbG9jayArIHNpdGVOb2Rlcy5ib3R0b21SaWdodF0gJiAweEY3KSA9PT0gMHgwMVxyXG4gICAgICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0VGV4dHVyZShpLCBtb3VudGFpblRleHR1cmVzW35+KE1hdGgucmFuZG9tKCkgKiA0KV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZihvcHRpb25zLm1vdW50YWluR2VuZXJhdGUgPT09IDYpIHtcclxuICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZihcclxuICAgICAgICAgICAgICAgICAgICAoZGF0YVtzaXRlQmxvY2sgKyBpXSAmIDB4RjcpID09PSAweDAxXHJcbiAgICAgICAgICAgICAgICAgICAgJiYgZGF0YVt0ZXh0dXJlQmxvY2sxICsgaV0gIT09IDB4MDRcclxuICAgICAgICAgICAgICAgICAgICAmJiBkYXRhW3RleHR1cmVCbG9jazEgKyBpXSAhPT0gMHgwN1xyXG4gICAgICAgICAgICAgICAgICAgICYmIGRhdGFbdGV4dHVyZUJsb2NrMSArIGldICE9PSAweDExXHJcbiAgICAgICAgICAgICAgICAgICAgJiYgZGF0YVt0ZXh0dXJlQmxvY2syICsgaV0gIT09IDB4MDRcclxuICAgICAgICAgICAgICAgICAgICAmJiBkYXRhW3RleHR1cmVCbG9jazIgKyBpXSAhPT0gMHgwN1xyXG4gICAgICAgICAgICAgICAgICAgICYmIGRhdGFbdGV4dHVyZUJsb2NrMiArIGldICE9PSAweDExXHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICBzaXRlTm9kZXMgPSBtYXAuZ2V0Tm9kZXNCeUluZGV4KGkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoZGF0YVtzaXRlQmxvY2sgKyBzaXRlTm9kZXMubGVmdF0gJiAweEY3KSA9PT0gMHgwMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiAoZGF0YVtzaXRlQmxvY2sgKyBzaXRlTm9kZXMucmlnaHRdICYgMHhGNykgPT09IDB4MDFcclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgKGRhdGFbc2l0ZUJsb2NrICsgc2l0ZU5vZGVzLnRvcExlZnRdICYgMHhGNykgPT09IDB4MDFcclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgKGRhdGFbc2l0ZUJsb2NrICsgc2l0ZU5vZGVzLnRvcFJpZ2h0XSAmIDB4RjcpID09PSAweDAxXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICYmIChkYXRhW3NpdGVCbG9jayArIHNpdGVOb2Rlcy5ib3R0b21MZWZ0XSAmIDB4RjcpID09PSAweDAxXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICYmIChkYXRhW3NpdGVCbG9jayArIHNpdGVOb2Rlcy5ib3R0b21SaWdodF0gJiAweEY3KSA9PT0gMHgwMVxyXG4gICAgICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0VGV4dHVyZShpLCBtb3VudGFpblRleHR1cmVzW35+KE1hdGgucmFuZG9tKCkgKiA0KV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYoXHJcbiAgICAgICAgICAgICAgICAgICAgKGRhdGFbc2l0ZUJsb2NrICsgaV0gJiAweEY3KSA9PT0gMHgwMVxyXG4gICAgICAgICAgICAgICAgICAgICYmIGRhdGFbdGV4dHVyZUJsb2NrMSArIGldICE9PSAweDA0XHJcbiAgICAgICAgICAgICAgICAgICAgJiYgZGF0YVt0ZXh0dXJlQmxvY2sxICsgaV0gIT09IDB4MDdcclxuICAgICAgICAgICAgICAgICAgICAmJiBkYXRhW3RleHR1cmVCbG9jazEgKyBpXSAhPT0gMHgxMVxyXG4gICAgICAgICAgICAgICAgICAgICYmIGRhdGFbdGV4dHVyZUJsb2NrMiArIGldICE9PSAweDA0XHJcbiAgICAgICAgICAgICAgICAgICAgJiYgZGF0YVt0ZXh0dXJlQmxvY2syICsgaV0gIT09IDB4MDdcclxuICAgICAgICAgICAgICAgICAgICAmJiBkYXRhW3RleHR1cmVCbG9jazIgKyBpXSAhPT0gMHgxMVxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2l0ZU5vZGVzID0gbWFwLmdldE5vZGVzQnlJbmRleChpKTtcclxuICAgICAgICAgICAgICAgICAgICBpZihcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5tb3VudGFpbkdlbmVyYXRlIDw9ICgoKGRhdGFbc2l0ZUJsb2NrICsgc2l0ZU5vZGVzLmxlZnRdICYgMHhGNykgPT09IDB4MDEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICsgKChkYXRhW3NpdGVCbG9jayArIHNpdGVOb2Rlcy5yaWdodF0gJiAweEY3KSA9PT0gMHgwMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgKyAoKGRhdGFbc2l0ZUJsb2NrICsgc2l0ZU5vZGVzLnRvcExlZnRdICYgMHhGNykgPT09IDB4MDEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICsgKChkYXRhW3NpdGVCbG9jayArIHNpdGVOb2Rlcy50b3BSaWdodF0gJiAweEY3KSA9PT0gMHgwMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgKyAoKGRhdGFbc2l0ZUJsb2NrICsgc2l0ZU5vZGVzLmJvdHRvbUxlZnRdICYgMHhGNykgPT09IDB4MDEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICsgKChkYXRhW3NpdGVCbG9jayArIHNpdGVOb2Rlcy5ib3R0b21SaWdodF0gJiAweEY3KSA9PT0gMHgwMSkpXHJcbiAgICAgICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcC5zZXRUZXh0dXJlKGksIG1vdW50YWluVGV4dHVyZXNbfn4oTWF0aC5yYW5kb20oKSAqIDQpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzZWFtbGVzcyBtb2RlXHJcbiAgICAgICAgaWYoIW9wdGlvbnMuc2VhbWxlc3MpIHtcclxuICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgd2lkdGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoKGRhdGFbdGV4dHVyZUJsb2NrMSArIGldKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBzYXZhbm5haCBhbmQgc3RlcHBlXHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MDA6XHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MEU6XHJcbiAgICAgICAgICAgICAgICAgICAgbWFwLnNldFRleHR1cmUoaSwgMHgwMyk7IC8vIHN3YW1wXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAvLyBtZWFkb3dcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgwODpcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgwOTpcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgwQTpcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgwRjpcclxuICAgICAgICAgICAgICAgICAgICBtYXAuc2V0VGV4dHVyZShpLCAweDAzKTsgLy8gc3dhbXBcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIC8vIGRlc2VydFxyXG4gICAgICAgICAgICAgICAgY2FzZSAweDA0OlxyXG4gICAgICAgICAgICAgICAgY2FzZSAweDA3OlxyXG4gICAgICAgICAgICAgICAgICAgIG1hcC5zZXRUZXh0dXJlKGksIDB4MDIpOyAvLyBzbm93XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAvLyBtYWdlbnRhXHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MTE6XHJcbiAgICAgICAgICAgICAgICAgICAgbWFwLnNldFRleHR1cmUoaSwgMHgxMCk7IC8vIGxhdmFcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIC8vIG1vdW50YWluIG1lYWRvd1xyXG4gICAgICAgICAgICAgICAgY2FzZSAweDEyOlxyXG4gICAgICAgICAgICAgICAgY2FzZSAweDIyOlxyXG4gICAgICAgICAgICAgICAgICAgIG1hcC5zZXRUZXh0dXJlKGksIDB4MTApOyAvLyBsYXZhXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAvLyBtb3VudGFpblxyXG4gICAgICAgICAgICAgICAgY2FzZSAweDAxOlxyXG4gICAgICAgICAgICAgICAgY2FzZSAweDBCOlxyXG4gICAgICAgICAgICAgICAgY2FzZSAweDBDOlxyXG4gICAgICAgICAgICAgICAgY2FzZSAweDBEOlxyXG4gICAgICAgICAgICAgICAgICAgIG1hcC5zZXRUZXh0dXJlKGksIDB4MDIpOyAvLyBzbm93XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAvLyB3YXRlclxyXG4gICAgICAgICAgICAgICAgY2FzZSAweDA1OlxyXG4gICAgICAgICAgICAgICAgY2FzZSAweDA2OlxyXG4gICAgICAgICAgICAgICAgICAgIG1hcC5zZXRUZXh0dXJlKGksIDB4MTMpOyAvLyB3YXRlciAobm8gc2hpcHMpXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaChkYXRhW3RleHR1cmVCbG9jazIgKyBpXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNhdmFubmFoIGFuZCBzdGVwcGVcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDB4MDA6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDBFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0VGV4dHVyZShpLCAweDAzKTsgLy8gc3dhbXBcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbWVhZG93XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDA4OlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMHgwOTpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDB4MEE6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDBGOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0VGV4dHVyZShpLCAweDAzKTsgLy8gc3dhbXBcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZGVzZXJ0XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDA0OlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMHgwNzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwLnNldFRleHR1cmUoaSwgMHgwMik7IC8vIHNub3dcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbWFnZW50YVxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMHgxMTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwLnNldFRleHR1cmUoaSwgMHgxMCk7IC8vIGxhdmFcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbW91bnRhaW4gbWVhZG93XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDEyOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMHgyMjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwLnNldFRleHR1cmUoaSwgMHgxMCk7IC8vIGxhdmFcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbW91bnRhaW5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDB4MDE6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDBCOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMHgwQzpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDB4MEQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcC5zZXRUZXh0dXJlKGksIDB4MDIpOyAvLyBzbm93XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHdhdGVyXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDA1OlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMHgwNjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwLnNldFRleHR1cmUoaSwgMHgxMyk7IC8vIHdhdGVyIChubyBzaGlwcylcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZvcig7IGkgPCBzaXplOyBpICs9IHdpZHRoKSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2goZGF0YVt0ZXh0dXJlQmxvY2sxICsgaV0pIHtcclxuICAgICAgICAgICAgICAgIC8vIHNhdmFubmFoIGFuZCBzdGVwcGVcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgwMDpcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgwRTpcclxuICAgICAgICAgICAgICAgICAgICBtYXAuc2V0VGV4dHVyZShpLCAweDAzKTsgLy8gc3dhbXBcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIC8vIG1lYWRvd1xyXG4gICAgICAgICAgICAgICAgY2FzZSAweDA4OlxyXG4gICAgICAgICAgICAgICAgY2FzZSAweDA5OlxyXG4gICAgICAgICAgICAgICAgY2FzZSAweDBBOlxyXG4gICAgICAgICAgICAgICAgY2FzZSAweDBGOlxyXG4gICAgICAgICAgICAgICAgICAgIG1hcC5zZXRUZXh0dXJlKGksIDB4MDMpOyAvLyBzd2FtcFxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgLy8gZGVzZXJ0XHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MDQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MDc6XHJcbiAgICAgICAgICAgICAgICAgICAgbWFwLnNldFRleHR1cmUoaSwgMHgwMik7IC8vIHNub3dcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIC8vIG1hZ2VudGFcclxuICAgICAgICAgICAgICAgIGNhc2UgMHgxMTpcclxuICAgICAgICAgICAgICAgICAgICBtYXAuc2V0VGV4dHVyZShpLCAweDEwKTsgLy8gbGF2YVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgLy8gbW91bnRhaW4gbWVhZG93XHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MTI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MjI6XHJcbiAgICAgICAgICAgICAgICAgICAgbWFwLnNldFRleHR1cmUoaSwgMHgxMCk7IC8vIGxhdmFcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIC8vIG1vdW50YWluXHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MDE6XHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MEI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MEM6XHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MEQ6XHJcbiAgICAgICAgICAgICAgICAgICAgbWFwLnNldFRleHR1cmUoaSwgMHgwMik7IC8vIHNub3dcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIC8vIHdhdGVyXHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MDU6XHJcbiAgICAgICAgICAgICAgICBjYXNlIDB4MDY6XHJcbiAgICAgICAgICAgICAgICAgICAgbWFwLnNldFRleHR1cmUoaSwgMHgxMyk7IC8vIHdhdGVyIChubyBzaGlwcylcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGRhdGFbdGV4dHVyZUJsb2NrMiArIGldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc2F2YW5uYWggYW5kIHN0ZXBwZVxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMHgwMDpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDB4MEU6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcC5zZXRUZXh0dXJlKGksIDB4MDMpOyAvLyBzd2FtcFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAvLyBtZWFkb3dcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDB4MDg6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDA5OlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMHgwQTpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDB4MEY6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcC5zZXRUZXh0dXJlKGksIDB4MDMpOyAvLyBzd2FtcFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAvLyBkZXNlcnRcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDB4MDQ6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDA3OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0VGV4dHVyZShpLCAweDAyKTsgLy8gc25vd1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAvLyBtYWdlbnRhXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDExOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0VGV4dHVyZShpLCAweDEwKTsgLy8gbGF2YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAvLyBtb3VudGFpbiBtZWFkb3dcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDB4MTI6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDIyOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0VGV4dHVyZShpLCAweDEwKTsgLy8gbGF2YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAvLyBtb3VudGFpblxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMHgwMTpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDB4MEI6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDBDOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMHgwRDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFwLnNldFRleHR1cmUoaSwgMHgwMik7IC8vIHNub3dcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gd2F0ZXJcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDB4MDU6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAweDA2OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXAuc2V0VGV4dHVyZShpLCAweDEzKTsgLy8gd2F0ZXIgKG5vIHNoaXBzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWFwLmNhbGN1bGF0ZVNpdGVNYXAoKTtcclxuICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ0RyYXcgTW91bnRhaW5zIChyZXF1aXJlcyB4MiBjYWxjdWxhdGVTaXRlcyknKTtcclxuXHJcbiAgICAgICAgY29uc29sZS50aW1lRW5kKCdUZXh0dXJlJyk7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBnZXRSYW5kb21QbGF5ZXJQb3NpdGlvbnMgPSBmdW5jdGlvbihtYXhQbGF5ZXJDb3VudCwgcmFkaXVzKSB7XHJcbiAgICAgICAgcGxheWVycyA9IFtdO1xyXG5cclxuICAgICAgICBjb25zb2xlLnRpbWUoJ2dldFJhbmRvbVBsYXllclBvc2l0aW9ucycpO1xyXG5cclxuICAgICAgICAvLyBzYW5pdGl6ZVxyXG4gICAgICAgIG1heFBsYXllckNvdW50ID0gfn5tYXhQbGF5ZXJDb3VudDtcclxuICAgICAgICBpZihtYXhQbGF5ZXJDb3VudCA8IDApIG1heFBsYXllckNvdW50ID0gMDtcclxuICAgICAgICBlbHNlIGlmKG1heFBsYXllckNvdW50ID4gMTApIG1heFBsYXllckNvdW50ID0gMTA7XHJcblxyXG4gICAgICAgIHJhZGl1cyA9IH5+cmFkaXVzO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBnZW5lcmF0ZVJhbmRvbVBsYXllcnMoc2l0ZXMpIHtcclxuICAgICAgICAgICAgdmFyIGluZGV4LFxyXG4gICAgICAgICAgICAgICAgbm9kZXMsXHJcbiAgICAgICAgICAgICAgICB4LFxyXG4gICAgICAgICAgICAgICAgeTtcclxuXHJcbiAgICAgICAgICAgIGlmKHNpdGVzLmxlbmd0aCA+IDAgJiYgcGxheWVycy5sZW5ndGggPCBtYXhQbGF5ZXJDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgLy8gcmFuZG9taXplIGEgcG9zaXRpb24gZnJvbSBnaXZlbiBwbGF1c2libGUgc2l0ZXNcclxuICAgICAgICAgICAgICAgIGluZGV4ID0gc2l0ZXNbfn4oTWF0aC5yYW5kb20oKSAqIHNpdGVzLmxlbmd0aCldO1xyXG4gICAgICAgICAgICAgICAgeCA9IGluZGV4ICUgd2lkdGg7XHJcbiAgICAgICAgICAgICAgICB5ID0gfn4oKGluZGV4IC0geCkgLyB3aWR0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gZ2V0UmFkaXVzTm9kZXMgcmV0dXJucyBhIHR5cGVkIGFycmF5OyBtdXN0IGNvbnZlcnQgaXQgdG8gcmVndWxhciBhcnJheVxyXG4gICAgICAgICAgICAgICAgbm9kZXMgPSBBcnJheS5hcHBseShbXSwgbWFwLmdldFJhZGl1c05vZGVzKHgsIHksIHJhZGl1cykpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBub2RlcyBuZWFyIG5ld2x5IHJhbmRvbWl6ZWQgcGxheWVyXHJcbiAgICAgICAgICAgICAgICBzaXRlcyA9IHNpdGVzLmZpbHRlcihmdW5jdGlvbihpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBub2Rlcy5pbmRleE9mKGluZGV4KSA9PT0gLTE7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhZGQgcGxheWVyIHRvIGxpc3Qgb2Yga25vd24gcGxheWVyc1xyXG4gICAgICAgICAgICAgICAgcGxheWVycy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBpbmRleDogaW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgICAgICAgICB5OiB5XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBnZXQgdGhlIG5leHQgcGxheWVyXHJcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZVJhbmRvbVBsYXllcnMoc2l0ZXMsIHJhZGl1cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHN0YXJ0IHRoZSByZWN1cnNpdmUgY2FsbCAoaWYgbmVjZXNzYXJ5KVxyXG4gICAgICAgIGlmKG1heFBsYXllckNvdW50ID4gMCkgZ2VuZXJhdGVSYW5kb21QbGF5ZXJzKG1hcC5nZXRBbGxTaXRlc09mVHlwZShTSVRFLkNBU1RMRSkpO1xyXG5cclxuICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ2dldFJhbmRvbVBsYXllclBvc2l0aW9ucycpO1xyXG5cclxuICAgICAgICByZXR1cm4gcGxheWVycztcclxuICAgIH07XHJcblxyXG4gICAgdmFyIGFwcGx5UmVzb3VyY2VzID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG4gICAgICAgIHZhciBpLFxyXG4gICAgICAgICAgICBqLFxyXG4gICAgICAgICAgICBrLFxyXG4gICAgICAgICAgICBlYWNoVGV4dHVyZUlzU2FtZUtpbmQsXHJcbiAgICAgICAgICAgIHVzYWJsZUxhbmRtYXNzID0gMCxcclxuICAgICAgICAgICAgbmV3UmVzb3VyY2UsXHJcbiAgICAgICAgICAgIG5vZGVzLFxyXG4gICAgICAgICAgICByZXNvdXJjZXMgPSB7XHJcbiAgICAgICAgICAgICAgICBmcmVzaFdhdGVyOiAwLFxyXG4gICAgICAgICAgICAgICAgbWluZUNvYWw6IDAsXHJcbiAgICAgICAgICAgICAgICBtaW5lSXJvbk9yZTogMCxcclxuICAgICAgICAgICAgICAgIG1pbmVHb2xkOiAwLFxyXG4gICAgICAgICAgICAgICAgbWluZUdyYW5pdGU6IDAsXHJcbiAgICAgICAgICAgICAgICBmaXNoOiAwLFxyXG4gICAgICAgICAgICAgICAgZ3Jhbml0ZTogMCxcclxuICAgICAgICAgICAgICAgIHRyZWU6IDBcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdGV4dHVyZSxcclxuICAgICAgICAgICAgdGV4dHVyZUZsYWcsXHJcbiAgICAgICAgICAgIHRleHR1cmVzLFxyXG4gICAgICAgICAgICB0ZXh0dXJlQmxvY2tzID0gc2l6ZSxcclxuICAgICAgICAgICAgb2JqZWN0SW5kZXhCbG9jayA9IHNpemUgKiA0LFxyXG4gICAgICAgICAgICBvYmplY3RUeXBlQmxvY2sgPSBzaXplICogNSxcclxuICAgICAgICAgICAgc2l0ZUJsb2NrID0gc2l6ZSAqIDgsXHJcbiAgICAgICAgICAgIHRvdWNoQmxvY2sgPSBzaXplICogMTAsXHJcbiAgICAgICAgICAgIHJlc291cmNlQmxvY2sgPSBzaXplICogMTE7XHJcblxyXG4gICAgICAgIGNvbnNvbGUudGltZSgnYXBwbHlSZXNvdXJjZXMnKTtcclxuXHJcbiAgICAgICAgLy8gY2xlYW4gdXBcclxuICAgICAgICBmb3IoaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcclxuICAgICAgICAgICAgZGF0YVtvYmplY3RJbmRleEJsb2NrICsgaV0gPSAwO1xyXG4gICAgICAgICAgICBkYXRhW29iamVjdFR5cGVCbG9jayArIGldID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgICAgIC8vIHNhbml0aXplIHZhbHVlc1xyXG4gICAgICAgIG9wdGlvbnMudHJlZVJhdGlvID0gKG9wdGlvbnMudHJlZVJhdGlvICE9PSB2b2lkIDApID8gfn5vcHRpb25zLnRyZWVSYXRpbyA6IDMzO1xyXG4gICAgICAgIGlmKG9wdGlvbnMudHJlZVJhdGlvIDwgMCkgb3B0aW9ucy50cmVlUmF0aW8gPSAwO1xyXG4gICAgICAgIGVsc2UgaWYob3B0aW9ucy50cmVlUmF0aW8gPiA1MCkgb3B0aW9ucy50cmVlUmF0aW8gPSAwLjU7XHJcbiAgICAgICAgZWxzZSBvcHRpb25zLnRyZWVSYXRpbyA9IG9wdGlvbnMudHJlZVJhdGlvIC8gMTAwO1xyXG5cclxuICAgICAgICBvcHRpb25zLmdyYW5pdGVSYXRpbyA9IChvcHRpb25zLmdyYW5pdGVSYXRpbyAhPT0gdm9pZCAwKSA/IH5+b3B0aW9ucy5ncmFuaXRlUmF0aW8gOiAxNTtcclxuICAgICAgICBpZihvcHRpb25zLmdyYW5pdGVSYXRpbyA8IDApIG9wdGlvbnMuZ3Jhbml0ZVJhdGlvID0gMDtcclxuICAgICAgICBlbHNlIGlmKG9wdGlvbnMuZ3Jhbml0ZVJhdGlvID4gMjUpIG9wdGlvbnMuZ3Jhbml0ZVJhdGlvID0gMC4yNTtcclxuICAgICAgICBlbHNlIG9wdGlvbnMuZ3Jhbml0ZVJhdGlvID0gb3B0aW9ucy5ncmFuaXRlUmF0aW8gLyAxMDA7XHJcblxyXG4gICAgICAgIGZvcihpID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgICAgICAgICBuZXdSZXNvdXJjZSA9IDA7XHJcbiAgICAgICAgICAgIHRleHR1cmVzID0gbWFwLmdldFRleHR1cmVzQnlJbmRleChpKTtcclxuICAgICAgICAgICAgLy8gd2UgaGF2ZSB0byBkcm9wIHN1cHBvcnQgZmxhZ3Mgc28gdGhhdCBpZS4gTW91bnRhaW4gTWVhZG93IGlzIGNvbXBhcmFibGUgdG8gdGhlIEhhYml0YWJsZSBNb3VudGFpbiB0ZXh0dXJlIChlc3NlbnRpYWxseSB0aGUgc2FtZSlcclxuICAgICAgICAgICAgdGV4dHVyZUZsYWcgPSBURVhUVVJFX0lORk9bdGV4dHVyZXMudG9wTGVmdF0uRkxBRyAmIFRFWFRVUkUuRFJPUF9TVVBQT1JUO1xyXG4gICAgICAgICAgICBlYWNoVGV4dHVyZUlzU2FtZUtpbmQgPSAoXHJcbiAgICAgICAgICAgICAgICB0ZXh0dXJlRmxhZyA9PT0gKFRFWFRVUkVfSU5GT1t0ZXh0dXJlcy50b3BdLkZMQUcgJiBURVhUVVJFLkRST1BfU1VQUE9SVClcclxuICAgICAgICAgICAgICAgICYmIHRleHR1cmVGbGFnID09PSAoVEVYVFVSRV9JTkZPW3RleHR1cmVzLnRvcFJpZ2h0XS5GTEFHICYgVEVYVFVSRS5EUk9QX1NVUFBPUlQpXHJcbiAgICAgICAgICAgICAgICAmJiB0ZXh0dXJlRmxhZyA9PT0gKFRFWFRVUkVfSU5GT1t0ZXh0dXJlcy5ib3R0b21MZWZ0XS5GTEFHICYgVEVYVFVSRS5EUk9QX1NVUFBPUlQpXHJcbiAgICAgICAgICAgICAgICAmJiB0ZXh0dXJlRmxhZyA9PT0gKFRFWFRVUkVfSU5GT1t0ZXh0dXJlcy5ib3R0b21dLkZMQUcgJiBURVhUVVJFLkRST1BfU1VQUE9SVClcclxuICAgICAgICAgICAgICAgICYmIHRleHR1cmVGbGFnID09PSAoVEVYVFVSRV9JTkZPW3RleHR1cmVzLmJvdHRvbVJpZ2h0XS5GTEFHICYgVEVYVFVSRS5EUk9QX1NVUFBPUlQpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGlmKGVhY2hUZXh0dXJlSXNTYW1lS2luZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gd2F0ZXI/XHJcbiAgICAgICAgICAgICAgICBpZih0ZXh0dXJlcy50b3BMZWZ0ID09PSAweDA1KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZXMgPSBtYXAuZ2V0Tm9kZXNCeUluZGV4KGkpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNhbiB3ZSBmaW5kIGFuIGFjY2Vzc2libGUgc2l0ZSBhcm91bmQ/XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChkYXRhW3NpdGVCbG9jayArIG5vZGVzLmxlZnRdICE9PSBTSVRFLklNUEFTU0FCTEUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IChkYXRhW3NpdGVCbG9jayArIG5vZGVzLnJpZ2h0XSAhPT0gU0lURS5JTVBBU1NBQkxFKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCAoZGF0YVtzaXRlQmxvY2sgKyBub2Rlcy50b3BMZWZ0XSAhPT0gU0lURS5JTVBBU1NBQkxFKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCAoZGF0YVtzaXRlQmxvY2sgKyBub2Rlcy50b3BSaWdodF0gIT09IFNJVEUuSU1QQVNTQUJMRSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfHwgKGRhdGFbc2l0ZUJsb2NrICsgbm9kZXMuYm90dG9tTGVmdF0gIT09IFNJVEUuSU1QQVNTQUJMRSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfHwgKGRhdGFbc2l0ZUJsb2NrICsgbm9kZXMuYm90dG9tUmlnaHRdICE9PSBTSVRFLklNUEFTU0FCTEUpXHJcbiAgICAgICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZpc2ghXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jlc291cmNlID0gUkVTT1VSQ0UuRklTSDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzLmZpc2grKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRleHR1cmVGbGFnICYgVEVYVFVSRS5ST0NLKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGNvYWwgLyBpcm9uIG9yZSAvIGdvbGQgLyBncmFuaXRlXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3UmVzb3VyY2UgPSBzZWVkTWFwW2ldICYgMHgzRjtcclxuICAgICAgICAgICAgICAgICAgICBpZihuZXdSZXNvdXJjZSA8IDB4MjApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3UmVzb3VyY2UgPSBSRVNPVVJDRS5DT0FMIHwgMHgwNztcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzLm1pbmVDb2FsKys7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXdSZXNvdXJjZSA8IDB4MkUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3UmVzb3VyY2UgPSBSRVNPVVJDRS5HT0xEIHwgMHgwNztcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzLm1pbmVHb2xkKys7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXdSZXNvdXJjZSA8IDB4M0MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3UmVzb3VyY2UgPSBSRVNPVVJDRS5JUk9OX09SRSB8IDB4MDc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlcy5taW5lSXJvbk9yZSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jlc291cmNlID0gUkVTT1VSQ0UuR1JBTklURSB8IDB4MDc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlcy5taW5lR3Jhbml0ZSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGV4dHVyZUZsYWcgJiBURVhUVVJFLkhBQklUQUJMRSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHRleHR1cmVGbGFnICYgVEVYVFVSRS5BUkFCTEUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZnJlc2ggd2F0ZXIhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jlc291cmNlID0gUkVTT1VSQ0UuRlJFU0hfV0FURVI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlcy5mcmVzaFdhdGVyKys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkYXRhW3Jlc291cmNlQmxvY2sgKyBpXSA9IG5ld1Jlc291cmNlO1xyXG4gICAgICAgICAgICAvLyBtYXJrIHNwb3QgdW5maXQgZm9yIHRyZWVzIGFuZCBncmFuaXRlXHJcbiAgICAgICAgICAgIGlmKGRhdGFbc2l0ZUJsb2NrICsgaV0gPT09IFNJVEUuSU1QQVNTQUJMRSkge1xyXG4gICAgICAgICAgICAgICAgZGF0YVt0b3VjaEJsb2NrICsgaV0gPSAxO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdXNhYmxlTGFuZG1hc3MrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbWFyayBzcG90cyBhcm91bmQgaGVhZHF1YXJ0ZXJzIHVuZmlyIGZvciB0cmVlcyBhbmQgZ3Jhbml0ZVxyXG4gICAgICAgIGZvcihpID0gMDsgaSA8IHBsYXllcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgbm9kZXMgPSBtYXAuZ2V0UmFkaXVzTm9kZXMocGxheWVyc1tpXS54LCBwbGF5ZXJzW2ldLnksIDUpO1xyXG4gICAgICAgICAgICBmb3IoaiA9IDA7IGogPCBub2Rlcy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgZGF0YVt0b3VjaEJsb2NrICsgbm9kZXNbal1dID0gMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB1c2FibGVMYW5kbWFzcyAtPSBqO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2FsY3VsYXRlIHRhcmdldCBhbW91bnRzIGZvciB0cmVlc1xyXG4gICAgICAgIG9wdGlvbnMudHJlZVJhdGlvID0gdXNhYmxlTGFuZG1hc3MgKiBvcHRpb25zLnRyZWVSYXRpbztcclxuXHJcbiAgICAgICAgLy8gYXBwbHkgdHJlZXNcclxuICAgICAgICB3aGlsZSh1c2FibGVMYW5kbWFzcyA+IDAgJiYgcmVzb3VyY2VzLnRyZWUgPCBvcHRpb25zLnRyZWVSYXRpbykge1xyXG4gICAgICAgICAgICBpID0gfn4oTWF0aC5yYW5kb20oKSAqIHNpemUpO1xyXG4gICAgICAgICAgICBpZihkYXRhW3RvdWNoQmxvY2sgKyBpXSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgbm9kZXMgPSBtYXAuZ2V0UmFkaXVzTm9kZXMoaSAlIHdpZHRoLCB+figoaSAtIChpICUgd2lkdGgpKSAvIHdpZHRoKSwgc2VlZE1hcFtpXSAmIDB4MDcpO1xyXG4gICAgICAgICAgICAgICAgZm9yKGogPSAwOyBqIDwgbm9kZXMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBrID0gbm9kZXNbal07XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc2VlIGlmIHdlIHRoaXMgbG9jYXRpb24gaXMgZnJlZSB0byB1c2VcclxuICAgICAgICAgICAgICAgICAgICBpZihkYXRhW3RvdWNoQmxvY2sgKyBrXSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByYW5kb20gaGVyZSBhdm9pZHMgZ2V0dGluZyBzdHVjay4uLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiggKHNlZWRNYXBba10gJiAweDAzKSB8fCBNYXRoLnJhbmRvbSgpIDwgMC4yICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFyayBkb25lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhW3RvdWNoQmxvY2sgKyBrXSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0eXBlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhW29iamVjdFR5cGVCbG9jayArIGtdID0gMHhDNDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBpbmUgLyBCaXJjaCAvIE9hayAvIFBhbG0gMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtvYmplY3RJbmRleEJsb2NrICsga10gPSAweDMwICsgKH5+KE1hdGgucmFuZG9tKCkgKiA0KSAqIDB4NDApICsgKH5+KE1hdGgucmFuZG9tKCkgKiAweDA4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbmNyZWFzZSBjb3VudGVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXMudHJlZSsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNhYmxlTGFuZG1hc3MtLTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gY2FsY3VsYXRlIHRhcmdldCBhbW91bnRzIGZvciBncmFuaXRlXHJcbiAgICAgICAgb3B0aW9ucy5ncmFuaXRlUmF0aW8gPSB1c2FibGVMYW5kbWFzcyAqIG9wdGlvbnMuZ3Jhbml0ZVJhdGlvO1xyXG5cclxuICAgICAgICAvLyBhcHBseSBncmFuaXRlXHJcbiAgICAgICAgd2hpbGUodXNhYmxlTGFuZG1hc3MgPiAwICYmIHJlc291cmNlcy5ncmFuaXRlIDwgb3B0aW9ucy5ncmFuaXRlUmF0aW8pIHtcclxuICAgICAgICAgICAgaSA9IH5+KE1hdGgucmFuZG9tKCkgKiBzaXplKTtcclxuICAgICAgICAgICAgaWYoZGF0YVt0b3VjaEJsb2NrICsgaV0gPT09IDApIHtcclxuICAgICAgICAgICAgICAgIG5vZGVzID0gbWFwLmdldFJhZGl1c05vZGVzKGkgJSB3aWR0aCwgfn4oKGkgLSAoaSAlIHdpZHRoKSkgLyB3aWR0aCksIHNlZWRNYXBbaV0gJiAweDA3KTtcclxuICAgICAgICAgICAgICAgIGZvcihqID0gMDsgaiA8IG5vZGVzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgayA9IG5vZGVzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNlZSBpZiB3ZSB0aGlzIGxvY2F0aW9uIGlzIGZyZWUgdG8gdXNlXHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZGF0YVt0b3VjaEJsb2NrICsga10gPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmFuZG9tIGhlcmUgYXZvaWRzIGdldHRpbmcgc3R1Y2suLi5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIChzZWVkTWFwW2tdICYgMHgwMykgfHwgTWF0aC5yYW5kb20oKSA8IDAuMiApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hcmsgZG9uZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVt0b3VjaEJsb2NrICsga10gPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdHlwZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtvYmplY3RUeXBlQmxvY2sgKyBrXSA9IDB4Q0MgfCAoc2VlZE1hcFtrXSAmIDB4MDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcXVhbnRpdHlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbb2JqZWN0SW5kZXhCbG9jayArIGtdID0gfn4oTWF0aC5yYW5kb20oKSAqIDUpICsgMjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluY3JlYXNlIGNvdW50ZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlcy5ncmFuaXRlKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2FibGVMYW5kbWFzcy0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBjbGVhbiB1cFxyXG4gICAgICAgIGZvcihpID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgICAgICAgICBkYXRhW3RvdWNoQmxvY2sgKyBpXSA9IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBtdXN0IGRvIHRoaXMgYWdhaW4gbm93XHJcbiAgICAgICAgbWFwLmNhbGN1bGF0ZVNpdGVNYXAoKTtcclxuXHJcbiAgICAgICAgY29uc29sZS50aW1lRW5kKCdhcHBseVJlc291cmNlcycpXHJcblxyXG4gICAgICAgIHJldHVybiByZXNvdXJjZXM7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBkcmF3ID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG4gICAgICAgIC8vaWYoIW9wdGlvbnMgfHwgIW9wdGlvbnMubGVuZ3RoKSBvcHRpb25zID0ge307XHJcbiAgICAgICAgLy8gZHJhdyB0aGUgc3R1ZmYgc28gd2UgY2FuIHNlZSBzdHVmZlxyXG4gICAgICAgIHZhciBjYW52YXMgPSBvcHRpb25zLmNhbnZhcyxcclxuICAgICAgICAgICAgYnVmZmVyID0gY2FudmFzLmdldENvbnRleHQoJzJkJyksXHJcbiAgICAgICAgICAgIGltYWdlID0gYnVmZmVyLmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KSxcclxuICAgICAgICAgICAgdmlldyA9IGltYWdlLmRhdGEsXHJcbiAgICAgICAgICAgIGxpZ2h0TWFwQmxvY2sgPSBzaXplICogMTI7XHJcblxyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XHJcblxyXG4gICAgICAgIHZpZXdUeXBlID0gb3B0aW9ucy52aWV3VHlwZTtcclxuICAgICAgICBvcHRpb25zLnRlcnJhaW4gPSB+fm9wdGlvbnMudGVycmFpbiB8fCBURVJSQUlOLkdSRUVOTEFORDtcclxuXHJcbiAgICAgICAgc3dpdGNoKHZpZXdUeXBlKSB7XHJcbiAgICAgICAgY2FzZSAnc2VlZCc6XHJcbiAgICAgICAgICAgIGZvcihpID0gMCwgaiA9IDA7IGkgPCBzaXplOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHZpZXdbaisrXSA9IHNlZWRNYXBbaV07XHJcbiAgICAgICAgICAgICAgICB2aWV3W2orK10gPSBzZWVkTWFwW2ldO1xyXG4gICAgICAgICAgICAgICAgdmlld1tqKytdID0gc2VlZE1hcFtpXTtcclxuICAgICAgICAgICAgICAgIHZpZXdbaisrXSA9IDI1NTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihpKSB7XHJcbiAgICAgICAgICAgICAgICB2aWV3WyhpIDw8IDIpXSA9IDk2O1xyXG4gICAgICAgICAgICAgICAgdmlld1soaSA8PCAyKSArIDFdID0gMTc2O1xyXG4gICAgICAgICAgICAgICAgdmlld1soaSA8PCAyKSArIDJdID0gMjU1O1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAnaGVpZ2h0JzpcclxuICAgICAgICAgICAgZm9yKGkgPSAwLCBqID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYoZGF0YVtpXSA9PT0gYmFzZUxldmVsICYmIHNlZWRNYXBbaV0gPCAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmlld1tqKytdID0gODA7XHJcbiAgICAgICAgICAgICAgICAgICAgdmlld1tqKytdID0gMTYwO1xyXG4gICAgICAgICAgICAgICAgICAgIHZpZXdbaisrXSA9IDE5MjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmlld1tqKytdID0gZGF0YVtpXSA8PCAyO1xyXG4gICAgICAgICAgICAgICAgICAgIHZpZXdbaisrXSA9IGRhdGFbaV0gPDwgMjtcclxuICAgICAgICAgICAgICAgICAgICB2aWV3W2orK10gPSBkYXRhW2ldIDw8IDI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2aWV3W2orK10gPSAyNTU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAnbGlnaHQnOlxyXG4gICAgICAgICAgICBmb3IoaSA9IDAsIGogPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZihkYXRhW2ldID09PSBiYXNlTGV2ZWwgJiYgc2VlZE1hcFtpXSA8IDIpIHtcclxuICAgICAgICAgICAgICAgICAgICB2aWV3W2orK10gPSBkYXRhW2xpZ2h0TWFwQmxvY2sgKyBpXSAqIDAuMjUgKyA0MDtcclxuICAgICAgICAgICAgICAgICAgICB2aWV3W2orK10gPSBkYXRhW2xpZ2h0TWFwQmxvY2sgKyBpXSAqIDAuNzUgKyA4MDtcclxuICAgICAgICAgICAgICAgICAgICB2aWV3W2orK10gPSBkYXRhW2xpZ2h0TWFwQmxvY2sgKyBpXSAqIDAuODUgKyA5NjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmlld1tqKytdID0gZGF0YVtsaWdodE1hcEJsb2NrICsgaV0gKiAwLjkgKyA0ODtcclxuICAgICAgICAgICAgICAgICAgICB2aWV3W2orK10gPSBkYXRhW2xpZ2h0TWFwQmxvY2sgKyBpXSAqIDEuMSArIDMyO1xyXG4gICAgICAgICAgICAgICAgICAgIHZpZXdbaisrXSA9IGRhdGFbbGlnaHRNYXBCbG9jayArIGldICogMC41ICsgMzI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2aWV3W2orK10gPSAyNTU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAncHJldHR5JzpcclxuICAgICAgICAgICAgdmFyIGNvbG9yID0gY29sb3JzW29wdGlvbnMudGVycmFpbl0uZGF0YSxcclxuICAgICAgICAgICAgICAgIC8vIHJvdyBpbmZvcm1hdGlvbiBzbyB3ZSBjYW4gZG8gc29tZSBncmFwaGljYWwgYWRqdXN0bWVudHNcclxuICAgICAgICAgICAgICAgIHkgPSAtMSxcclxuICAgICAgICAgICAgICAgIHRleHR1cmVfY29sb3JfbWVycmkgPSBDT0xPUi5NRVJSSVtvcHRpb25zLnRlcnJhaW5dLFxyXG4gICAgICAgICAgICAgICAgdGV4dHVyZV9jb2xvcl9vcmlnaW5hbCA9IENPTE9SLk9SSUdJTkFMW29wdGlvbnMudGVycmFpbl0sXHJcbiAgICAgICAgICAgICAgICB0cmVlSW5kZXgsIGcsIGcyLCBjMSwgYzIsIGMzLCBjNCwgYzUsIGM2LCBjNywgYzgsIGM5LCBjQSwgY0IsIGNDLCBqLFxyXG4gICAgICAgICAgICAgICAgY29sb3IxLCBjb2xvcjIsIGNvbG9yMywgY29sb3JBbHBoYSxcclxuICAgICAgICAgICAgICAgIGRyYXdOb2RlcyxcclxuICAgICAgICAgICAgICAgIGxlZnROb2RlcyxcclxuICAgICAgICAgICAgICAgIHRleHR1cmVzLFxyXG4gICAgICAgICAgICAgICAgb2JqZWN0SW5kZXhCbG9jayA9IHNpemUgKiA0LFxyXG4gICAgICAgICAgICAgICAgb2JqZWN0VHlwZUJsb2NrID0gc2l6ZSAqIDUsXHJcbiAgICAgICAgICAgICAgICBkcmF3UG9zID0gMDtcclxuICAgIFxyXG4gICAgICAgICAgICAvLyBhbmQgdGhlbiB3ZSBqdXN0IGxvb3AgdGhyb3VnaCFcclxuICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBrZWVwIHRyYWNrIG9mIGN1cnJlbnQgcm93XHJcbiAgICAgICAgICAgICAgICBpZiggaSAlIHdpZHRoID09PSAwKSB5Kys7XHJcbiAgICAgICAgICAgICAgICBkcmF3Tm9kZXMgPSBtYXAuZ2V0Tm9kZXNCeUluZGV4KGkpO1xyXG4gICAgICAgICAgICAgICAgbGVmdE5vZGVzID0gbWFwLmdldE5vZGVzQnlJbmRleChkcmF3Tm9kZXMubGVmdCk7XHJcbiAgICAgICAgICAgICAgICAvLyBsaWdodCBhbmQgc2hhZG93IGNhbGN1bGF0aW9uIChub3QgbGlrZSB0aGUgb25lIGluIHRoZSBnYW1lISlcclxuICAgICAgICAgICAgICAgIGcgPSA5NiwgaiA9IGRhdGFbaV07XHJcbiAgICAgICAgICAgICAgICBnICs9IDEyICogKGRhdGFbIGRyYXdOb2Rlcy50b3BSaWdodCBdIC0gaik7XHJcbiAgICAgICAgICAgICAgICBnICs9IDggKiAoZGF0YVsgZHJhd05vZGVzLnRvcExlZnQgXSAtIGopO1xyXG4gICAgICAgICAgICAgICAgZyAtPSA4ICogKGRhdGFbIGRyYXdOb2Rlcy5sZWZ0IF0gLSBqKTtcclxuICAgICAgICAgICAgICAgIGcgLT0gMTYgKiAoZGF0YVsgbGVmdE5vZGVzLmJvdHRvbUxlZnQgXSAtIGopO1xyXG4gICAgICAgICAgICAgICAgLy8ga2VlcCB2YWx1ZSB3aXRoaW4gdmFsaWQgcmFuZ2VcclxuICAgICAgICAgICAgICAgIGcgPSBNYXRoLm1heChNYXRoLm1pbigyNTUsIGcpLCAwKTtcclxuICAgICAgICAgICAgICAgIC8vIGdyYWIgc29tZSB0ZXh0dXJlc1xyXG4gICAgICAgICAgICAgICAgdGV4dHVyZXMgPSBtYXAuZ2V0VGV4dHVyZXNCeUluZGV4KGkpO1xyXG4gICAgICAgICAgICAgICAgLy8gZ2V0IGEgZmV3IGNvbG9yIGluZGV4ZXMuLi5cclxuICAgICAgICAgICAgICAgIGMxID0gKGcgKyAyNTYgKiB0ZXh0dXJlX2NvbG9yX21lcnJpWyB0ZXh0dXJlcy50b3BMZWZ0IF0pICogNDtcclxuICAgICAgICAgICAgICAgIGMyID0gKGcgKyAyNTYgKiB0ZXh0dXJlX2NvbG9yX29yaWdpbmFsWyB0ZXh0dXJlcy50b3BMZWZ0IF0pICogNDtcclxuICAgICAgICAgICAgICAgIGMzID0gKGcgKyAyNTYgKiB0ZXh0dXJlX2NvbG9yX21lcnJpWyB0ZXh0dXJlcy50b3AgXSkgKiA0O1xyXG4gICAgICAgICAgICAgICAgYzQgPSAoZyArIDI1NiAqIHRleHR1cmVfY29sb3Jfb3JpZ2luYWxbIHRleHR1cmVzLnRvcCBdKSAqIDQ7XHJcbiAgICAgICAgICAgICAgICBjNSA9IChnICsgMjU2ICogdGV4dHVyZV9jb2xvcl9tZXJyaVsgdGV4dHVyZXMudG9wUmlnaHQgXSkgKiA0O1xyXG4gICAgICAgICAgICAgICAgYzYgPSAoZyArIDI1NiAqIHRleHR1cmVfY29sb3Jfb3JpZ2luYWxbIHRleHR1cmVzLnRvcFJpZ2h0IF0pICogNDtcclxuICAgICAgICAgICAgICAgIGM3ID0gKGcgKyAyNTYgKiB0ZXh0dXJlX2NvbG9yX21lcnJpWyB0ZXh0dXJlcy5ib3R0b21MZWZ0IF0pICogNDtcclxuICAgICAgICAgICAgICAgIGM4ID0gKGcgKyAyNTYgKiB0ZXh0dXJlX2NvbG9yX29yaWdpbmFsWyB0ZXh0dXJlcy5ib3R0b21MZWZ0IF0pICogNDtcclxuICAgICAgICAgICAgICAgIGM5ID0gKGcgKyAyNTYgKiB0ZXh0dXJlX2NvbG9yX21lcnJpWyB0ZXh0dXJlcy5ib3R0b20gXSkgKiA0O1xyXG4gICAgICAgICAgICAgICAgY0EgPSAoZyArIDI1NiAqIHRleHR1cmVfY29sb3Jfb3JpZ2luYWxbIHRleHR1cmVzLmJvdHRvbSBdKSAqIDQ7XHJcbiAgICAgICAgICAgICAgICBjQiA9IChnICsgMjU2ICogdGV4dHVyZV9jb2xvcl9tZXJyaVsgdGV4dHVyZXMuYm90dG9tUmlnaHQgXSkgKiA0O1xyXG4gICAgICAgICAgICAgICAgY0MgPSAoZyArIDI1NiAqIHRleHR1cmVfY29sb3Jfb3JpZ2luYWxbIHRleHR1cmVzLmJvdHRvbVJpZ2h0IF0pICogNDtcclxuICAgICAgICAgICAgICAgIC8vIHRoZW4gbWFrZSBhIGNvbG9yIG1peHR1cmUuLi5cclxuICAgICAgICAgICAgICAgIGNvbG9yMSA9ICgoY29sb3JbYzErK10gKyBjb2xvcltjMisrXSArIGNvbG9yW2MzKytdICsgY29sb3JbYzQrK10gKyBjb2xvcltjNSsrXSArIGNvbG9yW2M2KytdICsgY29sb3JbYzcrK10gKyBjb2xvcltjOCsrXSArIGNvbG9yW2M5KytdICsgY29sb3JbY0ErK10gKyBjb2xvcltjQisrXSArIGNvbG9yW2NDKytdICkgLyAxMikgfCAwO1xyXG4gICAgICAgICAgICAgICAgY29sb3IyID0gKChjb2xvcltjMSsrXSArIGNvbG9yW2MyKytdICsgY29sb3JbYzMrK10gKyBjb2xvcltjNCsrXSArIGNvbG9yW2M1KytdICsgY29sb3JbYzYrK10gKyBjb2xvcltjNysrXSArIGNvbG9yW2M4KytdICsgY29sb3JbYzkrK10gKyBjb2xvcltjQSsrXSArIGNvbG9yW2NCKytdICsgY29sb3JbY0MrK10gKSAvIDEyKSB8IDA7XHJcbiAgICAgICAgICAgICAgICBjb2xvcjMgPSAoKGNvbG9yW2MxKytdICsgY29sb3JbYzIrK10gKyBjb2xvcltjMysrXSArIGNvbG9yW2M0KytdICsgY29sb3JbYzUrK10gKyBjb2xvcltjNisrXSArIGNvbG9yW2M3KytdICsgY29sb3JbYzgrK10gKyBjb2xvcltjOSsrXSArIGNvbG9yW2NBKytdICsgY29sb3JbY0IrK10gKyBjb2xvcltjQysrXSApIC8gMTIpIHwgMDtcclxuICAgICAgICAgICAgICAgIC8vIHdhdGVyIGlzIGFsbW9zdCB0cmFuc3BhcmVudCAod2F0ZXIgb25seSBub2RlID0gMjU1IC0gMTYwKVxyXG4gICAgICAgICAgICAgICAgY29sb3JBbHBoYSA9IDI1NSAtIDMwICogKCh0ZXh0dXJlcy50b3BMZWZ0ID09PSA1KSArICh0ZXh0dXJlcy50b3AgPT09IDUpICsgKHRleHR1cmVzLnRvcFJpZ2h0ID09PSA1KSArIFxyXG4gICAgICAgICAgICAgICAgICAgICh0ZXh0dXJlcy5ib3R0b21MZWZ0ID09PSA1KSArICh0ZXh0dXJlcy5ib3R0b20gPT09IDUpICsgKHRleHR1cmVzLmJvdHRvbVJpZ2h0ID09PSA1KSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIG5vdCBkb25lIHlldCEgY2hlY2sgZm9yIG9iamVjdHMhXHJcbiAgICAgICAgICAgICAgICBzd2l0Y2goZGF0YVtvYmplY3RUeXBlQmxvY2sgKyBpXSkge1xyXG4gICAgICAgICAgICAgICAgLy8gdHJlZXNcclxuICAgICAgICAgICAgICAgIGNhc2UgMTk2OlxyXG4gICAgICAgICAgICAgICAgY2FzZSAxOTc6XHJcbiAgICAgICAgICAgICAgICBjYXNlIDE5ODpcclxuICAgICAgICAgICAgICAgIGNhc2UgMTk5OlxyXG4gICAgICAgICAgICAgICAgICAgIHRyZWVJbmRleCA9ICgoZGF0YVtvYmplY3RUeXBlQmxvY2sgKyBpXSAmIDIpIDw8IDIpIHwgKChkYXRhW29iamVjdEluZGV4QmxvY2sgKyBpXSAmIDB4QzApID4+IDYpO1xyXG4gICAgICAgICAgICAgICAgICAgIGcgPSBUUkVFX0lORk9bb3B0aW9ucy50ZXJyYWluXVt0cmVlSW5kZXhdLkFMUEhBICsgKCgoZGF0YVtvYmplY3RJbmRleEJsb2NrICsgaV0gJiA3KSArIDEpIC8gMjUpIC0gMC4zMjtcclxuICAgICAgICAgICAgICAgICAgICBnMiA9ICgxIC0gZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29sb3IxID0gfn4oY29sb3IxICogZzIgKyBUUkVFX0lORk9bb3B0aW9ucy50ZXJyYWluXVt0cmVlSW5kZXhdLlJFRCAqIGcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yMiA9IH5+KGNvbG9yMiAqIGcyICsgVFJFRV9JTkZPW29wdGlvbnMudGVycmFpbl1bdHJlZUluZGV4XS5HUkVFTiAqIGcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yMyA9IH5+KGNvbG9yMyAqIGcyICsgVFJFRV9JTkZPW29wdGlvbnMudGVycmFpbl1bdHJlZUluZGV4XS5CTFVFICogZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAvLyBncmFuaXRlXHJcbiAgICAgICAgICAgICAgICBjYXNlIDIwNDpcclxuICAgICAgICAgICAgICAgIGNhc2UgMjA1OlxyXG4gICAgICAgICAgICAgICAgICAgIGcgPSBkYXRhW29iamVjdEluZGV4QmxvY2sgKyBpXSAvIDEwO1xyXG4gICAgICAgICAgICAgICAgICAgIGcyID0gKChjb2xvcjEgKyBjb2xvcjIgKyBjb2xvcjMpIC8gMyArIDY0ICkgKiBnO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yMSA9IE1hdGgubWluKDI1NSwgY29sb3IxICogKDEgLSBnKSArIGcyKTtcclxuICAgICAgICAgICAgICAgICAgICBjb2xvcjIgPSBNYXRoLm1pbigyNTUsIGNvbG9yMiAqICgxIC0gZykgKyBnMik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29sb3IzID0gTWF0aC5taW4oMjU1LCBjb2xvcjMgKiAoMSAtIGcpICsgZzIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmlld1tkcmF3UG9zKytdID0gY29sb3IxO1xyXG4gICAgICAgICAgICAgICAgdmlld1tkcmF3UG9zKytdID0gY29sb3IyO1xyXG4gICAgICAgICAgICAgICAgdmlld1tkcmF3UG9zKytdID0gY29sb3IzO1xyXG4gICAgICAgICAgICAgICAgdmlld1tkcmF3UG9zKytdID0gY29sb3JBbHBoYTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnV1RGJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGJ1ZmZlci5wdXRJbWFnZURhdGEoaW1hZ2UsIDAsIDApO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHZlcnlJbmVmZmljaWVudFN0cmluZ1RvQ1A0MzcodGV4dCwgbGVuZ3RoKSB7XHJcbiAgICAgICAgdmFyIG91dHB1dCA9IFtdLFxyXG4gICAgICAgICAgICBjb2RlO1xyXG4gICAgICAgIGZvcihpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvZGUgPSBDUDQzNy5pbmRleE9mKH5+dGV4dC5jaGFyQ29kZUF0KGkpKTtcclxuICAgICAgICAgICAgaWYoY29kZSA+IC0xKSBvdXRwdXQucHVzaChjb2RlKTtcclxuICAgICAgICAgICAgZWxzZSBvdXRwdXQucHVzaCgweERCKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG91dHB1dDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZ2V0RmlsZUJsb2IgPSBmdW5jdGlvbihvcHRpb25zKSB7XHJcbiAgICAgICAgLy8gMjU3NyA9PiBoZWFkZXIgMjM1MlxyXG4gICAgICAgIC8vICAgICAgICsgYmxvY2sgaGVhZGVycyAxNiAqIDE0ID0gMjI0XHJcbiAgICAgICAgLy8gICAgICAgKyBmb290ZXIgMHhGRlxyXG4gICAgICAgIHZhciBhcmVhcyxcclxuICAgICAgICAgICAgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDI1NzcgKyBzaXplICogMTQpLFxyXG4gICAgICAgICAgICB2aWV3ID0gbmV3IERhdGFWaWV3KGJ1ZmZlciksXHJcbiAgICAgICAgICAgIGJ5dGVWaWV3ID0gdm9pZCAwLFxyXG4gICAgICAgICAgICBwb3MgPSAwLFxyXG4gICAgICAgICAgICBpLFxyXG4gICAgICAgICAgICBvYmplY3RJbmRleEJsb2NrID0gc2l6ZSAqIDQsXHJcbiAgICAgICAgICAgIG9iamVjdFR5cGVCbG9jayA9IHNpemUgKiA1O1xyXG5cclxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuXHJcbiAgICAgICAgb3B0aW9ucy50aXRsZSA9IG9wdGlvbnMudGl0bGUgfHwgJ1Vua25vd24gbWFwJ1xyXG4gICAgICAgIG9wdGlvbnMuYXV0aG9yID0gb3B0aW9ucy5hdXRob3IgfHwgJ01lcnJpXFwnc01hcEdlbmVyYXRvcic7XHJcbiAgICAgICAgb3B0aW9ucy50ZXJyYWluID0gfn5vcHRpb25zLnRlcnJhaW4gfHwgVEVSUkFJTi5HUkVFTkxBTkQ7XHJcbiAgICAgICAgLy8gV09STERfVjEuMFxyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDB4NTcpO1xyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDB4NEYpO1xyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDB4NTIpO1xyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDB4NEMpO1xyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDB4NDQpO1xyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDB4NUYpO1xyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDB4NTYpO1xyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDB4MzEpO1xyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDB4MkUpO1xyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDB4MzApO1xyXG4gICAgICAgIC8vIFRJVExFXHJcbiAgICAgICAgdmVyeUluZWZmaWNpZW50U3RyaW5nVG9DUDQzNyhvcHRpb25zLnRpdGxlLCAxOSkuZm9yRWFjaChmdW5jdGlvbihjaGFyYWN0ZXIpIHtcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50OChwb3MrKywgY2hhcmFjdGVyKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCAwKTtcclxuICAgICAgICAvLyBXSURUSCAmIEhFSUdIVFxyXG4gICAgICAgIHZpZXcuc2V0VWludDE2KHBvcysrLCB3aWR0aCwgdHJ1ZSk7XHJcbiAgICAgICAgcG9zKys7XHJcbiAgICAgICAgdmlldy5zZXRVaW50MTYocG9zKyssIGhlaWdodCwgdHJ1ZSk7XHJcbiAgICAgICAgcG9zKys7XHJcbiAgICAgICAgLy8gVEVSUkFJTlxyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIG9wdGlvbnMudGVycmFpbik7XHJcbiAgICAgICAgLy8gUExBWUVSIENPVU5UXHJcbiAgICAgICAgdmlldy5zZXRVaW50OChwb3MrKywgcGxheWVycy5sZW5ndGgpO1xyXG4gICAgICAgIC8vIEFVVEhPUlxyXG4gICAgICAgIHZlcnlJbmVmZmljaWVudFN0cmluZ1RvQ1A0Mzcob3B0aW9ucy5hdXRob3IsIDE5KS5mb3JFYWNoKGZ1bmN0aW9uKGNoYXJhY3Rlcikge1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCBjaGFyYWN0ZXIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDApO1xyXG4gICAgICAgIC8vIEhFQURRVUFSVEVSU1xyXG4gICAgICAgIGlmKHBsYXllcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MsIHBsYXllcnNbMF0ueCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDE2KHBvcyArIDE0LCBwbGF5ZXJzWzBdLnksIHRydWUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDE2KHBvcywgMHhGRkZGLCB0cnVlKTtcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50MTYocG9zICsgMTQsIDB4RkZGRiwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKHBsYXllcnMubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MgKyAyLCBwbGF5ZXJzWzFdLngsIHRydWUpO1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MgKyAxNiwgcGxheWVyc1sxXS55LCB0cnVlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MgKyAyLCAweEZGRkYsIHRydWUpO1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MgKyAxNiwgMHhGRkZGLCB0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYocGxheWVycy5sZW5ndGggPiAyKSB7XHJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDE2KHBvcyArIDQsIHBsYXllcnNbMl0ueCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDE2KHBvcyArIDE4LCBwbGF5ZXJzWzJdLnksIHRydWUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDE2KHBvcyArIDQsIDB4RkZGRiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDE2KHBvcyArIDE4LCAweEZGRkYsIHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBpZihwbGF5ZXJzLmxlbmd0aCA+IDMpIHtcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50MTYocG9zICsgNiwgcGxheWVyc1szXS54LCB0cnVlKTtcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50MTYocG9zICsgMjAsIHBsYXllcnNbM10ueSwgdHJ1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50MTYocG9zICsgNiwgMHhGRkZGLCB0cnVlKTtcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50MTYocG9zICsgMjAsIDB4RkZGRiwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKHBsYXllcnMubGVuZ3RoID4gNCkge1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MgKyA4LCBwbGF5ZXJzWzRdLngsIHRydWUpO1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MgKyAyMiwgcGxheWVyc1s0XS55LCB0cnVlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MgKyA4LCAweEZGRkYsIHRydWUpO1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MgKyAyMiwgMHhGRkZGLCB0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYocGxheWVycy5sZW5ndGggPiA1KSB7XHJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDE2KHBvcyArIDEwLCBwbGF5ZXJzWzVdLngsIHRydWUpO1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MgKyAyNCwgcGxheWVyc1s1XS55LCB0cnVlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MgKyAxMCwgMHhGRkZGLCB0cnVlKTtcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50MTYocG9zICsgMjQsIDB4RkZGRiwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKHBsYXllcnMubGVuZ3RoID4gNikge1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MgKyAxMiwgcGxheWVyc1s2XS54LCB0cnVlKTtcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50MTYocG9zICsgMjYsIHBsYXllcnNbNl0ueSwgdHJ1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50MTYocG9zICsgMTIsIDB4RkZGRiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDE2KHBvcyArIDI2LCAweEZGRkYsIHRydWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcG9zICs9IDI4O1xyXG5cclxuICAgICAgICAvLyBzZXQgb2JqZWN0IHR5cGVzIGFuZCBpbmRleGVzIGZvciBwbGF5ZXJzXHJcbiAgICAgICAgZm9yKGkgPSAwOyBpIDwgcGxheWVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBkYXRhW29iamVjdEluZGV4QmxvY2sgKyBwbGF5ZXJzW2ldLmluZGV4XSA9IGk7XHJcbiAgICAgICAgICAgIGRhdGFbb2JqZWN0VHlwZUJsb2NrICsgcGxheWVyc1tpXS5pbmRleF0gPSAweDgwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gVU5QTEFZQUJJTElUWSBJTkRJQ0FUT1JcclxuICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCAwLCB0cnVlKTtcclxuICAgICAgICAvLyBMRUFERVIgRkFDRVNcclxuICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCAwKTtcclxuICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCAzKTtcclxuICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCA2KTtcclxuICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCA5KTtcclxuICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCAxKTtcclxuICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCA0KTtcclxuICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCA3KTtcclxuXHJcbiAgICAgICAgLy8gR0VUIEFSRUFTXHJcbiAgICAgICAgYXJlYXMgPSBtYXAuY2FsY3VsYXRlQXJlYU1hcCgpO1xyXG5cclxuICAgICAgICAvLyBTRVQgQVJFQVNcclxuICAgICAgICBmb3IoaSA9IDA7IGkgPCBNYXRoLm1pbihhcmVhcy5sZW5ndGgsIDI1MCk7IGkrKykge1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCBhcmVhc1tpXS50eXBlKTtcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50MTYocG9zKyssIGFyZWFzW2ldLngsIHRydWUpO1xyXG4gICAgICAgICAgICBwb3MrKztcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50MTYocG9zKyssIGFyZWFzW2ldLnksIHRydWUpO1xyXG4gICAgICAgICAgICBwb3MrKztcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50MzIocG9zLCBhcmVhc1tpXS5tYXNzLCB0cnVlKTtcclxuICAgICAgICAgICAgcG9zKz00O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU0tJUCBVTlVTRUQgQVJFQVNcclxuICAgICAgICBwb3MgKz0gKDI1MCAtIGkpICogOTtcclxuXHJcbiAgICAgICAgLy8gTUFQIEZJTEUgSURFTlRJRklDQVRJT05cclxuICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCAweDExKTtcclxuICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCAweDI3KTtcclxuICAgICAgICB2aWV3LnNldFVpbnQzMihwb3MsIDAsIHRydWUpO1xyXG4gICAgICAgIHBvcyArPSA0O1xyXG4gICAgICAgIHZpZXcuc2V0VWludDE2KHBvcysrLCB3aWR0aCwgdHJ1ZSk7XHJcbiAgICAgICAgcG9zKys7XHJcbiAgICAgICAgdmlldy5zZXRVaW50MTYocG9zKyssIGhlaWdodCwgdHJ1ZSk7XHJcbiAgICAgICAgcG9zKys7XHJcbiAgICAgICAgLy8gTUFQIERBVEFcclxuICAgICAgICBmb3IoaSA9IDA7IGkgPCAxNDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDB4MTApO1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQ4KHBvcysrLCAweDI3KTtcclxuICAgICAgICAgICAgdmlldy5zZXRVaW50MzIocG9zLCAwKTtcclxuICAgICAgICAgICAgcG9zICs9IDQ7XHJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDE2KHBvcysrLCB3aWR0aCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHBvcysrO1xyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQxNihwb3MrKywgaGVpZ2h0LCB0cnVlKTtcclxuICAgICAgICAgICAgcG9zKys7XHJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDE2KHBvcysrLCAxLCB0cnVlKTtcclxuICAgICAgICAgICAgcG9zKys7XHJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDMyKHBvcywgc2l6ZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHBvcyArPSA0O1xyXG4gICAgICAgICAgICBieXRlVmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlciwgcG9zLCBzaXplKTtcclxuICAgICAgICAgICAgcG9zICs9IHNpemU7XHJcbiAgICAgICAgICAgIGJ5dGVWaWV3LnNldChkYXRhLnN1YmFycmF5KGkgKiBzaXplLCAoaSArIDEpICogc2l6ZSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBFTkQgT0YgRklMRVxyXG4gICAgICAgIHZpZXcuc2V0VWludDgocG9zKyssIDB4RkYpO1xyXG5cclxuICAgICAgICAvLyByZXN0b3JlIG9iamVjdCB0eXBlcyBhbmQgaW5kZXhlcyBmb3IgcGxheWVyc1xyXG4gICAgICAgIGZvcihpID0gMDsgaSA8IHBsYXllcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgZGF0YVtvYmplY3RJbmRleEJsb2NrICsgcGxheWVyc1tpXS5pbmRleF0gPSAwO1xyXG4gICAgICAgICAgICBkYXRhW29iamVjdFR5cGVCbG9jayArIHBsYXllcnNbaV0uaW5kZXhdID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHdlIGFyZSBkb25lIVxyXG4gICAgICAgIHJldHVybiBuZXcgQmxvYihbbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKV0sIHt0eXBlOiAnYXBwbGljYXRpb24vb2N0ZXQtYmluYXJ5J30pO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBpc1JlYWR5VG9EcmF3ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbG9yTWFwO1xyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgc2V0Q29sb3JNYXAgPSBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICBjb2xvck1hcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xyXG5cclxuICAgICAgICAgICAgY29sb3JNYXAub25sb2FkID0gZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIGEgY2FudmFzIHdoZXJlIHdlIGNhbiBnZXQgb3VyIG5lZWRzXHJcbiAgICAgICAgICAgICAgICB2YXIgYnVmZmVyLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FudmFzLndpZHRoID0gMjU2O1xyXG4gICAgICAgICAgICAgICAgICAgIGNhbnZhcy5oZWlnaHQgPSA3Njg7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZ2V0IGRyYXdpbmcgY29udGV4dFxyXG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFuZCBkcmF3IHRoZSBpbWFnZVxyXG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlci5kcmF3SW1hZ2UoZS50YXJnZXQsIDAsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGdyZWVubGFuZFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yc1swXSA9IGJ1ZmZlci5nZXRJbWFnZURhdGEoMCwgMCwgMjU2LCAyNTYpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHdhc3RlbGFuZFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yc1sxXSA9IGJ1ZmZlci5nZXRJbWFnZURhdGEoMCwgMjU2LCAyNTYsIDI1Nik7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gd2ludGVyIHdvcmxkXHJcbiAgICAgICAgICAgICAgICAgICAgY29sb3JzWzJdID0gYnVmZmVyLmdldEltYWdlRGF0YSgwLCA1MTIsIDI1NiwgMjU2KTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBtYXJrIGFzIGRvbmVcclxuICAgICAgICAgICAgICAgICAgICBjb2xvck1hcCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVzb2x2ZSBwcm9taXNlIHdpdGggY29sb3JzIGFycmF5XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShjb2xvcnMpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb2xvck1hcCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGp1c3QgcGFzcyB0aGUgZXJyb3JcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbG9yTWFwLm9uZXJyb3IgPSByZWplY3Q7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2gobmFtZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnYWx0ZXJuYXRpdmUnOlxyXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yTWFwLnNyYyA9ICcuL2xpZ2h0bWFwX2luZGV4X2FsdGVybmF0aXZlLnBuZyc7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdoaWdoLWNvbnRyYXN0JzpcclxuICAgICAgICAgICAgICAgICAgICBjb2xvck1hcC5zcmMgPSAnLi9saWdodG1hcF9pbmRleF9oaWdoLWNvbnRyYXN0LnBuZyc7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yTWFwLnNyYyA9ICcuL2xpZ2h0bWFwX2luZGV4LnBuZyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBhcHBseVJlc291cmNlczogYXBwbHlSZXNvdXJjZXMsXHJcbiAgICAgICAgY3JlYXRlQmFzZVRleHR1cmVzOiBjcmVhdGVCYXNlVGV4dHVyZXMsXHJcbiAgICAgICAgY3JlYXRlSGVpZ2h0OiBjcmVhdGVIZWlnaHQsXHJcbiAgICAgICAgZHJhdzogZHJhdyxcclxuICAgICAgICBnZXRGaWxlQmxvYjogZ2V0RmlsZUJsb2IsXHJcbiAgICAgICAgZ2V0UmFuZG9tUGxheWVyUG9zaXRpb25zOiBnZXRSYW5kb21QbGF5ZXJQb3NpdGlvbnMsXHJcbiAgICAgICAgaXNSZWFkeVRvRHJhdzogaXNSZWFkeVRvRHJhdyxcclxuICAgICAgICBzZWVkOiBzZWVkLFxyXG4gICAgICAgIHNldENvbG9yTWFwOiBzZXRDb2xvck1hcFxyXG4gICAgfTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2VuZXJhdG9yOyIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNhcCA9IHJlcXVpcmUoJ2FzYXAnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2VcbmZ1bmN0aW9uIFByb21pc2UoZm4pIHtcbiAgaWYgKHR5cGVvZiB0aGlzICE9PSAnb2JqZWN0JykgdGhyb3cgbmV3IFR5cGVFcnJvcignUHJvbWlzZXMgbXVzdCBiZSBjb25zdHJ1Y3RlZCB2aWEgbmV3JylcbiAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IFR5cGVFcnJvcignbm90IGEgZnVuY3Rpb24nKVxuICB2YXIgc3RhdGUgPSBudWxsXG4gIHZhciB2YWx1ZSA9IG51bGxcbiAgdmFyIGRlZmVycmVkcyA9IFtdXG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIHRoaXMudGhlbiA9IGZ1bmN0aW9uKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgaGFuZGxlKG5ldyBIYW5kbGVyKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCByZXNvbHZlLCByZWplY3QpKVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGUoZGVmZXJyZWQpIHtcbiAgICBpZiAoc3RhdGUgPT09IG51bGwpIHtcbiAgICAgIGRlZmVycmVkcy5wdXNoKGRlZmVycmVkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGFzYXAoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY2IgPSBzdGF0ZSA/IGRlZmVycmVkLm9uRnVsZmlsbGVkIDogZGVmZXJyZWQub25SZWplY3RlZFxuICAgICAgaWYgKGNiID09PSBudWxsKSB7XG4gICAgICAgIChzdGF0ZSA/IGRlZmVycmVkLnJlc29sdmUgOiBkZWZlcnJlZC5yZWplY3QpKHZhbHVlKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHZhciByZXRcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldCA9IGNiKHZhbHVlKVxuICAgICAgfVxuICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGUpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXQpXG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc29sdmUobmV3VmFsdWUpIHtcbiAgICB0cnkgeyAvL1Byb21pc2UgUmVzb2x1dGlvbiBQcm9jZWR1cmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9wcm9taXNlcy1hcGx1cy9wcm9taXNlcy1zcGVjI3RoZS1wcm9taXNlLXJlc29sdXRpb24tcHJvY2VkdXJlXG4gICAgICBpZiAobmV3VmFsdWUgPT09IHNlbGYpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0EgcHJvbWlzZSBjYW5ub3QgYmUgcmVzb2x2ZWQgd2l0aCBpdHNlbGYuJylcbiAgICAgIGlmIChuZXdWYWx1ZSAmJiAodHlwZW9mIG5ld1ZhbHVlID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgbmV3VmFsdWUgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgIHZhciB0aGVuID0gbmV3VmFsdWUudGhlblxuICAgICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBkb1Jlc29sdmUodGhlbi5iaW5kKG5ld1ZhbHVlKSwgcmVzb2x2ZSwgcmVqZWN0KVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzdGF0ZSA9IHRydWVcbiAgICAgIHZhbHVlID0gbmV3VmFsdWVcbiAgICAgIGZpbmFsZSgpXG4gICAgfSBjYXRjaCAoZSkgeyByZWplY3QoZSkgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVqZWN0KG5ld1ZhbHVlKSB7XG4gICAgc3RhdGUgPSBmYWxzZVxuICAgIHZhbHVlID0gbmV3VmFsdWVcbiAgICBmaW5hbGUoKVxuICB9XG5cbiAgZnVuY3Rpb24gZmluYWxlKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBkZWZlcnJlZHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspXG4gICAgICBoYW5kbGUoZGVmZXJyZWRzW2ldKVxuICAgIGRlZmVycmVkcyA9IG51bGxcbiAgfVxuXG4gIGRvUmVzb2x2ZShmbiwgcmVzb2x2ZSwgcmVqZWN0KVxufVxuXG5cbmZ1bmN0aW9uIEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHJlc29sdmUsIHJlamVjdCl7XG4gIHRoaXMub25GdWxmaWxsZWQgPSB0eXBlb2Ygb25GdWxmaWxsZWQgPT09ICdmdW5jdGlvbicgPyBvbkZ1bGZpbGxlZCA6IG51bGxcbiAgdGhpcy5vblJlamVjdGVkID0gdHlwZW9mIG9uUmVqZWN0ZWQgPT09ICdmdW5jdGlvbicgPyBvblJlamVjdGVkIDogbnVsbFxuICB0aGlzLnJlc29sdmUgPSByZXNvbHZlXG4gIHRoaXMucmVqZWN0ID0gcmVqZWN0XG59XG5cbi8qKlxuICogVGFrZSBhIHBvdGVudGlhbGx5IG1pc2JlaGF2aW5nIHJlc29sdmVyIGZ1bmN0aW9uIGFuZCBtYWtlIHN1cmVcbiAqIG9uRnVsZmlsbGVkIGFuZCBvblJlamVjdGVkIGFyZSBvbmx5IGNhbGxlZCBvbmNlLlxuICpcbiAqIE1ha2VzIG5vIGd1YXJhbnRlZXMgYWJvdXQgYXN5bmNocm9ueS5cbiAqL1xuZnVuY3Rpb24gZG9SZXNvbHZlKGZuLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICB2YXIgZG9uZSA9IGZhbHNlO1xuICB0cnkge1xuICAgIGZuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgaWYgKGRvbmUpIHJldHVyblxuICAgICAgZG9uZSA9IHRydWVcbiAgICAgIG9uRnVsZmlsbGVkKHZhbHVlKVxuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgIGlmIChkb25lKSByZXR1cm5cbiAgICAgIGRvbmUgPSB0cnVlXG4gICAgICBvblJlamVjdGVkKHJlYXNvbilcbiAgICB9KVxuICB9IGNhdGNoIChleCkge1xuICAgIGlmIChkb25lKSByZXR1cm5cbiAgICBkb25lID0gdHJ1ZVxuICAgIG9uUmVqZWN0ZWQoZXgpXG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLy9UaGlzIGZpbGUgY29udGFpbnMgdGhlbi9wcm9taXNlIHNwZWNpZmljIGV4dGVuc2lvbnMgdG8gdGhlIGNvcmUgcHJvbWlzZSBBUElcblxudmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2NvcmUuanMnKVxudmFyIGFzYXAgPSByZXF1aXJlKCdhc2FwJylcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9taXNlXG5cbi8qIFN0YXRpYyBGdW5jdGlvbnMgKi9cblxuZnVuY3Rpb24gVmFsdWVQcm9taXNlKHZhbHVlKSB7XG4gIHRoaXMudGhlbiA9IGZ1bmN0aW9uIChvbkZ1bGZpbGxlZCkge1xuICAgIGlmICh0eXBlb2Ygb25GdWxmaWxsZWQgIT09ICdmdW5jdGlvbicpIHJldHVybiB0aGlzXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGFzYXAoZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJlc29sdmUob25GdWxmaWxsZWQodmFsdWUpKVxuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgIHJlamVjdChleCk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSlcbiAgfVxufVxuVmFsdWVQcm9taXNlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUHJvbWlzZS5wcm90b3R5cGUpXG5cbnZhciBUUlVFID0gbmV3IFZhbHVlUHJvbWlzZSh0cnVlKVxudmFyIEZBTFNFID0gbmV3IFZhbHVlUHJvbWlzZShmYWxzZSlcbnZhciBOVUxMID0gbmV3IFZhbHVlUHJvbWlzZShudWxsKVxudmFyIFVOREVGSU5FRCA9IG5ldyBWYWx1ZVByb21pc2UodW5kZWZpbmVkKVxudmFyIFpFUk8gPSBuZXcgVmFsdWVQcm9taXNlKDApXG52YXIgRU1QVFlTVFJJTkcgPSBuZXcgVmFsdWVQcm9taXNlKCcnKVxuXG5Qcm9taXNlLnJlc29sdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSkgcmV0dXJuIHZhbHVlXG5cbiAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gTlVMTFxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIFVOREVGSU5FRFxuICBpZiAodmFsdWUgPT09IHRydWUpIHJldHVybiBUUlVFXG4gIGlmICh2YWx1ZSA9PT0gZmFsc2UpIHJldHVybiBGQUxTRVxuICBpZiAodmFsdWUgPT09IDApIHJldHVybiBaRVJPXG4gIGlmICh2YWx1ZSA9PT0gJycpIHJldHVybiBFTVBUWVNUUklOR1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRyeSB7XG4gICAgICB2YXIgdGhlbiA9IHZhbHVlLnRoZW5cbiAgICAgIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UodGhlbi5iaW5kKHZhbHVlKSlcbiAgICAgIH1cbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVqZWN0KGV4KVxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFZhbHVlUHJvbWlzZSh2YWx1ZSlcbn1cblxuUHJvbWlzZS5mcm9tID0gUHJvbWlzZS5jYXN0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHZhciBlcnIgPSBuZXcgRXJyb3IoJ1Byb21pc2UuZnJvbSBhbmQgUHJvbWlzZS5jYXN0IGFyZSBkZXByZWNhdGVkLCB1c2UgUHJvbWlzZS5yZXNvbHZlIGluc3RlYWQnKVxuICBlcnIubmFtZSA9ICdXYXJuaW5nJ1xuICBjb25zb2xlLndhcm4oZXJyLnN0YWNrKVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHZhbHVlKVxufVxuXG5Qcm9taXNlLmRlbm9kZWlmeSA9IGZ1bmN0aW9uIChmbiwgYXJndW1lbnRDb3VudCkge1xuICBhcmd1bWVudENvdW50ID0gYXJndW1lbnRDb3VudCB8fCBJbmZpbml0eVxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB3aGlsZSAoYXJncy5sZW5ndGggJiYgYXJncy5sZW5ndGggPiBhcmd1bWVudENvdW50KSB7XG4gICAgICAgIGFyZ3MucG9wKClcbiAgICAgIH1cbiAgICAgIGFyZ3MucHVzaChmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgaWYgKGVycikgcmVqZWN0KGVycilcbiAgICAgICAgZWxzZSByZXNvbHZlKHJlcylcbiAgICAgIH0pXG4gICAgICBmbi5hcHBseShzZWxmLCBhcmdzKVxuICAgIH0pXG4gIH1cbn1cblByb21pc2Uubm9kZWlmeSA9IGZ1bmN0aW9uIChmbikge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIHZhciBjYWxsYmFjayA9IHR5cGVvZiBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gPT09ICdmdW5jdGlvbicgPyBhcmdzLnBvcCgpIDogbnVsbFxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKS5ub2RlaWZ5KGNhbGxiYWNrKVxuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBpZiAoY2FsbGJhY2sgPT09IG51bGwgfHwgdHlwZW9mIGNhbGxiYWNrID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHJlamVjdChleCkgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFzYXAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNhbGxiYWNrKGV4KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5Qcm9taXNlLmFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGNhbGxlZFdpdGhBcnJheSA9IGFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiYgQXJyYXkuaXNBcnJheShhcmd1bWVudHNbMF0pXG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoY2FsbGVkV2l0aEFycmF5ID8gYXJndW1lbnRzWzBdIDogYXJndW1lbnRzKVxuXG4gIGlmICghY2FsbGVkV2l0aEFycmF5KSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcignUHJvbWlzZS5hbGwgc2hvdWxkIGJlIGNhbGxlZCB3aXRoIGEgc2luZ2xlIGFycmF5LCBjYWxsaW5nIGl0IHdpdGggbXVsdGlwbGUgYXJndW1lbnRzIGlzIGRlcHJlY2F0ZWQnKVxuICAgIGVyci5uYW1lID0gJ1dhcm5pbmcnXG4gICAgY29uc29sZS53YXJuKGVyci5zdGFjaylcbiAgfVxuXG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSByZXR1cm4gcmVzb2x2ZShbXSlcbiAgICB2YXIgcmVtYWluaW5nID0gYXJncy5sZW5ndGhcbiAgICBmdW5jdGlvbiByZXMoaSwgdmFsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAodmFsICYmICh0eXBlb2YgdmFsID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICAgIHZhciB0aGVuID0gdmFsLnRoZW5cbiAgICAgICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRoZW4uY2FsbCh2YWwsIGZ1bmN0aW9uICh2YWwpIHsgcmVzKGksIHZhbCkgfSwgcmVqZWN0KVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFyZ3NbaV0gPSB2YWxcbiAgICAgICAgaWYgKC0tcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgcmVzb2x2ZShhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgcmVqZWN0KGV4KVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlcyhpLCBhcmdzW2ldKVxuICAgIH1cbiAgfSlcbn1cblxuUHJvbWlzZS5yZWplY3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgXG4gICAgcmVqZWN0KHZhbHVlKTtcbiAgfSk7XG59XG5cblByb21pc2UucmFjZSA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgXG4gICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpe1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfSlcbiAgfSk7XG59XG5cbi8qIFByb3RvdHlwZSBNZXRob2RzICovXG5cblByb21pc2UucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbiAob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgdmFyIHNlbGYgPSBhcmd1bWVudHMubGVuZ3RoID8gdGhpcy50aGVuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiB0aGlzXG4gIHNlbGYudGhlbihudWxsLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICB0aHJvdyBlcnJcbiAgICB9KVxuICB9KVxufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5ub2RlaWZ5ID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgIT0gJ2Z1bmN0aW9uJykgcmV0dXJuIHRoaXNcblxuICB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCB2YWx1ZSlcbiAgICB9KVxuICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICBjYWxsYmFjayhlcnIpXG4gICAgfSlcbiAgfSlcbn1cblxuUHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBmdW5jdGlvbiAob25SZWplY3RlZCkge1xuICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0ZWQpO1xufVxuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcblxuLy8gVXNlIHRoZSBmYXN0ZXN0IHBvc3NpYmxlIG1lYW5zIHRvIGV4ZWN1dGUgYSB0YXNrIGluIGEgZnV0dXJlIHR1cm5cbi8vIG9mIHRoZSBldmVudCBsb29wLlxuXG4vLyBsaW5rZWQgbGlzdCBvZiB0YXNrcyAoc2luZ2xlLCB3aXRoIGhlYWQgbm9kZSlcbnZhciBoZWFkID0ge3Rhc2s6IHZvaWQgMCwgbmV4dDogbnVsbH07XG52YXIgdGFpbCA9IGhlYWQ7XG52YXIgZmx1c2hpbmcgPSBmYWxzZTtcbnZhciByZXF1ZXN0Rmx1c2ggPSB2b2lkIDA7XG52YXIgaXNOb2RlSlMgPSBmYWxzZTtcblxuZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgLyoganNoaW50IGxvb3BmdW5jOiB0cnVlICovXG5cbiAgICB3aGlsZSAoaGVhZC5uZXh0KSB7XG4gICAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XG4gICAgICAgIHZhciB0YXNrID0gaGVhZC50YXNrO1xuICAgICAgICBoZWFkLnRhc2sgPSB2b2lkIDA7XG4gICAgICAgIHZhciBkb21haW4gPSBoZWFkLmRvbWFpbjtcblxuICAgICAgICBpZiAoZG9tYWluKSB7XG4gICAgICAgICAgICBoZWFkLmRvbWFpbiA9IHZvaWQgMDtcbiAgICAgICAgICAgIGRvbWFpbi5lbnRlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRhc2soKTtcblxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSlMpIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBub2RlLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBjb25zaWRlcmVkIGZhdGFsIGVycm9ycy5cbiAgICAgICAgICAgICAgICAvLyBSZS10aHJvdyB0aGVtIHN5bmNocm9ub3VzbHkgdG8gaW50ZXJydXB0IGZsdXNoaW5nIVxuXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNvbnRpbnVhdGlvbiBpZiB0aGUgdW5jYXVnaHQgZXhjZXB0aW9uIGlzIHN1cHByZXNzZWRcbiAgICAgICAgICAgICAgICAvLyBsaXN0ZW5pbmcgXCJ1bmNhdWdodEV4Y2VwdGlvblwiIGV2ZW50cyAoYXMgZG9tYWlucyBkb2VzKS5cbiAgICAgICAgICAgICAgICAvLyBDb250aW51ZSBpbiBuZXh0IGV2ZW50IHRvIGF2b2lkIHRpY2sgcmVjdXJzaW9uLlxuICAgICAgICAgICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XG4gICAgICAgICAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEluIGJyb3dzZXJzLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBub3QgZmF0YWwuXG4gICAgICAgICAgICAgICAgLy8gUmUtdGhyb3cgdGhlbSBhc3luY2hyb25vdXNseSB0byBhdm9pZCBzbG93LWRvd25zLlxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgIGRvbWFpbi5leGl0KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmbHVzaGluZyA9IGZhbHNlO1xufVxuXG5pZiAodHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgcHJvY2Vzcy5uZXh0VGljaykge1xuICAgIC8vIE5vZGUuanMgYmVmb3JlIDAuOS4gTm90ZSB0aGF0IHNvbWUgZmFrZS1Ob2RlIGVudmlyb25tZW50cywgbGlrZSB0aGVcbiAgICAvLyBNb2NoYSB0ZXN0IHJ1bm5lciwgaW50cm9kdWNlIGEgYHByb2Nlc3NgIGdsb2JhbCB3aXRob3V0IGEgYG5leHRUaWNrYC5cbiAgICBpc05vZGVKUyA9IHRydWU7XG5cbiAgICByZXF1ZXN0Rmx1c2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soZmx1c2gpO1xuICAgIH07XG5cbn0gZWxzZSBpZiAodHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgLy8gSW4gSUUxMCwgTm9kZS5qcyAwLjkrLCBvciBodHRwczovL2dpdGh1Yi5jb20vTm9ibGVKUy9zZXRJbW1lZGlhdGVcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICByZXF1ZXN0Rmx1c2ggPSBzZXRJbW1lZGlhdGUuYmluZCh3aW5kb3csIGZsdXNoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXF1ZXN0Rmx1c2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZXRJbW1lZGlhdGUoZmx1c2gpO1xuICAgICAgICB9O1xuICAgIH1cblxufSBlbHNlIGlmICh0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAvLyBtb2Rlcm4gYnJvd3NlcnNcbiAgICAvLyBodHRwOi8vd3d3Lm5vbmJsb2NraW5nLmlvLzIwMTEvMDYvd2luZG93bmV4dHRpY2suaHRtbFxuICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgICByZXF1ZXN0Rmx1c2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgfTtcblxufSBlbHNlIHtcbiAgICAvLyBvbGQgYnJvd3NlcnNcbiAgICByZXF1ZXN0Rmx1c2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGFzYXAodGFzaykge1xuICAgIHRhaWwgPSB0YWlsLm5leHQgPSB7XG4gICAgICAgIHRhc2s6IHRhc2ssXG4gICAgICAgIGRvbWFpbjogaXNOb2RlSlMgJiYgcHJvY2Vzcy5kb21haW4sXG4gICAgICAgIG5leHQ6IG51bGxcbiAgICB9O1xuXG4gICAgaWYgKCFmbHVzaGluZykge1xuICAgICAgICBmbHVzaGluZyA9IHRydWU7XG4gICAgICAgIHJlcXVlc3RGbHVzaCgpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYXNhcDtcblxuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSkiLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgQVJFQSA9IHtcclxuICAgIFVOVVNFRDogMCxcclxuICAgIExBTkQ6IDEsXHJcbiAgICBXQVRFUjogMixcclxuICAgIElNUEFTU0FCTEU6IDI1NFxyXG59O1xyXG5cclxudmFyIENPTE9SID0ge1xyXG4gICAgT1JJR0lOQUw6IFtcclxuICAgICAgICBbMjMzLCAyMTYsIDEyMywgMjMzLCAxOTksIDI0MCwgMjQwLCAxOTksIDIzMSwgMjMzLCAyMzAsIDIxNiwgMjE2LCAyMTUsIDIzNiwgMjMxLCA1NywgMjU0LCAyMTYsIDI0MCwgNTcsIDU3LCA1NywweEZGLDB4RkYsMHhGRiwweEZGLFxyXG4gICAgICAgIDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMjE2LDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLFxyXG4gICAgICAgIDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRl0sXHJcbiAgICAgICAgWzExNCwgMTY3LCAxMzksIDE2MCwgODUsIDQyLCA0MiwgODUsIDE2NSwgMTY2LCAxNjYsIDMzLCAyMTIsIDIxMiwgMTY3LCAxMTQsIDI0OCwgMjU0LCAxNjAsIDQyLCAyNDgsIDI0OCwgMjQ4LDB4RkYsMHhGRiwweEZGLDB4RkYsXHJcbiAgICAgICAgMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwzMywweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRixcclxuICAgICAgICAweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkZdLFxyXG4gICAgICAgIFsxMjMsIDExNiwgMjQ0LCAyNDQsIDE4MywgMjQwLCAyNDAsIDE4MywgMzYsIDEwMiwgMTIzLCAxMTcsIDExOCwgMTE4LCAyMzMsIDEyMCwgMjQ4LCAyNTQsIDEyMiwgMjQwLCAyNDgsIDI0OCwgMjQ4LDB4RkYsMHhGRiwweEZGLFxyXG4gICAgICAgIDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwxMTcsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLFxyXG4gICAgICAgIDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGXVxyXG4gICAgXSxcclxuICAgIE1FUlJJOiBbXHJcbiAgICAgICAgWzIzNiwgMTk1LCAxMjQsIDIzMSwgMTk5LCAyNDIsIDI0MiwgMTk5LCAyMzMsIDIzMiwgMjMxLCAxOTUsIDE5NCwgMTkzLCAyMTcsIDIzMiwgMjQ5LCAyNTQsIDE2OSwgMjQyLCAyNDksIDI0OSwgMjQ5LDB4RkYsMHhGRiwweEZGLFxyXG4gICAgICAgIDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwxOTUsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLFxyXG4gICAgICAgIDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGXSxcclxuICAgICAgICBbOTgsIDE0NSwgMjMsIDQxLCA4NSwgNDIsIDQyLCA4NSwgMzIsIDE2NiwgMzMsIDExMywgMjQ1LCA0MSwgMzQsIDMzLCAyNTEsIDI1NCwgOTcsIDQyLCAyNTEsIDI1MSwgMjUxLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLFxyXG4gICAgICAgIDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwxMTMsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLFxyXG4gICAgICAgIDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGXSxcclxuICAgICAgICBbMTIyLCAxMTgsIDE3OSwgMTc4LCAxODIsIDI0MiwgMjQyLCAxODIsIDEyMiwgMTcyLCAxMDEsIDEyMCwgMTQ0LCAxMTksIDE3MSwgMTAxLCAyNDksIDI1MiwgMTIzLCAyNDIsIDI0OSwgMjQ5LCAyNDksMHhGRiwweEZGLDB4RkYsXHJcbiAgICAgICAgMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDEyMCwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsXHJcbiAgICAgICAgMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkYsMHhGRiwweEZGLDB4RkZdXHJcbiAgICBdXHJcbn07XHJcblxyXG52YXIgQ1A0MzcgPSBbMCwgOTc4NiwgOTc4NywgOTgyOSwgOTgzMCwgOTgyNywgOTgyNCwgODIyNiwgOTY4OCwgOTY3NSwgOTY4OSwgOTc5NCwgOTc5MiwgOTgzNCwgOTgzNSwgOTc4OCwgOTY1OCwgOTY2OCwgODU5NywgODI1MiwgMTgyLCAxNjcsXHJcbiAgICA5NjQ0LCA4NjE2LCA4NTkzLCA4NTk1LCA4NTk0LCA4NTkyLCA4NzM1LCA4NTk2LCA5NjUwLCA5NjYwLCAzMiwgMzMsIDM0LCAzNSwgMzYsIDM3LCAzOCwgMzksIDQwLCA0MSwgNDIsIDQzLCA0NCwgNDUsIDQ2LCA0NywgNDgsIDQ5LCA1MCwgNTEsXHJcbiAgICA1MiwgNTMsIDU0LCA1NSwgNTYsIDU3LCA1OCwgNTksIDYwLCA2MSwgNjIsIDYzLCA2NCwgNjUsIDY2LCA2NywgNjgsIDY5LCA3MCwgNzEsIDcyLCA3MywgNzQsIDc1LCA3NiwgNzcsIDc4LCA3OSwgODAsIDgxLCA4MiwgODMsIDg0LCA4NSwgODYsXHJcbiAgICA4NywgODgsIDg5LCA5MCwgOTEsIDkyLCA5MywgOTQsIDk1LCA5NiwgOTcsIDk4LCA5OSwgMTAwLCAxMDEsIDEwMiwgMTAzLCAxMDQsIDEwNSwgMTA2LCAxMDcsIDEwOCwgMTA5LCAxMTAsIDExMSwgMTEyLCAxMTMsIDExNCwgMTE1LCAxMTYsIDExNyxcclxuICAgIDExOCwgMTE5LCAxMjAsIDEyMSwgMTIyLCAxMjMsIDEyNCwgMTI1LCAxMjYsIDg5NjIsIDE5OSwgMjUyLCAyMzMsIDIyNiwgMjI4LCAyMjQsIDIyOSwgMjMxLCAyMzQsIDIzNSwgMjMyLCAyMzksIDIzOCwgMjM2LCAxOTYsIDE5NywgMjAxLCAyMzAsXHJcbiAgICAxOTgsIDI0NCwgMjQ2LCAyNDIsIDI1MSwgMjQ5LCAyNTUsIDIxNCwgMjIwLCAxNjIsIDE2MywgMTY1LCA4MzU5LCA0MDIsIDIyNSwgMjM3LCAyNDMsIDI1MCwgMjQxLCAyMDksIDE3MCwgMTg2LCAxOTEsIDg5NzYsIDE3MiwgMTg5LCAxODgsIDE2MSxcclxuICAgIDE3MSwgMTg3LCA5NjE3LCA5NjE4LCA5NjE5LCA5NDc0LCA5NTA4LCA5NTY5LCA5NTcwLCA5NTU4LCA5NTU3LCA5NTcxLCA5NTUzLCA5NTU5LCA5NTY1LCA5NTY0LCA5NTYzLCA5NDg4LCA5NDkyLCA5NTI0LCA5NTE2LCA5NTAwLCAzNywgMzcsXHJcbiAgICA5NTY2LCA1NjcsIDk1NjIsIDk1NTYsIDk1NzcsIDk1NzQsIDk1NjgsIDk1NTIsIDk1ODAsIDk1NzUsIDk1NzYsIDk1NzIsIDk1NzMsIDk1NjEsIDk1NjAsIDk1NTQsIDk1NTUsIDk1NzksIDk1NzgsIDk0OTYsIDk0ODQsIDk2MDgsIDk2MDQsXHJcbiAgICA5NjEyLCA5NjE2LCA5NjAwLCA5NDUsIDIyMywgOTE1LCA5NjAsIDkzMSwgOTYzLCAxODEsIDk2NCwgOTM0LCA5MjAsIDkzNywgOTQ4LCA4NzM0LCA5NjYsIDk0OSwgODc0NSwgODgwMSwgMTc3LCA4ODA1LCA4ODA0LCA4OTkyLCA4OTkzLCAyNDcsXHJcbiAgICA4Nzc2LCAxNzYsIDg3MjksIDE4MywgODczMCwgODMxOSwgMTc4LCA5NjMyLCAxNjBdO1xyXG5cclxudmFyIE9CSkVDVF9UWVBFID0ge1xyXG4gICAgVFJFRTogMHhDNCxcclxuICAgIEdSQU5JVEU6IDB4Q0MsXHJcbiAgICBNQVRDSDogMHhGQ1xyXG59O1xyXG5cclxudmFyIFJFU09VUkNFID0ge1xyXG4gICAgRlJFU0hfV0FURVI6IDB4MjEsXHJcbiAgICBDT0FMOiAweDQwLCAvLyAweDQwIC0gMHg0N1xyXG4gICAgSVJPTl9PUkU6IDB4NDgsIC8vIDB4NDggLSAweDRGXHJcbiAgICBHT0xEOiAweDUwLCAvLyAweDUwIC0gMHg1N1xyXG4gICAgR1JBTklURTogMHg1OCwgLy8gMHg1OCAtIDB4NUZcclxuICAgIEZJU0g6IDB4ODdcclxufTtcclxuXHJcbnZhciBTSVRFID0ge1xyXG4gICAgRkxBRzogMHgwMSxcclxuICAgIEhVVDogMHgwMixcclxuICAgIEhPVVNFOiAweDAzLFxyXG4gICAgQ0FTVExFOiAweDA0LFxyXG4gICAgTUlORTogMHgwNSxcclxuICAgIE9DQ1VQSUVEOiAweDA4LFxyXG4gICAgRkxBR19PQ0NVUElFRDogMHgwOSxcclxuICAgIEhVVF9PQ0NVUElFRDogMHgwQSxcclxuICAgIENBU1RMRV9PQ0NVUElFRDogMHgwQyxcclxuICAgIE1JTkVfT0NDVVBJRUQ6IDB4MEQsXHJcbiAgICBUUkVFOiAweDY4LFxyXG4gICAgSU1QQVNTQUJMRTogMHg3OFxyXG59O1xyXG5cclxudmFyIFRFUlJBSU4gPSB7XHJcbiAgICBHUkVFTkxBTkQ6IDAsXHJcbiAgICBXQVNURUxBTkQ6IDEsXHJcbiAgICBXSU5URVJXT1JMRDogMlxyXG59O1xyXG5cclxudmFyIFRFWFRVUkUgPSB7XHJcbiAgICBTVVBQT1JUX1MyOiAweDAxLCAgIC8vIHRleHR1cmUgaXMgdXNhYmxlIGluIFRoZSBTZXR0bGVycyBJSVxyXG4gICAgU1VQUE9SVF9SVFRSOiAweDAyLCAvLyB0ZXh0dXJlIGlzIHVzYWJsZSBpbiBSZXR1cm4gdG8gdGhlIFJvb3RzXHJcbiAgICBBUkFCTEU6IDB4MDQsICAgICAgIC8vIHlvdSBjYW4gZXhwZWN0IGZhcm0gZmllbGRzIHRvIGdyb3cgaGVyZVxyXG4gICAgSEFCSVRBQkxFOiAweDA4LCAgICAvLyB5b3UgY2FuIGJ1aWxkIGJ1aWxkaW5ncyBoZXJlXHJcbiAgICBBUklEOiAweDEwLCAgICAgICAgIC8vIGl0J3MgdG9vIGhhcmQgdG8gYnVpbGQgYW55dGhpbmcgaGVyZSwgYnV0IHlvdSBjYW4gbWFrZSByb2Fkc1xyXG4gICAgUk9DSzogMHgyMCwgICAgICAgICAvLyBtaW5lcyBiZSBoZXJlXHJcbiAgICBXRVQ6IDB4NDAsICAgICAgICAgIC8vIHN3YW1wIGFuZCB3YXRlclxyXG4gICAgRVhUUkVNRTogMHg4MCwgICAgICAvLyBzbm93IGFuZCBsYXZhXHJcbiAgICBJTVBBU1NBQkxFOiAweEMwLCAgIC8vIGJpdGZsYWcgZm9yIG1hdGNoaW5nIFdFVCBhbmQgRVhUUkVNRSBmb3IgYWxsIGFyZWFzIHRoYXQgbm90IHVzYWJsZSBmb3IgdGhlIHBsYXllclxyXG5cclxuICAgIC8vIGZvciBhY3R1YWwgdGV4dHVyZSBJRCBtYXRjaGluZ1xyXG4gICAgVE9fSURfVkFMVUU6IDB4M0YsICAvLyBiaXRmbGFnIGZvciByZW1vdmluZyB0d28gaGlnaGVzdCBiaXRzIHRoYXQgYXJlIHVzZWQgZm9yIGJpdGZsYWdzIVxyXG4gICAgSEFSQk9SOiAweDQwLCAgICAgICAvLyB0aGlzIGlzIHRoZSBvdGhlciBiaXRmbGFnIGZvciB0aGUgdHdvIGhpZ2hlc3QgYml0c1xyXG4gICAgVU5LTk9XTjogMHg4MCwgICAgICAvLyB3ZSBkbyBub3Qga25vdyB0aGUgbWVhbmluZyBvZiB0aGlzIGJpdGZsYWc7IG9ubHkgZXhpc3RzIG9uIG9uZSBvciB0d28gQmx1ZUJ5dGUgbWFwc1xyXG4gICAgRFJPUF9TVVBQT1JUOiAweEZDICAvLyB0byBnZXQgcmlkIG9mIHN1cHBvcnQgZmxhZ3NcclxufTtcclxuXHJcbnZhciBURVhUVVJFX0lORk8gPSB7XHJcbiAgICAwOiB7XHJcbiAgICAgICAgRkxBRzogVEVYVFVSRS5TVVBQT1JUX1MyIHwgVEVYVFVSRS5TVVBQT1JUX1JUVFIgfCBURVhUVVJFLkFSQUJMRSB8IFRFWFRVUkUuSEFCSVRBQkxFLFxyXG4gICAgICAgIE5BTUU6IHtcclxuICAgICAgICAgICAgMDogJ1NhdmFubmFoJyxcclxuICAgICAgICAgICAgMTogJ0RhcmsgU3RlcHBlJyxcclxuICAgICAgICAgICAgMjogJ1RhaWdhJ1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICAxOiB7XHJcbiAgICAgICAgRkxBRzogVEVYVFVSRS5TVVBQT1JUX1MyIHwgVEVYVFVSRS5TVVBQT1JUX1JUVFIgfCBURVhUVVJFLlJPQ0ssXHJcbiAgICAgICAgTkFNRToge1xyXG4gICAgICAgICAgICAwOiAnTW91bnRhaW4gIzEnLFxyXG4gICAgICAgICAgICAxOiAnTW91bnRhaW4gIzEnLFxyXG4gICAgICAgICAgICAyOiAnTW91bnRhaW4gIzEnXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIDI6IHtcclxuICAgICAgICBGTEFHOiBURVhUVVJFLlNVUFBPUlRfUzIgfCBURVhUVVJFLlNVUFBPUlRfUlRUUiB8IFRFWFRVUkUuRVhUUkVNRSxcclxuICAgICAgICBOQU1FOiB7XHJcbiAgICAgICAgICAgIDA6ICdTbm93JyxcclxuICAgICAgICAgICAgMTogJ0xhdmEgU3RvbmVzJyxcclxuICAgICAgICAgICAgMjogJ1BhY2sgSWNlJ1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICAzOiB7XHJcbiAgICAgICAgRkxBRzogVEVYVFVSRS5TVVBQT1JUX1MyIHwgVEVYVFVSRS5TVVBQT1JUX1JUVFIgfCBURVhUVVJFLldFVCxcclxuICAgICAgICBOQU1FOiB7XHJcbiAgICAgICAgICAgIDA6ICdTd2FtcCcsXHJcbiAgICAgICAgICAgIDE6ICdMYXZhIEdyb3VuZCcsXHJcbiAgICAgICAgICAgIDI6ICdEcmlmdCBJY2UnXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIDQ6IHtcclxuICAgICAgICBGTEFHOiBURVhUVVJFLlNVUFBPUlRfUzIgfCBURVhUVVJFLlNVUFBPUlRfUlRUUiB8IFRFWFRVUkUuQVJJRCxcclxuICAgICAgICBOQU1FOiB7XHJcbiAgICAgICAgICAgIDA6ICdEZXNlcnQnLFxyXG4gICAgICAgICAgICAxOiAnV2FzdGVsYW5kJyxcclxuICAgICAgICAgICAgMjogJ0ljZSdcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgNToge1xyXG4gICAgICAgIEZMQUc6IFRFWFRVUkUuU1VQUE9SVF9TMiB8IFRFWFRVUkUuU1VQUE9SVF9SVFRSIHwgVEVYVFVSRS5XRVQsXHJcbiAgICAgICAgTkFNRToge1xyXG4gICAgICAgICAgICAwOiAnV2F0ZXInLFxyXG4gICAgICAgICAgICAxOiAnTW9vcicsXHJcbiAgICAgICAgICAgIDI6ICdXYXRlcidcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgNjoge1xyXG4gICAgICAgIEZMQUc6IFRFWFRVUkUuU1VQUE9SVF9TMiB8IFRFWFRVUkUuSEFCSVRBQkxFLFxyXG4gICAgICAgIE5BTUU6IHtcclxuICAgICAgICAgICAgMDogJ0hhYml0YWJsZSBXYXRlcicsXHJcbiAgICAgICAgICAgIDE6ICdIYWJpdGFibGUgTW9vcicsXHJcbiAgICAgICAgICAgIDI6ICdIYWJpdGFibGUgV2F0ZXInXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIDc6IHtcclxuICAgICAgICBGTEFHOiBURVhUVVJFLlNVUFBPUlRfUzIgfCBURVhUVVJFLlNVUFBPUlRfUlRUUiB8IFRFWFRVUkUuQVJJRCxcclxuICAgICAgICBOQU1FOiB7XHJcbiAgICAgICAgICAgIDA6ICdDbG9uZSBEZXNlcnQnLFxyXG4gICAgICAgICAgICAxOiAnQ2xvbmUgV2FzdGVsYW5kJyxcclxuICAgICAgICAgICAgMjogJ0Nsb25lIEljZSdcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgODoge1xyXG4gICAgICAgIEZMQUc6IFRFWFRVUkUuU1VQUE9SVF9TMiB8IFRFWFRVUkUuU1VQUE9SVF9SVFRSIHwgVEVYVFVSRS5BUkFCTEUgfCBURVhUVVJFLkhBQklUQUJMRSxcclxuICAgICAgICBOQU1FOiB7XHJcbiAgICAgICAgICAgIDA6ICdNZWFkb3cgIzEnLFxyXG4gICAgICAgICAgICAxOiAnUGFzdHVyZSAjMScsXHJcbiAgICAgICAgICAgIDI6ICdUYWlnYSAvIFR1bmRyYSdcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgOToge1xyXG4gICAgICAgIEZMQUc6IFRFWFRVUkUuU1VQUE9SVF9TMiB8IFRFWFRVUkUuU1VQUE9SVF9SVFRSIHwgVEVYVFVSRS5BUkFCTEUgfCBURVhUVVJFLkhBQklUQUJMRSxcclxuICAgICAgICBOQU1FOiB7XHJcbiAgICAgICAgICAgIDA6ICdNZWFkb3cgIzInLFxyXG4gICAgICAgICAgICAxOiAnUGFzdHVyZSAjMicsXHJcbiAgICAgICAgICAgIDI6ICdUdW5kcmEgIzEnXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIDEwOiB7XHJcbiAgICAgICAgRkxBRzogVEVYVFVSRS5TVVBQT1JUX1MyIHwgVEVYVFVSRS5TVVBQT1JUX1JUVFIgfCBURVhUVVJFLkFSQUJMRSB8IFRFWFRVUkUuSEFCSVRBQkxFLFxyXG4gICAgICAgIE5BTUU6IHtcclxuICAgICAgICAgICAgMDogJ01lYWRvdyAjMycsXHJcbiAgICAgICAgICAgIDE6ICdQYXN0dXJlICMzJyxcclxuICAgICAgICAgICAgMjogJ1R1bmRyYSAjMidcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgMTE6IHtcclxuICAgICAgICBGTEFHOiBURVhUVVJFLlNVUFBPUlRfUzIgfCBURVhUVVJFLlNVUFBPUlRfUlRUUiB8IFRFWFRVUkUuUk9DSyxcclxuICAgICAgICBOQU1FOiB7XHJcbiAgICAgICAgICAgIDA6ICdNb3VudGFpbiAjMicsXHJcbiAgICAgICAgICAgIDE6ICdNb3VudGFpbiAjMicsXHJcbiAgICAgICAgICAgIDI6ICdNb3VudGFpbiAjMidcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgMTI6IHtcclxuICAgICAgICBGTEFHOiBURVhUVVJFLlNVUFBPUlRfUzIgfCBURVhUVVJFLlNVUFBPUlRfUlRUUiB8IFRFWFRVUkUuUk9DSyxcclxuICAgICAgICBOQU1FOiB7XHJcbiAgICAgICAgICAgIDA6ICdNb3VudGFpbiAjMycsXHJcbiAgICAgICAgICAgIDE6ICdNb3VudGFpbiAjMycsXHJcbiAgICAgICAgICAgIDI6ICdNb3VudGFpbiAjMydcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgMTM6IHtcclxuICAgICAgICBGTEFHOiBURVhUVVJFLlNVUFBPUlRfUzIgfCBURVhUVVJFLlNVUFBPUlRfUlRUUiB8IFRFWFRVUkUuUk9DSyxcclxuICAgICAgICBOQU1FOiB7XHJcbiAgICAgICAgICAgIDA6ICdNb3VudGFpbiAjNCcsXHJcbiAgICAgICAgICAgIDE6ICdNb3VudGFpbiAjNCcsXHJcbiAgICAgICAgICAgIDI6ICdNb3VudGFpbiAjNCdcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgMTQ6IHtcclxuICAgICAgICBGTEFHOiBURVhUVVJFLlNVUFBPUlRfUzIgfCBURVhUVVJFLlNVUFBPUlRfUlRUUiB8IFRFWFRVUkUuQVJBQkxFIHwgVEVYVFVSRS5IQUJJVEFCTEUsXHJcbiAgICAgICAgTkFNRToge1xyXG4gICAgICAgICAgICAwOiAnU3RlcHBlJyxcclxuICAgICAgICAgICAgMTogJ0xpZ2h0IFN0ZXBwZScsXHJcbiAgICAgICAgICAgIDI6ICdUdW5kcmEgIzMnXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIDE1OiB7XHJcbiAgICAgICAgRkxBRzogVEVYVFVSRS5TVVBQT1JUX1MyIHwgVEVYVFVSRS5TVVBQT1JUX1JUVFIgfCBURVhUVVJFLkFSQUJMRSB8IFRFWFRVUkUuSEFCSVRBQkxFLFxyXG4gICAgICAgIE5BTUU6IHtcclxuICAgICAgICAgICAgMDogJ0Zsb3dlciBNZWFkb3cnLFxyXG4gICAgICAgICAgICAxOiAnRmxvd2VyIFBhc3R1cmUnLFxyXG4gICAgICAgICAgICAyOiAnVHVuZHJhICM0J1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICAxNjoge1xyXG4gICAgICAgIEZMQUc6IFRFWFRVUkUuU1VQUE9SVF9TMiB8IFRFWFRVUkUuU1VQUE9SVF9SVFRSIHwgVEVYVFVSRS5FWFRSRU1FLFxyXG4gICAgICAgIE5BTUU6IHtcclxuICAgICAgICAgICAgMDogJ0xhdmEnLFxyXG4gICAgICAgICAgICAxOiAnTGF2YScsXHJcbiAgICAgICAgICAgIDI6ICdMYXZhJ1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICAxNzoge1xyXG4gICAgICAgIEZMQUc6IFRFWFRVUkUuU1VQUE9SVF9TMiB8IFRFWFRVUkUuQVJJRCxcclxuICAgICAgICBOQU1FOiB7XHJcbiAgICAgICAgICAgIDA6ICdTb2xpZCBDb2xvciAoTWFnZW50YSknLFxyXG4gICAgICAgICAgICAxOiAnU29saWQgQ29sb3IgKERhcmsgUmVkKScsXHJcbiAgICAgICAgICAgIDI6ICdTb2xpZCBDb2xvciAoQmxhY2spJ1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICAxODoge1xyXG4gICAgICAgIEZMQUc6IFRFWFRVUkUuU1VQUE9SVF9TMiB8IFRFWFRVUkUuU1VQUE9SVF9SVFRSIHwgVEVYVFVSRS5IQUJJVEFCTEUsXHJcbiAgICAgICAgTkFNRToge1xyXG4gICAgICAgICAgICAwOiAnTW91bnRhaW4gTWVhZG93JyxcclxuICAgICAgICAgICAgMTogJ0FscGluZSBQYXN0dXJlJyxcclxuICAgICAgICAgICAgMjogJ1Nub3cnXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIDE5OiB7XHJcbiAgICAgICAgRkxBRzogVEVYVFVSRS5TVVBQT1JUX1MyIHwgVEVYVFVSRS5FWFRSRU1FLFxyXG4gICAgICAgIE5BTUU6IHtcclxuICAgICAgICAgICAgMDogJ0JvcmRlciBXYXRlcicsXHJcbiAgICAgICAgICAgIDE6ICdCb3JkZXIgTW9vcicsXHJcbiAgICAgICAgICAgIDI6ICdCb3JkZXIgV2F0ZXInXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIDIwOiB7XHJcbiAgICAgICAgRkxBRzogVEVYVFVSRS5TVVBQT1JUX1MyIHwgVEVYVFVSRS5FWFRSRU1FLFxyXG4gICAgICAgIE5BTUU6IHtcclxuICAgICAgICAgICAgMDogJ1NvbGlkIENvbG9yIExhdmEgIzEgKE1hZ2VudGEpJyxcclxuICAgICAgICAgICAgMTogJ1NvbGlkIENvbG9yIExhdmEgIzEgKERhcmsgUmVkKScsXHJcbiAgICAgICAgICAgIDI6ICdTb2xpZCBDb2xvciBMYXZhICMxIChCbGFjayknXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIDIxOiB7XHJcbiAgICAgICAgRkxBRzogVEVYVFVSRS5TVVBQT1JUX1MyIHwgVEVYVFVSRS5FWFRSRU1FLFxyXG4gICAgICAgIE5BTUU6IHtcclxuICAgICAgICAgICAgMDogJ1NvbGlkIENvbG9yIExhdmEgIzIgKE1hZ2VudGEpJyxcclxuICAgICAgICAgICAgMTogJ1NvbGlkIENvbG9yIExhdmEgIzIgKERhcmsgUmVkKScsXHJcbiAgICAgICAgICAgIDI6ICdTb2xpZCBDb2xvciBMYXZhICMyIChCbGFjayknXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIDIyOiB7XHJcbiAgICAgICAgRkxBRzogVEVYVFVSRS5TVVBQT1JUX1MyIHwgVEVYVFVSRS5FWFRSRU1FLFxyXG4gICAgICAgIE5BTUU6IHtcclxuICAgICAgICAgICAgMDogJ1NvbGlkIENvbG9yIExhdmEgIzMgKE1hZ2VudGEpJyxcclxuICAgICAgICAgICAgMTogJ1NvbGlkIENvbG9yIExhdmEgIzMgKERhcmsgUmVkKScsXHJcbiAgICAgICAgICAgIDI6ICdTb2xpZCBDb2xvciBMYXZhICMzIChCbGFjayknXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIDM0OiB7XHJcbiAgICAgICAgRkxBRzogVEVYVFVSRS5TVVBQT1JUX1MyIHwgVEVYVFVSRS5IQUJJVEFCTEUsXHJcbiAgICAgICAgTkFNRToge1xyXG4gICAgICAgICAgICAwOiAnTW91bnRhaW4gIzIgKEhhYml0YWJsZSknLFxyXG4gICAgICAgICAgICAxOiAnTW91bnRhaW4gIzIgKEhhYml0YWJsZSknLFxyXG4gICAgICAgICAgICAyOiAnTW91bnRhaW4gIzIgKEhhYml0YWJsZSknXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG52YXIgVFJFRV9JTkZPID0gW1xyXG4gICAgW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAyMSxcclxuICAgICAgICAgICAgR1JFRU46IDczLFxyXG4gICAgICAgICAgICBCTFVFOiAxNSxcclxuICAgICAgICAgICAgQUxQSEE6IDAuNjIzNTI5NDExNzY0NzA1ODgyMzUyOTQxMTc2NDcwNTksXHJcbiAgICAgICAgICAgIE5BTUU6ICdQaW5lJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDIzLFxyXG4gICAgICAgICAgICBHUkVFTjogNzAsXHJcbiAgICAgICAgICAgIEJMVUU6IDI3LFxyXG4gICAgICAgICAgICBBTFBIQTogMC41NTY4NjI3NDUwOTgwMzkyMTU2ODYyNzQ1MDk4MDM5MixcclxuICAgICAgICAgICAgTkFNRTogJ0JpcmNoJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDIxLFxyXG4gICAgICAgICAgICBHUkVFTjogNjUsXHJcbiAgICAgICAgICAgIEJMVUU6IDE2LFxyXG4gICAgICAgICAgICBBTFBIQTogMC43MDE5NjA3ODQzMTM3MjU0OTAxOTYwNzg0MzEzNzI1NSxcclxuICAgICAgICAgICAgTkFNRTogJ09haydcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiA0OCxcclxuICAgICAgICAgICAgR1JFRU46IDg3LFxyXG4gICAgICAgICAgICBCTFVFOiAyNCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMzI1NDkwMTk2MDc4NDMxMzcyNTQ5MDE5NjA3ODQzMTQsXHJcbiAgICAgICAgICAgIE5BTUU6ICdQYWxtIDEnXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFJFRDogNDIsXHJcbiAgICAgICAgICAgIEdSRUVOOiA3OCxcclxuICAgICAgICAgICAgQkxVRTogMTksXHJcbiAgICAgICAgICAgIEFMUEhBOiAwLjI1NDkwMTk2MDc4NDMxMzcyNTQ5MDE5NjA3ODQzMTM3LFxyXG4gICAgICAgICAgICBOQU1FOiAnUGFsbSAyJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDM0LFxyXG4gICAgICAgICAgICBHUkVFTjogNzMsXHJcbiAgICAgICAgICAgIEJMVUU6IDE5LFxyXG4gICAgICAgICAgICBBTFBIQTogMC4zNjQ3MDU4ODIzNTI5NDExNzY0NzA1ODgyMzUyOTQxMixcclxuICAgICAgICAgICAgTkFNRTogJ1BpbmUgQXBwbGUnXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFJFRDogMzQsXHJcbiAgICAgICAgICAgIEdSRUVOOiA3MSxcclxuICAgICAgICAgICAgQkxVRTogMTgsXHJcbiAgICAgICAgICAgIEFMUEhBOiAwLjQ1ODgyMzUyOTQxMTc2NDcwNTg4MjM1Mjk0MTE3NjQ3LFxyXG4gICAgICAgICAgICBOQU1FOiAnQ3lwcmVzcydcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAxMzEsXHJcbiAgICAgICAgICAgIEdSRUVOOiA1MyxcclxuICAgICAgICAgICAgQkxVRTogMzYsXHJcbiAgICAgICAgICAgIEFMUEhBOiAwLjM4NDMxMzcyNTQ5MDE5NjA3ODQzMTM3MjU0OTAxOTYxLFxyXG4gICAgICAgICAgICBOQU1FOiAnQ2hlcnJ5J1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDIwLFxyXG4gICAgICAgICAgICBHUkVFTjogNzgsXHJcbiAgICAgICAgICAgIEJMVUU6IDE4LFxyXG4gICAgICAgICAgICBBTFBIQTogMC40NjI3NDUwOTgwMzkyMTU2ODYyNzQ1MDk4MDM5MjE1NyxcclxuICAgICAgICAgICAgTkFNRTogJ0ZpcidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjMSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjMidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjMydcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjNCdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjNSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjNidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjNydcclxuICAgICAgICB9XHJcbiAgICBdLCBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDExNyxcclxuICAgICAgICAgICAgR1JFRU46IDgwLFxyXG4gICAgICAgICAgICBCTFVFOiA2MixcclxuICAgICAgICAgICAgQUxQSEE6IDAuMzg0MzEzNzI1NDkwMTk2MDc4NDMxMzcyNTQ5MDE5NjEsXHJcbiAgICAgICAgICAgIE5BTUU6ICdTcGlkZXInXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFJFRDogMTI3LFxyXG4gICAgICAgICAgICBHUkVFTjogNzAsXHJcbiAgICAgICAgICAgIEJMVUU6IDQ5LFxyXG4gICAgICAgICAgICBBTFBIQTogMC40NTQ5MDE5NjA3ODQzMTM3MjU0OTAxOTYwNzg0MzEzNyxcclxuICAgICAgICAgICAgTkFNRTogJ01hcmxleSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAxMTcsXHJcbiAgICAgICAgICAgIEdSRUVOOiA4MCxcclxuICAgICAgICAgICAgQkxVRTogNjIsXHJcbiAgICAgICAgICAgIEFMUEhBOiAwLjM4NDMxMzcyNTQ5MDE5NjA3ODQzMTM3MjU0OTAxOTYxLFxyXG4gICAgICAgICAgICBOQU1FOiAnQ2xvbmUgU3BpZGVyICMxJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDEyNyxcclxuICAgICAgICAgICAgR1JFRU46IDcwLFxyXG4gICAgICAgICAgICBCTFVFOiA0OSxcclxuICAgICAgICAgICAgQUxQSEE6IDAuNDU0OTAxOTYwNzg0MzEzNzI1NDkwMTk2MDc4NDMxMzcsXHJcbiAgICAgICAgICAgIE5BTUU6ICdDbG9uZSBNYXJsZXkgIzEnXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFJFRDogMTE3LFxyXG4gICAgICAgICAgICBHUkVFTjogODAsXHJcbiAgICAgICAgICAgIEJMVUU6IDYyLFxyXG4gICAgICAgICAgICBBTFBIQTogMC4zODQzMTM3MjU0OTAxOTYwNzg0MzEzNzI1NDkwMTk2MSxcclxuICAgICAgICAgICAgTkFNRTogJ0Nsb25lIFNwaWRlciAjMidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAzNCxcclxuICAgICAgICAgICAgR1JFRU46IDczLFxyXG4gICAgICAgICAgICBCTFVFOiAxOSxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMzY0NzA1ODgyMzUyOTQxMTc2NDcwNTg4MjM1Mjk0MTIsXHJcbiAgICAgICAgICAgIE5BTUU6ICdQaW5lIEFwcGxlJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDExNyxcclxuICAgICAgICAgICAgR1JFRU46IDgwLFxyXG4gICAgICAgICAgICBCTFVFOiA2MixcclxuICAgICAgICAgICAgQUxQSEE6IDAuMzg0MzEzNzI1NDkwMTk2MDc4NDMxMzcyNTQ5MDE5NjEsXHJcbiAgICAgICAgICAgIE5BTUU6ICdDbG9uZSBTcGlkZXIgIzMnXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFJFRDogMTMxLFxyXG4gICAgICAgICAgICBHUkVFTjogNTMsXHJcbiAgICAgICAgICAgIEJMVUU6IDM2LFxyXG4gICAgICAgICAgICBBTFBIQTogMC4zODQzMTM3MjU0OTAxOTYwNzg0MzEzNzI1NDkwMTk2MSxcclxuICAgICAgICAgICAgTkFNRTogJ0NoZXJyeSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAxMjcsXHJcbiAgICAgICAgICAgIEdSRUVOOiA3MCxcclxuICAgICAgICAgICAgQkxVRTogNDksXHJcbiAgICAgICAgICAgIEFMUEhBOiAwLjQ1NDkwMTk2MDc4NDMxMzcyNTQ5MDE5NjA3ODQzMTM3LFxyXG4gICAgICAgICAgICBOQU1FOiAnQ2xvbmUgTWFybGV5ICMyJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDAsXHJcbiAgICAgICAgICAgIEdSRUVOOiAwLFxyXG4gICAgICAgICAgICBCTFVFOiAwLFxyXG4gICAgICAgICAgICBBTFBIQTogMC4xLFxyXG4gICAgICAgICAgICBOQU1FOiAnVW51c2VkICMxJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDAsXHJcbiAgICAgICAgICAgIEdSRUVOOiAwLFxyXG4gICAgICAgICAgICBCTFVFOiAwLFxyXG4gICAgICAgICAgICBBTFBIQTogMC4xLFxyXG4gICAgICAgICAgICBOQU1FOiAnVW51c2VkICMyJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDAsXHJcbiAgICAgICAgICAgIEdSRUVOOiAwLFxyXG4gICAgICAgICAgICBCTFVFOiAwLFxyXG4gICAgICAgICAgICBBTFBIQTogMC4xLFxyXG4gICAgICAgICAgICBOQU1FOiAnVW51c2VkICMzJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDAsXHJcbiAgICAgICAgICAgIEdSRUVOOiAwLFxyXG4gICAgICAgICAgICBCTFVFOiAwLFxyXG4gICAgICAgICAgICBBTFBIQTogMC4xLFxyXG4gICAgICAgICAgICBOQU1FOiAnVW51c2VkICM0J1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDAsXHJcbiAgICAgICAgICAgIEdSRUVOOiAwLFxyXG4gICAgICAgICAgICBCTFVFOiAwLFxyXG4gICAgICAgICAgICBBTFBIQTogMC4xLFxyXG4gICAgICAgICAgICBOQU1FOiAnVW51c2VkICM1J1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDAsXHJcbiAgICAgICAgICAgIEdSRUVOOiAwLFxyXG4gICAgICAgICAgICBCTFVFOiAwLFxyXG4gICAgICAgICAgICBBTFBIQTogMC4xLFxyXG4gICAgICAgICAgICBOQU1FOiAnVW51c2VkICM2J1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDAsXHJcbiAgICAgICAgICAgIEdSRUVOOiAwLFxyXG4gICAgICAgICAgICBCTFVFOiAwLFxyXG4gICAgICAgICAgICBBTFBIQTogMC4xLFxyXG4gICAgICAgICAgICBOQU1FOiAnVW51c2VkICM3J1xyXG4gICAgICAgIH1cclxuICAgIF0sIFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFJFRDogODgsXHJcbiAgICAgICAgICAgIEdSRUVOOiA5OSxcclxuICAgICAgICAgICAgQkxVRTogNzcsXHJcbiAgICAgICAgICAgIEFMUEhBOiAwLjUwMTk2MDc4NDMxMzcyNTQ5MDE5NjA3ODQzMTM3MjU1LFxyXG4gICAgICAgICAgICBOQU1FOiAnUGluZSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiA2MyxcclxuICAgICAgICAgICAgR1JFRU46IDgyLFxyXG4gICAgICAgICAgICBCTFVFOiA1OCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuNDkwMTk2MDc4NDMxMzcyNTQ5MDE5NjA3ODQzMTM3MjUsXHJcbiAgICAgICAgICAgIE5BTUU6ICdCaXJjaCdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiA3NyxcclxuICAgICAgICAgICAgR1JFRU46IDk0LFxyXG4gICAgICAgICAgICBCTFVFOiA2MCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuNDA3ODQzMTM3MjU0OTAxOTYwNzg0MzEzNzI1NDkwMixcclxuICAgICAgICAgICAgTkFNRTogJ0ZpcidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiA0OCxcclxuICAgICAgICAgICAgR1JFRU46IDg3LFxyXG4gICAgICAgICAgICBCTFVFOiAyNCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMzI1NDkwMTk2MDc4NDMxMzcyNTQ5MDE5NjA3ODQzMTQsXHJcbiAgICAgICAgICAgIE5BTUU6ICdQYWxtIDEnXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFJFRDogNDIsXHJcbiAgICAgICAgICAgIEdSRUVOOiA3OCxcclxuICAgICAgICAgICAgQkxVRTogMTksXHJcbiAgICAgICAgICAgIEFMUEhBOiAwLjI1NDkwMTk2MDc4NDMxMzcyNTQ5MDE5NjA3ODQzMTM3LFxyXG4gICAgICAgICAgICBOQU1FOiAnUGFsbSAyJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBSRUQ6IDM0LFxyXG4gICAgICAgICAgICBHUkVFTjogNzMsXHJcbiAgICAgICAgICAgIEJMVUU6IDE5LFxyXG4gICAgICAgICAgICBBTFBIQTogMC4zNjQ3MDU4ODIzNTI5NDExNzY0NzA1ODgyMzUyOTQxMixcclxuICAgICAgICAgICAgTkFNRTogJ1BpbmUgQXBwbGUnXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFJFRDogODMsXHJcbiAgICAgICAgICAgIEdSRUVOOiA4NSxcclxuICAgICAgICAgICAgQkxVRTogNTgsXHJcbiAgICAgICAgICAgIEFMUEhBOiAwLjQxMTc2NDcwNTg4MjM1Mjk0MTE3NjQ3MDU4ODIzNTI5LFxyXG4gICAgICAgICAgICBOQU1FOiAnQ3lwcmVzcydcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiA3NyxcclxuICAgICAgICAgICAgR1JFRU46IDk0LFxyXG4gICAgICAgICAgICBCTFVFOiA2MCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuNDA3ODQzMTM3MjU0OTAxOTYwNzg0MzEzNzI1NDkwMixcclxuICAgICAgICAgICAgTkFNRTogJ0Nsb25lIEZpciAjMSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiA3NyxcclxuICAgICAgICAgICAgR1JFRU46IDk0LFxyXG4gICAgICAgICAgICBCTFVFOiA2MCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuNDA3ODQzMTM3MjU0OTAxOTYwNzg0MzEzNzI1NDkwMixcclxuICAgICAgICAgICAgTkFNRTogJ0Nsb25lIEZpciAjMidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjMSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjMidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjMydcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjNCdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjNSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjNidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgUkVEOiAwLFxyXG4gICAgICAgICAgICBHUkVFTjogMCxcclxuICAgICAgICAgICAgQkxVRTogMCxcclxuICAgICAgICAgICAgQUxQSEE6IDAuMSxcclxuICAgICAgICAgICAgTkFNRTogJ1VudXNlZCAjNydcclxuICAgICAgICB9XHJcbiAgICBdXHJcbl07XHJcblxyXG5leHBvcnRzLkFSRUEgPSBBUkVBO1xyXG5leHBvcnRzLkNQNDM3ID0gQ1A0Mzc7XHJcbmV4cG9ydHMuQ09MT1IgPSBDT0xPUjtcclxuZXhwb3J0cy5PQkpFQ1RfVFlQRSA9IE9CSkVDVF9UWVBFO1xyXG5leHBvcnRzLlJFU09VUkNFID0gUkVTT1VSQ0U7XHJcbmV4cG9ydHMuU0lURSA9IFNJVEU7XHJcbmV4cG9ydHMuVEVSUkFJTiA9IFRFUlJBSU47XHJcbmV4cG9ydHMuVEVYVFVSRSA9IFRFWFRVUkU7XHJcbmV4cG9ydHMuVEVYVFVSRV9JTkZPID0gVEVYVFVSRV9JTkZPO1xyXG5leHBvcnRzLlRSRUVfSU5GTyA9IFRSRUVfSU5GTztcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyksXHJcbiAgICBBUkVBID0gY29uc3RhbnRzLkFSRUEsXHJcbiAgICBPQkpFQ1RfVFlQRSA9IGNvbnN0YW50cy5PQkpFQ1RfVFlQRSxcclxuICAgIFJFU09VUkNFID0gY29uc3RhbnRzLlJFU09VUkNFLFxyXG4gICAgU0lURSA9IGNvbnN0YW50cy5TSVRFLFxyXG4gICAgVEVSUkFJTiA9IGNvbnN0YW50cy5URVJSQUlOLFxyXG4gICAgVEVYVFVSRSA9IGNvbnN0YW50cy5URVhUVVJFLFxyXG4gICAgVEVYVFVSRV9JTkZPID0gY29uc3RhbnRzLlRFWFRVUkVfSU5GTztcclxuXHJcbi8vIGludGVybmFsIGNvbnN0YW50c1xyXG52YXIgTUFYX0VMRVZBVElPTiA9IDUsXHJcbiAgICBNQVhfSEVJR0hUID0gNjAsXHJcbiAgICAvLyBiaXRmbGFncyBmb3IgbWFya2luZyB0b3VjaCBsZXZlbFxyXG4gICAgVE9VQ0hfTUFSS0VEID0gMHgwMSxcclxuICAgIFRPVUNIX0ZST01fUklHSFQgPSAweDAyLFxyXG4gICAgVE9VQ0hfRlJPTV9MRUZUID0gMHgwNCxcclxuICAgIFRPVUNIX0ZST01fQk9UVE9NX1JJR0hUID0gMHgwOCxcclxuICAgIFRPVUNIX0ZST01fVE9QX0xFRlQgPSAweDEwLFxyXG4gICAgVE9VQ0hfRlJPTV9CT1RUT01fTEVGVCA9IDB4MjAsXHJcbiAgICBUT1VDSF9GUk9NX1RPUF9SSUdIVCA9IDB4NDAsXHJcbiAgICAvLyBjYWxjdWxhdGVBcmVhTWFwXHJcbiAgICBFWFRSRU1FX0FORF9XRVQgPSBURVhUVVJFLkVYVFJFTUUgfCBURVhUVVJFLldFVDtcclxuXHJcbnZhciBNYXAgPSBmdW5jdGlvbih3aWR0aCwgaGVpZ2h0KSB7XHJcbiAgICB2YXIgX3dpZHRoID0gTWF0aC5hYnMofn53aWR0aCkgJiAweDBGRkMsXHJcbiAgICAgICAgX2hlaWdodCA9IE1hdGguYWJzKH5+aGVpZ2h0KSAmIDB4MEZGQyxcclxuICAgICAgICBfc2l6ZSA9IF93aWR0aCAqIF9oZWlnaHQsXHJcbiAgICAgICAgLy8gc3RvcmFnZSBmb3IgcmF3IG1hcCBkYXRhXHJcbiAgICAgICAgX3Jhd01hcEJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihfc2l6ZSAqIDE0KSxcclxuICAgICAgICBfcmF3TWFwID0gbmV3IFVpbnQ4QXJyYXkoX3Jhd01hcEJ1ZmZlciksXHJcbiAgICAgICAgLy8gZmFzdCBoZWxwZXIgY2FjaGVcclxuICAgICAgICBfY2FjaGUzMmJpdCA9IG5ldyBVaW50MzJBcnJheShfc2l6ZSksXHJcbiAgICAgICAgLy8gb3RoZXIgY2FjaGVcclxuICAgICAgICBfbGFzdFRleHR1cmVJbmRleCxcclxuICAgICAgICBfbGFzdFRleHR1cmVUb3BMZWZ0LFxyXG4gICAgICAgIF9sYXN0VGV4dHVyZVRvcCxcclxuICAgICAgICBfbGFzdFRleHR1cmVUb3BSaWdodCxcclxuICAgICAgICBfbGFzdFRleHR1cmVCb3R0b21MZWZ0LFxyXG4gICAgICAgIF9sYXN0VGV4dHVyZUJvdHRvbSxcclxuICAgICAgICBfbGFzdFRleHR1cmVCb3R0b21SaWdodCxcclxuICAgICAgICAvLyBpbmRleGVzIHRvIGVhY2ggYmxvY2tcclxuICAgICAgICBfYmxvY2tIZWlnaHQgPSAwLFxyXG4gICAgICAgIF9ibG9ja1RleHR1cmVzID0gX3NpemUsXHJcbiAgICAgICAgX2Jsb2NrVGV4MSA9IF9zaXplLFxyXG4gICAgICAgIF9ibG9ja1RleDIgPSBfc2l6ZSAqIDIsXHJcbiAgICAgICAgX2Jsb2NrUm9hZCA9IF9zaXplICogMyxcclxuICAgICAgICBfYmxvY2tPYmpJZHggPSBfc2l6ZSAqIDQsXHJcbiAgICAgICAgX2Jsb2NrT2JqVHlwZSA9IF9zaXplICogNSxcclxuICAgICAgICBfYmxvY2tBbmltYWxzID0gX3NpemUgKiA2LFxyXG4gICAgICAgIF9ibG9ja0VtcHR5ID0gX3NpemUgKiA3LCAgICAvLyB1bmtub3duOyBhbHdheXMgZW1wdHkgaW4gV0xEL1NXRFxyXG4gICAgICAgIF9ibG9ja1NpdGVzID0gX3NpemUgKiA4LFxyXG4gICAgICAgIF9ibG9ja09mU2V2ZW4gPSBfc2l6ZSAqIDksICAvLyBldmVyeXRoaW5nIGlzIGFsd2F5cyA3IGluIFdMRC9TV0RcclxuICAgICAgICBfYmxvY2tUb3VjaCA9IF9zaXplICogMTAsICAgLy8gdXNlZCBoZXJlIGZvciB0ZW1wb3JhcnkgYml0ZmxhZ2dpbmcgYW5kIG1hcmtpbmcgc3R1ZmZcclxuICAgICAgICBfYmxvY2tSZXMgPSBfc2l6ZSAqIDExLFxyXG4gICAgICAgIF9ibG9ja0xpZ2h0ID0gX3NpemUgKiAxMixcclxuICAgICAgICBfYmxvY2tBcmVhID0gX3NpemUgKiAxMztcclxuXHJcbiAgICAvLyBhbHdheXMgc2V2ZW5cclxuICAgIGZvcih2YXIgaSA9IF9ibG9ja09mU2V2ZW47IGkgPCBfYmxvY2tPZlNldmVuICsgX3NpemU7IGkrKykge1xyXG4gICAgICAgIF9yYXdNYXBbaV0gPSA3O1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBjYWxjdWxhdGVBcmVhTWFwID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGksXHJcbiAgICAgICAgICAgIGluZGV4ID0gMCxcclxuICAgICAgICAgICAgYXJlYXMgPSBbXSxcclxuICAgICAgICAgICAgYml0TWFzayxcclxuICAgICAgICAgICAgY3VycmVudCxcclxuICAgICAgICAgICAgbm9kZXMsXHJcbiAgICAgICAgICAgIG1hc3MsXHJcbiAgICAgICAgICAgIHRleHR1cmVzLFxyXG4gICAgICAgICAgICB0b3RhbDtcclxuXHJcbiAgICAgICAgZm9yKGkgPSAwOyBpIDwgX3NpemU7IGkrKykge1xyXG4gICAgICAgICAgICBpZihfcmF3TWFwW19ibG9ja1RvdWNoICsgaV0gPT09IDB4MDApIHtcclxuICAgICAgICAgICAgICAgIC8vIHNlZSBpZiBpdCBpcyB3YXRlclxyXG4gICAgICAgICAgICAgICAgaWYoaW5kZXggPCAyNTAgJiYgaXNFYWNoVGV4dHVyZVNhbWUoaSwgMHgwNSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBzbyB3ZSBzdGFydCBsb29waW5nIHdhdGVyXHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tBcmVhICsgaV0gPSBpbmRleDtcclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgaV0gPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIG1hc3MgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBpbmRleCBhbmQgYml0bWFzayB3aGlsZSBhbHNvIHJlc2V0aW5nIGEgZmV3IHZhcmlhYmxlc1xyXG4gICAgICAgICAgICAgICAgICAgIF9jYWNoZTMyYml0W2N1cnJlbnQgPSB0b3RhbCA9IDBdID0gKGkgPDwgNikgfCAweDNGO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgbG9vcCBoZXJlIGlzIHVub3B0aW1hbCwgYnV0IGRvZXMgdGhlIGpvYlxyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlKGN1cnJlbnQgPD0gdG90YWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYml0bWFzayBmb3Igbm9kZXMgdG8gZm9sbG93IChzbWFsbCBvcHRpbWl6YXRpb246IGFsd2F5cyB0aHJlZSBiaXRzIGFjdGl2ZSwgb25lIGZvciBlYWNoIGRpcmVjdGlvbilcclxuICAgICAgICAgICAgICAgICAgICAgICAgYml0TWFzayA9IF9jYWNoZTMyYml0W2N1cnJlbnRdICYgMHgzRjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ2V0IHRoZSBub2RlcyBhcm91bmRcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXMgPSBnZXROb2Rlc0J5SW5kZXgoKF9jYWNoZTMyYml0W2N1cnJlbnQrK10gJiAweEZGRkZGRkMwKSA+PiA2KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgcG9pbnRzIGZvciBtYXRjaGluZyBsYW5kL3dhdGVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKChiaXRNYXNrICYgMHgwMSkgPT09IDB4MDEgJiYgX3Jhd01hcFtfYmxvY2tUb3VjaCArIG5vZGVzLmxlZnRdID09PSAweDAwICYmIGlzRWFjaFRleHR1cmVTYW1lKG5vZGVzLmxlZnQsIDB4MDUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2FjaGUzMmJpdFsrK3RvdGFsXSA9IChub2Rlcy5sZWZ0IDw8IDYpIHwgMHgyMztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrQXJlYSArIG5vZGVzLmxlZnRdID0gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgbm9kZXMubGVmdF0gPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFzcysrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKChiaXRNYXNrICYgMHgwMikgPT09IDB4MDIgJiYgX3Jhd01hcFtfYmxvY2tUb3VjaCArIG5vZGVzLnRvcExlZnRdID09PSAweDAwICYmIGlzRWFjaFRleHR1cmVTYW1lKG5vZGVzLnRvcExlZnQsIDB4MDUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2FjaGUzMmJpdFsrK3RvdGFsXSA9IChub2Rlcy50b3BMZWZ0IDw8IDYpIHwgMHgwNztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrQXJlYSArIG5vZGVzLnRvcExlZnRdID0gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgbm9kZXMudG9wTGVmdF0gPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFzcysrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKChiaXRNYXNrICYgMHgwNCkgPT09IDB4MDQgJiYgX3Jhd01hcFtfYmxvY2tUb3VjaCArIG5vZGVzLnRvcFJpZ2h0XSA9PT0gMHgwMCAmJiBpc0VhY2hUZXh0dXJlU2FtZShub2Rlcy50b3BSaWdodCwgMHgwNSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jYWNoZTMyYml0WysrdG90YWxdID0gKG5vZGVzLnRvcFJpZ2h0IDw8IDYpIHwgMHgwRTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrQXJlYSArIG5vZGVzLnRvcFJpZ2h0XSA9IGluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUb3VjaCArIG5vZGVzLnRvcFJpZ2h0XSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXNzKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoKGJpdE1hc2sgJiAweDA4KSA9PT0gMHgwOCAmJiBfcmF3TWFwW19ibG9ja1RvdWNoICsgbm9kZXMucmlnaHRdID09PSAweDAwICYmIGlzRWFjaFRleHR1cmVTYW1lKG5vZGVzLnJpZ2h0LCAweDA1KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NhY2hlMzJiaXRbKyt0b3RhbF0gPSAobm9kZXMucmlnaHQgPDwgNikgfCAweDFDO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tBcmVhICsgbm9kZXMucmlnaHRdID0gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgbm9kZXMucmlnaHRdID0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hc3MrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZigoYml0TWFzayAmIDB4MTApID09PSAweDEwICYmIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBub2Rlcy5ib3R0b21SaWdodF0gPT09IDB4MDAgJiYgaXNFYWNoVGV4dHVyZVNhbWUobm9kZXMuYm90dG9tUmlnaHQsIDB4MDUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2FjaGUzMmJpdFsrK3RvdGFsXSA9IChub2Rlcy5ib3R0b21SaWdodCA8PCA2KSB8IDB4Mzg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja0FyZWEgKyBub2Rlcy5ib3R0b21SaWdodF0gPSBpbmRleDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBub2Rlcy5ib3R0b21SaWdodF0gPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFzcysrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKChiaXRNYXNrICYgMHgyMCkgPT09IDB4MjAgJiYgX3Jhd01hcFtfYmxvY2tUb3VjaCArIG5vZGVzLmJvdHRvbUxlZnRdID09PSAweDAwICYmIGlzRWFjaFRleHR1cmVTYW1lKG5vZGVzLmJvdHRvbUxlZnQsIDB4MDUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2FjaGUzMmJpdFsrK3RvdGFsXSA9IChub2Rlcy5ib3R0b21MZWZ0IDw8IDYpIHwgMHgzMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrQXJlYSArIG5vZGVzLmJvdHRvbUxlZnRdID0gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgbm9kZXMuYm90dG9tTGVmdF0gPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFzcysrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGFyZWFzW2luZGV4XSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFzczogbWFzcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogQVJFQS5XQVRFUixcclxuICAgICAgICAgICAgICAgICAgICAgICAgeDogaSAlIF93aWR0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogfn4oKGkgLSAoaSAlIF93aWR0aCkpIC8gX3dpZHRoKVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbmV4dCBpbmRleFxyXG4gICAgICAgICAgICAgICAgICAgIGluZGV4Kys7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYoaXNFYWNoVGV4dHVyZVdpdGhBbnlPZkZsYWdzKGksIEVYVFJFTUVfQU5EX1dFVCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja0FyZWEgKyBpXSA9IEFSRUEuSU1QQVNTQUJMRTtcclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgaV0gPSAxO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmKGluZGV4IDwgMjUwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc28gd2Ugc3RhcnQgbG9vcGluZyBsYW5kXHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tBcmVhICsgaV0gPSBpbmRleDtcclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgaV0gPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIG1hc3MgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBpbmRleCBhbmQgYml0bWFzayB3aGlsZSBhbHNvIHJlc2V0aW5nIGEgZmV3IHZhcmlhYmxlc1xyXG4gICAgICAgICAgICAgICAgICAgIF9jYWNoZTMyYml0W2N1cnJlbnQgPSB0b3RhbCA9IDBdID0gKGkgPDwgNikgfCAweDNGO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgbG9vcCBoZXJlIGlzIHVub3B0aW1hbCwgYnV0IGRvZXMgdGhlIGpvYlxyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlKGN1cnJlbnQgPD0gdG90YWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYml0bWFzayBmb3Igbm9kZXMgdG8gZm9sbG93IChzbWFsbCBvcHRpbWl6YXRpb246IGFsd2F5cyB0aHJlZSBiaXRzIGFjdGl2ZSwgb25lIGZvciBlYWNoIGRpcmVjdGlvbilcclxuICAgICAgICAgICAgICAgICAgICAgICAgYml0TWFzayA9IF9jYWNoZTMyYml0W2N1cnJlbnRdICYgMHgzRjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ2V0IHRoZSBub2RlcyBhcm91bmRcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXMgPSBnZXROb2Rlc0J5SW5kZXgoKF9jYWNoZTMyYml0W2N1cnJlbnQrK10gJiAweEZGRkZGRkMwKSA+PiA2KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgcG9pbnRzIGZvciBtYXRjaGluZyBsYW5kL3dhdGVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKChiaXRNYXNrICYgMHgwMSkgPT09IDB4MDEgJiYgX3Jhd01hcFtfYmxvY2tUb3VjaCArIG5vZGVzLmxlZnRdID09PSAweDAwICYmICFpc0VhY2hUZXh0dXJlV2l0aEFueU9mRmxhZ3Mobm9kZXMubGVmdCwgRVhUUkVNRV9BTkRfV0VUKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NhY2hlMzJiaXRbKyt0b3RhbF0gPSAobm9kZXMubGVmdCA8PCA2KSB8IDB4MjM7IC8vIHRvcExlZnQsIGxlZnQsIGJvdHRvbUxlZnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrQXJlYSArIG5vZGVzLmxlZnRdID0gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgbm9kZXMubGVmdF0gPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFzcysrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKChiaXRNYXNrICYgMHgwMikgPT09IDB4MDIgJiYgX3Jhd01hcFtfYmxvY2tUb3VjaCArIG5vZGVzLnRvcExlZnRdID09PSAweDAwICYmICFpc0VhY2hUZXh0dXJlV2l0aEFueU9mRmxhZ3Mobm9kZXMudG9wTGVmdCwgRVhUUkVNRV9BTkRfV0VUKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NhY2hlMzJiaXRbKyt0b3RhbF0gPSAobm9kZXMudG9wTGVmdCA8PCA2KSB8IDB4MDc7IC8vIGxlZnQsIHRvcExlZnQsIHRvcFJpZ2h0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja0FyZWEgKyBub2Rlcy50b3BMZWZ0XSA9IGluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUb3VjaCArIG5vZGVzLnRvcExlZnRdID0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hc3MrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZigoYml0TWFzayAmIDB4MDQpID09PSAweDA0ICYmIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBub2Rlcy50b3BSaWdodF0gPT09IDB4MDAgJiYgIWlzRWFjaFRleHR1cmVXaXRoQW55T2ZGbGFncyhub2Rlcy50b3BSaWdodCwgRVhUUkVNRV9BTkRfV0VUKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NhY2hlMzJiaXRbKyt0b3RhbF0gPSAobm9kZXMudG9wUmlnaHQgPDwgNikgfCAweDBFOyAvLyB0b3BMZWZ0LCB0b3BSaWdodCwgcmlnaHRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrQXJlYSArIG5vZGVzLnRvcFJpZ2h0XSA9IGluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUb3VjaCArIG5vZGVzLnRvcFJpZ2h0XSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXNzKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoKGJpdE1hc2sgJiAweDA4KSA9PT0gMHgwOCAmJiBfcmF3TWFwW19ibG9ja1RvdWNoICsgbm9kZXMucmlnaHRdID09PSAweDAwICYmICFpc0VhY2hUZXh0dXJlV2l0aEFueU9mRmxhZ3Mobm9kZXMucmlnaHQsIEVYVFJFTUVfQU5EX1dFVCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jYWNoZTMyYml0WysrdG90YWxdID0gKG5vZGVzLnJpZ2h0IDw8IDYpIHwgMHgxQzsgLy8gdG9wUmlnaHQsIHJpZ2h0LCBib3R0b21SaWdodFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tBcmVhICsgbm9kZXMucmlnaHRdID0gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgbm9kZXMucmlnaHRdID0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hc3MrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZigoYml0TWFzayAmIDB4MTApID09PSAweDEwICYmIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBub2Rlcy5ib3R0b21SaWdodF0gPT09IDB4MDAgJiYgIWlzRWFjaFRleHR1cmVXaXRoQW55T2ZGbGFncyhub2Rlcy5ib3R0b21SaWdodCwgRVhUUkVNRV9BTkRfV0VUKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NhY2hlMzJiaXRbKyt0b3RhbF0gPSAobm9kZXMuYm90dG9tUmlnaHQgPDwgNikgfCAweDM4OyAvLyByaWdodCwgYm90dG9tUmlnaHQsIGJvdHRvbUxlZnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrQXJlYSArIG5vZGVzLmJvdHRvbVJpZ2h0XSA9IGluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUb3VjaCArIG5vZGVzLmJvdHRvbVJpZ2h0XSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXNzKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoKGJpdE1hc2sgJiAweDIwKSA9PT0gMHgyMCAmJiBfcmF3TWFwW19ibG9ja1RvdWNoICsgbm9kZXMuYm90dG9tTGVmdF0gPT09IDB4MDAgJiYgIWlzRWFjaFRleHR1cmVXaXRoQW55T2ZGbGFncyhub2Rlcy5ib3R0b21MZWZ0LCBFWFRSRU1FX0FORF9XRVQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2FjaGUzMmJpdFsrK3RvdGFsXSA9IChub2Rlcy5ib3R0b21MZWZ0IDw8IDYpIHwgMHgzMTsgLy8gYm90dG9tUmlnaHQsIGJvdHRvbUxlZnQsIGxlZnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrQXJlYSArIG5vZGVzLmJvdHRvbUxlZnRdID0gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgbm9kZXMuYm90dG9tTGVmdF0gPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFzcysrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGFyZWFzW2luZGV4XSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFzczogbWFzcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogQVJFQS5MQU5ELFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiBpICUgX3dpZHRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiB+figoaSAtIChpICUgX3dpZHRoKSkgLyBfd2lkdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBuZXh0IGluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgaW5kZXgrKztcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXJlYXNbaW5kZXhdID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXNzOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBBUkVBLlVOVVNFRCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeDogaSAlIF93aWR0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogfn4oKGkgLSAoaSAlIF93aWR0aCkpIC8gX3dpZHRoKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyBuZXh0IGluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgaW5kZXgrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gIGNsZWFudXBcclxuICAgICAgICBmb3IoaSA9IDA7IGkgPCBfc2l6ZTsgaSsrKSB7XHJcbiAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBpXSA9IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gYXJlYXM7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBjYWxjdWxhdGVMaWdodE1hcCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBhcm91bmQsXHJcbiAgICAgICAgICAgIGFyb3VuZExlZnQsXHJcbiAgICAgICAgICAgIGksXHJcbiAgICAgICAgICAgIGosXHJcbiAgICAgICAgICAgIGs7XHJcblxyXG4gICAgICAgIGZvcihpID0gMDsgaSA8IF9zaXplOyBpKyspIHtcclxuICAgICAgICAgICAgaiA9IDY0O1xyXG4gICAgICAgICAgICBrID0gX3Jhd01hcFtfYmxvY2tIZWlnaHQgKyBpXTtcclxuICAgICAgICAgICAgYXJvdW5kID0gZ2V0Tm9kZXNCeUluZGV4KGkpO1xyXG4gICAgICAgICAgICBhcm91bmRMZWZ0ID0gZ2V0Tm9kZXNCeUluZGV4KGFyb3VuZC5sZWZ0KTtcclxuICAgICAgICAgICAgaiArPSA5ICogKF9yYXdNYXBbX2Jsb2NrSGVpZ2h0ICsgYXJvdW5kLnRvcFJpZ2h0XSAtIGspO1xyXG4gICAgICAgICAgICBqIC09IDYgKiAoX3Jhd01hcFtfYmxvY2tIZWlnaHQgKyBhcm91bmQubGVmdF0gLSBrKTtcclxuICAgICAgICAgICAgaiAtPSAzICogKF9yYXdNYXBbX2Jsb2NrSGVpZ2h0ICsgYXJvdW5kTGVmdC5sZWZ0XSAtIGspO1xyXG4gICAgICAgICAgICBqIC09IDkgKiAoX3Jhd01hcFtfYmxvY2tIZWlnaHQgKyBhcm91bmRMZWZ0LmJvdHRvbUxlZnRdIC0gayk7XHJcbiAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrTGlnaHQgKyBpXSA9IE1hdGgubWF4KE1hdGgubWluKDEyOCwgaiksIDApO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdmFyIGNhbGN1bGF0ZVNpdGVNYXAgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgaSxcclxuICAgICAgICAgICAgbWluZXMgPSAwLFxyXG4gICAgICAgICAgICBub2RlID0gMCxcclxuICAgICAgICAgICAgbm9kZXMsXHJcbiAgICAgICAgICAgIHJhZGl1c05vZGVzLFxyXG4gICAgICAgICAgICB0ZXgxLFxyXG4gICAgICAgICAgICB0ZXgyLFxyXG4gICAgICAgICAgICB0ZXgzLFxyXG4gICAgICAgICAgICB0ZXg0LFxyXG4gICAgICAgICAgICB0ZXg1LFxyXG4gICAgICAgICAgICB0ZXg2LFxyXG4gICAgICAgICAgICB0ZXg3LFxyXG4gICAgICAgICAgICB0ZXg4LFxyXG4gICAgICAgICAgICB0ZXg5LFxyXG4gICAgICAgICAgICB0ZXhBLFxyXG4gICAgICAgICAgICB0ZXhOb2RlcyxcclxuICAgICAgICAgICAgd2F0ZXJzID0gMDtcclxuXHJcbiAgICAgICAgLy8gbmVlZHMgZnVydGhlciBpbnZlc3RpZ2F0aW9uIHRvIHRoZSBydWxlcyBvZiBvcmlnaW5hbCBnYW1lOyA5OS45JSBjb3JyZWN0IGZvciBnZW5lcmF0ZWQgbWFwcywgYnV0IGxhY2tzIGluZm9ybWF0aW9uIG9mIGluZ2FtZSBvYmplY3RzLi4uXHJcbiAgICAgICAgZm9yKGkgPSAwOyBpIDwgX3NpemU7IGkrKykge1xyXG4gICAgICAgICAgICAvLyBjYWNoZSBuZWFyYnkgbm9kZXNcclxuICAgICAgICAgICAgbm9kZXMgPSBnZXROb2Rlc0J5SW5kZXgoaSk7XHJcbiAgICAgICAgICAgIC8vIGNhY2hlIHRleHR1cmUgaW5mb3JtYXRpb25cclxuICAgICAgICAgICAgdGV4Tm9kZXMgPSBnZXRUZXh0dXJlTm9kZXNCeUluZGV4KGkpO1xyXG4gICAgICAgICAgICB0ZXgxID0gX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIHRleE5vZGVzLnRvcExlZnRdICYgVEVYVFVSRS5UT19JRF9WQUxVRTtcclxuICAgICAgICAgICAgdGV4MiA9IF9yYXdNYXBbX2Jsb2NrVGV4dHVyZXMgKyB0ZXhOb2Rlcy50b3BdICYgVEVYVFVSRS5UT19JRF9WQUxVRTtcclxuICAgICAgICAgICAgdGV4MyA9IF9yYXdNYXBbX2Jsb2NrVGV4dHVyZXMgKyB0ZXhOb2Rlcy50b3BSaWdodF0gJiBURVhUVVJFLlRPX0lEX1ZBTFVFO1xyXG4gICAgICAgICAgICB0ZXg0ID0gX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIHRleE5vZGVzLmJvdHRvbUxlZnRdICYgVEVYVFVSRS5UT19JRF9WQUxVRTtcclxuICAgICAgICAgICAgdGV4NSA9IF9yYXdNYXBbX2Jsb2NrVGV4dHVyZXMgKyB0ZXhOb2Rlcy5ib3R0b21dICYgVEVYVFVSRS5UT19JRF9WQUxVRTtcclxuICAgICAgICAgICAgdGV4NiA9IF9yYXdNYXBbX2Jsb2NrVGV4dHVyZXMgKyB0ZXhOb2Rlcy5ib3R0b21SaWdodF0gJiBURVhUVVJFLlRPX0lEX1ZBTFVFO1xyXG4gICAgICAgICAgICB0ZXhOb2RlcyA9IGdldFRleHR1cmVOb2Rlc0J5SW5kZXgobm9kZXMuYm90dG9tUmlnaHQpO1xyXG4gICAgICAgICAgICB0ZXg3ID0gX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIHRleE5vZGVzLnRvcFJpZ2h0XSAmIFRFWFRVUkUuVE9fSURfVkFMVUU7XHJcbiAgICAgICAgICAgIHRleDggPSBfcmF3TWFwW19ibG9ja1RleHR1cmVzICsgdGV4Tm9kZXMuYm90dG9tTGVmdF0gJiBURVhUVVJFLlRPX0lEX1ZBTFVFO1xyXG4gICAgICAgICAgICB0ZXg5ID0gX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIHRleE5vZGVzLmJvdHRvbV0gJiBURVhUVVJFLlRPX0lEX1ZBTFVFO1xyXG4gICAgICAgICAgICB0ZXhBID0gX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIHRleE5vZGVzLmJvdHRvbVJpZ2h0XSAmIFRFWFRVUkUuVE9fSURfVkFMVUU7XHJcblxyXG4gICAgICAgICAgICBpZiAoICgoVEVYVFVSRV9JTkZPW3RleDFdLkZMQUcgJiBURVhUVVJFLkVYVFJFTUUpID09PSBURVhUVVJFLkVYVFJFTUUpXHJcbiAgICAgICAgICAgICAgICB8fCAoKFRFWFRVUkVfSU5GT1t0ZXgyXS5GTEFHICYgVEVYVFVSRS5FWFRSRU1FKSA9PT0gVEVYVFVSRS5FWFRSRU1FKVxyXG4gICAgICAgICAgICAgICAgfHwgKChURVhUVVJFX0lORk9bdGV4M10uRkxBRyAmIFRFWFRVUkUuRVhUUkVNRSkgPT09IFRFWFRVUkUuRVhUUkVNRSlcclxuICAgICAgICAgICAgICAgIHx8ICgoVEVYVFVSRV9JTkZPW3RleDRdLkZMQUcgJiBURVhUVVJFLkVYVFJFTUUpID09PSBURVhUVVJFLkVYVFJFTUUpXHJcbiAgICAgICAgICAgICAgICB8fCAoKFRFWFRVUkVfSU5GT1t0ZXg1XS5GTEFHICYgVEVYVFVSRS5FWFRSRU1FKSA9PT0gVEVYVFVSRS5FWFRSRU1FKVxyXG4gICAgICAgICAgICAgICAgfHwgKChURVhUVVJFX0lORk9bdGV4Nl0uRkxBRyAmIFRFWFRVUkUuRVhUUkVNRSkgPT09IFRFWFRVUkUuRVhUUkVNRSlcclxuICAgICAgICAgICAgICAgIC8vIHdhdGVyIG9yIHN3YW1wXHJcbiAgICAgICAgICAgICAgICB8fCA2ID09PSAod2F0ZXJzID0gKChURVhUVVJFX0lORk9bdGV4MV0uRkxBRyAmIFRFWFRVUkUuV0VUKSA9PT0gVEVYVFVSRS5XRVQpXHJcbiAgICAgICAgICAgICAgICArICgoVEVYVFVSRV9JTkZPW3RleDJdLkZMQUcgJiBURVhUVVJFLldFVCkgPT09IFRFWFRVUkUuV0VUKVxyXG4gICAgICAgICAgICAgICAgKyAoKFRFWFRVUkVfSU5GT1t0ZXgzXS5GTEFHICYgVEVYVFVSRS5XRVQpID09PSBURVhUVVJFLldFVClcclxuICAgICAgICAgICAgICAgICsgKChURVhUVVJFX0lORk9bdGV4NF0uRkxBRyAmIFRFWFRVUkUuV0VUKSA9PT0gVEVYVFVSRS5XRVQpXHJcbiAgICAgICAgICAgICAgICArICgoVEVYVFVSRV9JTkZPW3RleDVdLkZMQUcgJiBURVhUVVJFLldFVCkgPT09IFRFWFRVUkUuV0VUKVxyXG4gICAgICAgICAgICAgICAgKyAoKFRFWFRVUkVfSU5GT1t0ZXg2XS5GTEFHICYgVEVYVFVSRS5XRVQpID09PSBURVhUVVJFLldFVCkgKVxyXG4gICAgICAgICAgICAgICAgLy8gZ3Jhbml0ZVxyXG4gICAgICAgICAgICAgICAgfHwgKChfcmF3TWFwW19ibG9ja09ialR5cGUgKyBpXSAmIE9CSkVDVF9UWVBFLk1BVENIKSA9PT0gT0JKRUNUX1RZUEUuR1JBTklURSlcclxuICAgICAgICAgICAgKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tTaXRlcyArIGldID0gU0lURS5JTVBBU1NBQkxFO1xyXG5cclxuICAgICAgICAgICAgfSBlbHNlIGlmICggKF9yYXdNYXBbX2Jsb2NrT2JqVHlwZSArIGldICYgT0JKRUNUX1RZUEUuTUFUQ0gpID09PSBPQkpFQ1RfVFlQRS5UUkVFICkge1xyXG5cclxuICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrU2l0ZXMgKyBpXSA9IFNJVEUuVFJFRTtcclxuXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICAgICAgICAvLyB3YXRlciBuZWFyYnk/XHJcbiAgICAgICAgICAgICAgICB3YXRlcnMgPiAwXHJcbiAgICAgICAgICAgICAgICAvLyBncmFuaXRlIG5lYXJieT9cclxuICAgICAgICAgICAgICAgIHx8IChfcmF3TWFwW19ibG9ja09ialR5cGUgKyBub2Rlcy5sZWZ0XSAmIE9CSkVDVF9UWVBFLk1BVENIKSA9PT0gT0JKRUNUX1RZUEUuR1JBTklURVxyXG4gICAgICAgICAgICAgICAgfHwgKF9yYXdNYXBbX2Jsb2NrT2JqVHlwZSArIG5vZGVzLnJpZ2h0XSAmIE9CSkVDVF9UWVBFLk1BVENIKSA9PT0gT0JKRUNUX1RZUEUuR1JBTklURVxyXG4gICAgICAgICAgICAgICAgfHwgKF9yYXdNYXBbX2Jsb2NrT2JqVHlwZSArIG5vZGVzLnRvcExlZnRdICYgT0JKRUNUX1RZUEUuTUFUQ0gpID09PSBPQkpFQ1RfVFlQRS5HUkFOSVRFXHJcbiAgICAgICAgICAgICAgICB8fCAoX3Jhd01hcFtfYmxvY2tPYmpUeXBlICsgbm9kZXMudG9wUmlnaHRdICYgT0JKRUNUX1RZUEUuTUFUQ0gpID09PSBPQkpFQ1RfVFlQRS5HUkFOSVRFXHJcbiAgICAgICAgICAgICAgICB8fCAoX3Jhd01hcFtfYmxvY2tPYmpUeXBlICsgbm9kZXMuYm90dG9tTGVmdF0gJiBPQkpFQ1RfVFlQRS5NQVRDSCkgPT09IE9CSkVDVF9UWVBFLkdSQU5JVEVcclxuICAgICAgICAgICAgICAgIHx8IChfcmF3TWFwW19ibG9ja09ialR5cGUgKyBub2Rlcy5ib3R0b21SaWdodF0gJiBPQkpFQ1RfVFlQRS5NQVRDSCkgPT09IE9CSkVDVF9UWVBFLkdSQU5JVEVcclxuICAgICAgICAgICAgICAgIC8vIGFueSB0ZXh0dXJlIHRoYXQgZm9yY2VzIGZsYWdzXHJcbiAgICAgICAgICAgICAgICB8fCAoKFRFWFRVUkVfSU5GT1t0ZXgxXS5GTEFHICYgVEVYVFVSRS5BUklEKSA9PT0gVEVYVFVSRS5BUklEKVxyXG4gICAgICAgICAgICAgICAgfHwgKChURVhUVVJFX0lORk9bdGV4Ml0uRkxBRyAmIFRFWFRVUkUuQVJJRCkgPT09IFRFWFRVUkUuQVJJRClcclxuICAgICAgICAgICAgICAgIHx8ICgoVEVYVFVSRV9JTkZPW3RleDNdLkZMQUcgJiBURVhUVVJFLkFSSUQpID09PSBURVhUVVJFLkFSSUQpXHJcbiAgICAgICAgICAgICAgICB8fCAoKFRFWFRVUkVfSU5GT1t0ZXg0XS5GTEFHICYgVEVYVFVSRS5BUklEKSA9PT0gVEVYVFVSRS5BUklEKVxyXG4gICAgICAgICAgICAgICAgfHwgKChURVhUVVJFX0lORk9bdGV4NV0uRkxBRyAmIFRFWFRVUkUuQVJJRCkgPT09IFRFWFRVUkUuQVJJRClcclxuICAgICAgICAgICAgICAgIHx8ICgoVEVYVFVSRV9JTkZPW3RleDZdLkZMQUcgJiBURVhUVVJFLkFSSUQpID09PSBURVhUVVJFLkFSSUQpXHJcbiAgICAgICAgICAgICkge1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHBvaW50IG5leHQgdG8gYSBzd2FtcCwgd2F0ZXIgKG91dGRhdGVkIGNvbW1lbnQ/IFwib3IgdGhlcmUgaXMgYSB0cmVlIGluIGJvdHRvbSByaWdodCBwb2ludCFcIilcclxuICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrU2l0ZXMgKyBpXSA9IFNJVEUuRkxBR19PQ0NVUElFRDtcclxuXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIDYgPT09IChtaW5lcyA9ICgoVEVYVFVSRV9JTkZPW3RleDFdLkZMQUcgJiBURVhUVVJFLlJPQ0spID09PSBURVhUVVJFLlJPQ0spXHJcbiAgICAgICAgICAgICAgICArICgoVEVYVFVSRV9JTkZPW3RleDJdLkZMQUcgJiBURVhUVVJFLlJPQ0spID09PSBURVhUVVJFLlJPQ0spXHJcbiAgICAgICAgICAgICAgICArICgoVEVYVFVSRV9JTkZPW3RleDNdLkZMQUcgJiBURVhUVVJFLlJPQ0spID09PSBURVhUVVJFLlJPQ0spXHJcbiAgICAgICAgICAgICAgICArICgoVEVYVFVSRV9JTkZPW3RleDRdLkZMQUcgJiBURVhUVVJFLlJPQ0spID09PSBURVhUVVJFLlJPQ0spXHJcbiAgICAgICAgICAgICAgICArICgoVEVYVFVSRV9JTkZPW3RleDVdLkZMQUcgJiBURVhUVVJFLlJPQ0spID09PSBURVhUVVJFLlJPQ0spXHJcbiAgICAgICAgICAgICAgICArICgoVEVYVFVSRV9JTkZPW3RleDZdLkZMQUcgJiBURVhUVVJFLlJPQ0spID09PSBURVhUVVJFLlJPQ0spIClcclxuICAgICAgICAgICAgICAgIC8vIGJ1dCBzb21lIGhlaWdodCBydWxlcyBhcHBseSB0byBtaW5lcyBhcyB3ZWxsXHJcbiAgICAgICAgICAgICAgICAmJiAoX3Jhd01hcFtpXSAtIF9yYXdNYXBbbm9kZXMuYm90dG9tUmlnaHRdKSA+PSAtM1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIGlmICggKChURVhUVVJFX0lORk9bdGV4N10uRkxBRyAmIFRFWFRVUkUuRVhUUkVNRSkgPT09IFRFWFRVUkUuRVhUUkVNRSlcclxuICAgICAgICAgICAgICAgICAgICB8fCAoKFRFWFRVUkVfSU5GT1t0ZXg4XS5GTEFHICYgVEVYVFVSRS5FWFRSRU1FKSA9PT0gVEVYVFVSRS5FWFRSRU1FKVxyXG4gICAgICAgICAgICAgICAgICAgIHx8ICgoVEVYVFVSRV9JTkZPW3RleDldLkZMQUcgJiBURVhUVVJFLkVYVFJFTUUpID09PSBURVhUVVJFLkVYVFJFTUUpXHJcbiAgICAgICAgICAgICAgICAgICAgfHwgKChURVhUVVJFX0lORk9bdGV4QV0uRkxBRyAmIFRFWFRVUkUuRVhUUkVNRSkgPT09IFRFWFRVUkUuRVhUUkVNRSlcclxuICAgICAgICAgICAgICAgICAgICB8fCAoKF9yYXdNYXBbX2Jsb2NrT2JqVHlwZSArIG5vZGVzLmJvdHRvbVJpZ2h0XSAmIE9CSkVDVF9UWVBFLk1BVENIKSA9PT0gT0JKRUNUX1RZUEUuVFJFRSlcclxuICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNub3cgb3IgbGF2YSB0b28gY2xvc2Ugb3IgYSB0cmVlXHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tTaXRlcyArIGldID0gU0lURS5GTEFHX09DQ1VQSUVEO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyB3b29ob28sIGEgbWluZSFcclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1NpdGVzICsgaV0gPSBTSVRFLk1JTkVfT0NDVVBJRUQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIG1pbmVzID4gMCApIHtcclxuXHJcbiAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1NpdGVzICsgaV0gPSBTSVRFLkZMQUdfT0NDVVBJRUQ7XHJcblxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKFxyXG4gICAgICAgICAgICAgICAgKChfcmF3TWFwW19ibG9ja09ialR5cGUgKyBub2Rlcy5ib3R0b21SaWdodF0gJiBPQkpFQ1RfVFlQRS5NQVRDSCkgPT09IE9CSkVDVF9UWVBFLlRSRUUpXHJcbiAgICAgICAgICAgICAgICAvLyBoZWlnaHQgZGlmZmVyZW5jZXNcclxuICAgICAgICAgICAgICAgIHx8ICgoX3Jhd01hcFtpXSAtIF9yYXdNYXBbbm9kZXMuYm90dG9tUmlnaHRdKSA+IDMpXHJcbiAgICAgICAgICAgICAgICB8fCAoKF9yYXdNYXBbbm9kZXMuYm90dG9tUmlnaHRdIC0gX3Jhd01hcFtpXSkgPiAxKVxyXG4gICAgICAgICAgICAgICAgfHwgKE1hdGguYWJzKF9yYXdNYXBbaV0gLSBfcmF3TWFwW25vZGVzLnRvcExlZnRdKSA+IDMpXHJcbiAgICAgICAgICAgICAgICB8fCAoTWF0aC5hYnMoX3Jhd01hcFtpXSAtIF9yYXdNYXBbbm9kZXMudG9wUmlnaHRdKSA+IDMpXHJcbiAgICAgICAgICAgICAgICB8fCAoTWF0aC5hYnMoX3Jhd01hcFtpXSAtIF9yYXdNYXBbbm9kZXMubGVmdF0pID4gMylcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtub2Rlcy5yaWdodF0pID4gMylcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtub2Rlcy5ib3R0b21MZWZ0XSkgPiAzKVxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIC8vIHNvIHdlIGNhbiBidWlsZCBhIHJvYWQsIGNoZWNrIGZvciBtb3VudGFpbiBtZWFkb3dcclxuICAgICAgICAgICAgICAgIGlmICh0ZXgxID09PSAweDEyIHx8IHRleDIgPT09IDB4MTIgfHwgdGV4MyA9PT0gMHgxMiB8fCB0ZXg0ID09PSAweDEyIHx8IHRleDUgPT09IDB4MTIgfHwgdGV4NiA9PT0gMHgxMikge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1NpdGVzICsgaV0gPSBTSVRFLkZMQUdfT0NDVVBJRUQ7XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tTaXRlcyArIGldID0gU0lURS5GTEFHO1xyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIGlmICggKChURVhUVVJFX0lORk9bdGV4N10uRkxBRyAmIFRFWFRVUkUuRVhUUkVNRSkgPT09IFRFWFRVUkUuRVhUUkVNRSlcclxuICAgICAgICAgICAgICAgIHx8ICgoVEVYVFVSRV9JTkZPW3RleDhdLkZMQUcgJiBURVhUVVJFLkVYVFJFTUUpID09PSBURVhUVVJFLkVYVFJFTUUpXHJcbiAgICAgICAgICAgICAgICB8fCAoKFRFWFRVUkVfSU5GT1t0ZXg5XS5GTEFHICYgVEVYVFVSRS5FWFRSRU1FKSA9PT0gVEVYVFVSRS5FWFRSRU1FKVxyXG4gICAgICAgICAgICAgICAgfHwgKChURVhUVVJFX0lORk9bdGV4QV0uRkxBRyAmIFRFWFRVUkUuRVhUUkVNRSkgPT09IFRFWFRVUkUuRVhUUkVNRSlcclxuICAgICAgICAgICAgKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tTaXRlcyArIGldID0gU0lURS5GTEFHX09DQ1VQSUVEO1xyXG5cclxuICAgICAgICAgICAgfSBlbHNlIGlmICggKChfcmF3TWFwW19ibG9ja09ialR5cGUgKyBub2Rlcy50b3BMZWZ0XSAmIE9CSkVDVF9UWVBFLk1BVENIKSA9PT0gT0JKRUNUX1RZUEUuVFJFRSlcclxuICAgICAgICAgICAgICAgIHx8ICgoX3Jhd01hcFtfYmxvY2tPYmpUeXBlICsgbm9kZXMudG9wUmlnaHRdICYgT0JKRUNUX1RZUEUuTUFUQ0gpID09PSBPQkpFQ1RfVFlQRS5UUkVFKVxyXG4gICAgICAgICAgICAgICAgfHwgKChfcmF3TWFwW19ibG9ja09ialR5cGUgKyBub2Rlcy5sZWZ0XSAmIE9CSkVDVF9UWVBFLk1BVENIKSA9PT0gT0JKRUNUX1RZUEUuVFJFRSlcclxuICAgICAgICAgICAgICAgIHx8ICgoX3Jhd01hcFtfYmxvY2tPYmpUeXBlICsgbm9kZXMucmlnaHRdICYgT0JKRUNUX1RZUEUuTUFUQ0gpID09PSBPQkpFQ1RfVFlQRS5UUkVFKVxyXG4gICAgICAgICAgICAgICAgfHwgKChfcmF3TWFwW19ibG9ja09ialR5cGUgKyBub2Rlcy5ib3R0b21MZWZ0XSAmIE9CSkVDVF9UWVBFLk1BVENIKSA9PT0gT0JKRUNUX1RZUEUuVFJFRSlcclxuICAgICAgICAgICAgICAgIC8vIG9yIGEgdG9vIGJpZyBoZWlnaHQgZGlmZmVyZW5jZSBmdXJ0aGVyIGF3YXksIHNvIGZpcnN0IGdldCBzb21lIG5vZGVzIGZvciB1cyB0byB3b3JrIHdpdGhcclxuICAgICAgICAgICAgICAgIHx8ICEocmFkaXVzTm9kZXMgPSBnZXRSYWRpdXNOb2RlcyhpICUgX3dpZHRoLCB+figoaSAtIChpICUgX3dpZHRoKSkgLyBfd2lkdGgpLCAyLCB0cnVlKSlcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtyYWRpdXNOb2Rlc1swXV0pID4gMilcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtyYWRpdXNOb2Rlc1sxXV0pID4gMilcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtyYWRpdXNOb2Rlc1syXV0pID4gMilcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtyYWRpdXNOb2Rlc1szXV0pID4gMilcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtyYWRpdXNOb2Rlc1s0XV0pID4gMilcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtyYWRpdXNOb2Rlc1s1XV0pID4gMilcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtyYWRpdXNOb2Rlc1s2XV0pID4gMilcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtyYWRpdXNOb2Rlc1s3XV0pID4gMilcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtyYWRpdXNOb2Rlc1s4XV0pID4gMilcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtyYWRpdXNOb2Rlc1s5XV0pID4gMilcclxuICAgICAgICAgICAgICAgIHx8IChNYXRoLmFicyhfcmF3TWFwW2ldIC0gX3Jhd01hcFtyYWRpdXNOb2Rlc1sxMF1dKSA+IDIpXHJcbiAgICAgICAgICAgICAgICB8fCAoTWF0aC5hYnMoX3Jhd01hcFtpXSAtIF9yYXdNYXBbcmFkaXVzTm9kZXNbMTFdXSkgPiAyKVxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIC8vIGNhbiBidWlsZCBhIGh1dCwgY2hlY2sgZm9yIG1vdW50YWluIG1lYWRvdyB0ZXh0dXJlXHJcbiAgICAgICAgICAgICAgICBpZiAodGV4MSA9PT0gMHgxMiB8fCB0ZXgyID09PSAweDEyIHx8IHRleDMgPT09IDB4MTIgfHwgdGV4NCA9PT0gMHgxMiB8fCB0ZXg1ID09PSAweDEyIHx8IHRleDYgPT09IDB4MTIpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tTaXRlcyArIGldID0gU0lURS5IVVRfT0NDVVBJRUQ7XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tTaXRlcyArIGldID0gU0lURS5IVVQ7XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gY2FuIGJ1aWxkIGEgY2FzdGxlLCBjaGVjayBmb3IgbW91bnRhaW4gbWVhZG93IHRleHR1cmVcclxuICAgICAgICAgICAgICAgIGlmICh0ZXgxID09PSAweDEyIHx8IHRleDIgPT09IDB4MTIgfHwgdGV4MyA9PT0gMHgxMiB8fCB0ZXg0ID09PSAweDEyIHx8IHRleDUgPT09IDB4MTIgfHwgdGV4NiA9PT0gMHgxMikge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1NpdGVzICsgaV0gPSBTSVRFLkNBU1RMRV9PQ0NVUElFRDtcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1NpdGVzICsgaV0gPSBTSVRFLkNBU1RMRTtcclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFRPRE86IHJlcGxhY2UgbWFyayBhcnJheSB3aXRoIF9jYWNoZTMyYml0IHRvIGltcHJvdmUgcGVyZm9ybWFuY2VcclxuICAgIHZhciBjaGFuZ2VIZWlnaHQgPSBmdW5jdGlvbih4LCB5LCByYWRpdXMsIHN0cmVuZ3RoKSB7XHJcbiAgICAgICAgdmFyIG5ld0hlaWdodCxcclxuICAgICAgICAgICAgbm9kZXMsXHJcbiAgICAgICAgICAgIGRpZmYsXHJcbiAgICAgICAgICAgIG1heERpZmYsXHJcbiAgICAgICAgICAgIGksXHJcbiAgICAgICAgICAgIGosXHJcbiAgICAgICAgICAgIGssXHJcbiAgICAgICAgICAgIGluZGV4LFxyXG4gICAgICAgICAgICBhcm91bmQsXHJcbiAgICAgICAgICAgIG1hcmsgPSBbXSxcclxuICAgICAgICAgICAgbWFya2VkO1xyXG4gICAgICAgIC8vIHNhbml0aXplXHJcbiAgICAgICAgc3RyZW5ndGggPSB+fnN0cmVuZ3RoO1xyXG4gICAgICAgIHJhZGl1cyA9IE1hdGguYWJzKH5+cmFkaXVzKTtcclxuICAgICAgICAvLyBvcHRpbWl6ZSBmb3Igc3BlZWQgYnkgcmVkdWNpbmcgdW5uZWNlc3NhcnkgcHJvY2Vzc2luZyByZWxhdGVkIHRvIGJlaW5nIHBvc2l0aXZlIG9yIG5lZ2F0aXZlXHJcbiAgICAgICAgaWYoc3RyZW5ndGggPCAwKSB7XHJcbiAgICAgICAgICAgIGlmKHN0cmVuZ3RoIDwgLU1BWF9FTEVWQVRJT04pIHN0cmVuZ3RoID0gLU1BWF9FTEVWQVRJT047XHJcbiAgICAgICAgICAgIG5vZGVzID0gZ2V0UmFkaXVzTm9kZXMoeCwgeSwgcmFkaXVzKTtcclxuICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGluZGV4ID0gbm9kZXNbaV07XHJcbiAgICAgICAgICAgICAgICBuZXdIZWlnaHQgPSBfcmF3TWFwW2luZGV4XSArIHN0cmVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgaWYobmV3SGVpZ2h0IDwgMCkgbmV3SGVpZ2h0ID0gMDtcclxuICAgICAgICAgICAgICAgIC8vIGFueSBjaGFuZ2U/XHJcbiAgICAgICAgICAgICAgICBpZihfcmF3TWFwW2luZGV4XSAhPT0gbmV3SGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtpbmRleF0gPSBuZXdIZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZ2V0IG5vZGVzIGFyb3VuZCB0aGUgY3VycmVudCBpbmRleFxyXG4gICAgICAgICAgICAgICAgICAgIGFyb3VuZCA9IGdldE5vZGVzQnlJbmRleChpbmRleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc3RvcmUgaW4gYW4gYXJyYXkgdGhhdCB3ZSB1c2UgdG8gY2xlYW4gdXAgdGhlIF9ibG9ja1RvdWNoXHJcbiAgICAgICAgICAgICAgICAgICAgaWYoX3Jhd01hcFtfYmxvY2tUb3VjaCArIGluZGV4XSA9PT0gMCkgbWFyay5wdXNoKGluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICBpZihfcmF3TWFwW19ibG9ja1RvdWNoICsgYXJvdW5kLmxlZnRdID09PSAwKSBtYXJrLnB1c2goYXJvdW5kLmxlZnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQucmlnaHRdID09PSAwKSBtYXJrLnB1c2goYXJvdW5kLnJpZ2h0KTtcclxuICAgICAgICAgICAgICAgICAgICBpZihfcmF3TWFwW19ibG9ja1RvdWNoICsgYXJvdW5kLnRvcExlZnRdID09PSAwKSBtYXJrLnB1c2goYXJvdW5kLnRvcExlZnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQudG9wUmlnaHRdID09PSAwKSBtYXJrLnB1c2goYXJvdW5kLnRvcFJpZ2h0KTtcclxuICAgICAgICAgICAgICAgICAgICBpZihfcmF3TWFwW19ibG9ja1RvdWNoICsgYXJvdW5kLmJvdHRvbUxlZnRdID09PSAwKSBtYXJrLnB1c2goYXJvdW5kLmJvdHRvbUxlZnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQuYm90dG9tUmlnaHRdID09PSAwKSBtYXJrLnB1c2goYXJvdW5kLmJvdHRvbVJpZ2h0KTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBtYXJrIHRoZSBsZXZlbCBvZiB0b3VjaCBzbyB3ZSBrbm93IGhvdyB0byBhdm9pZCBkb2luZyB1bm5lY2Vzc2FyeSB3b3JrXHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUb3VjaCArIGluZGV4XSB8PSBUT1VDSF9NQVJLRUQ7XHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUb3VjaCArIGFyb3VuZC5sZWZ0XSB8PSBUT1VDSF9GUk9NX1JJR0hUO1xyXG4gICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQucmlnaHRdIHw9IFRPVUNIX0ZST01fTEVGVDtcclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgYXJvdW5kLnRvcExlZnRdIHw9IFRPVUNIX0ZST01fQk9UVE9NX1JJR0hUO1xyXG4gICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQuYm90dG9tUmlnaHRdIHw9IFRPVUNIX0ZST01fVE9QX0xFRlQ7XHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUb3VjaCArIGFyb3VuZC50b3BSaWdodF0gfD0gVE9VQ0hfRlJPTV9CT1RUT01fTEVGVDtcclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgYXJvdW5kLmJvdHRvbUxlZnRdIHw9IFRPVUNIX0ZST01fVE9QX1JJR0hUO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG1hcmtlZCA9IG5vZGVzLmxlbmd0aDtcclxuICAgICAgICB9IGVsc2UgaWYoc3RyZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGlmKHN0cmVuZ3RoID4gTUFYX0VMRVZBVElPTikgc3RyZW5ndGggPSBNQVhfRUxFVkFUSU9OO1xyXG4gICAgICAgICAgICBub2RlcyA9IGdldFJhZGl1c05vZGVzKHgsIHksIHJhZGl1cyk7XHJcbiAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpbmRleCA9IG5vZGVzW2ldO1xyXG4gICAgICAgICAgICAgICAgbmV3SGVpZ2h0ID0gX3Jhd01hcFtpbmRleF0gKyBzdHJlbmd0aDtcclxuICAgICAgICAgICAgICAgIGlmKG5ld0hlaWdodCA+IE1BWF9IRUlHSFQpIG5ld0hlaWdodCA9IE1BWF9IRUlHSFQ7XHJcbiAgICAgICAgICAgICAgICAvLyBhbnkgY2hhbmdlP1xyXG4gICAgICAgICAgICAgICAgaWYoX3Jhd01hcFtpbmRleF0gIT09IG5ld0hlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbaW5kZXhdID0gbmV3SGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGdldCBub2RlcyBhcm91bmQgdGhlIGN1cnJlbnQgaW5kZXhcclxuICAgICAgICAgICAgICAgICAgICBhcm91bmQgPSBnZXROb2Rlc0J5SW5kZXgoaW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHN0b3JlIGluIGFuIGFycmF5IHRoYXQgd2UgdXNlIHRvIGNsZWFuIHVwIHRoZSBfYmxvY2tUb3VjaFxyXG4gICAgICAgICAgICAgICAgICAgIGlmKF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBpbmRleF0gPT09IDApIG1hcmsucHVzaChpbmRleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoX3Jhd01hcFtfYmxvY2tUb3VjaCArIGFyb3VuZC5sZWZ0XSA9PT0gMCkgbWFyay5wdXNoKGFyb3VuZC5sZWZ0KTtcclxuICAgICAgICAgICAgICAgICAgICBpZihfcmF3TWFwW19ibG9ja1RvdWNoICsgYXJvdW5kLnJpZ2h0XSA9PT0gMCkgbWFyay5wdXNoKGFyb3VuZC5yaWdodCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoX3Jhd01hcFtfYmxvY2tUb3VjaCArIGFyb3VuZC50b3BMZWZ0XSA9PT0gMCkgbWFyay5wdXNoKGFyb3VuZC50b3BMZWZ0KTtcclxuICAgICAgICAgICAgICAgICAgICBpZihfcmF3TWFwW19ibG9ja1RvdWNoICsgYXJvdW5kLnRvcFJpZ2h0XSA9PT0gMCkgbWFyay5wdXNoKGFyb3VuZC50b3BSaWdodCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoX3Jhd01hcFtfYmxvY2tUb3VjaCArIGFyb3VuZC5ib3R0b21MZWZ0XSA9PT0gMCkgbWFyay5wdXNoKGFyb3VuZC5ib3R0b21MZWZ0KTtcclxuICAgICAgICAgICAgICAgICAgICBpZihfcmF3TWFwW19ibG9ja1RvdWNoICsgYXJvdW5kLmJvdHRvbVJpZ2h0XSA9PT0gMCkgbWFyay5wdXNoKGFyb3VuZC5ib3R0b21SaWdodCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbWFyayB0aGUgbGV2ZWwgb2YgdG91Y2ggc28gd2Uga25vdyBob3cgdG8gYXZvaWQgZG9pbmcgdW5uZWNlc3Nhcnkgd29ya1xyXG4gICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBpbmRleF0gfD0gVE9VQ0hfTUFSS0VEO1xyXG4gICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQubGVmdF0gfD0gVE9VQ0hfRlJPTV9SSUdIVDtcclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgYXJvdW5kLnJpZ2h0XSB8PSBUT1VDSF9GUk9NX0xFRlQ7XHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUb3VjaCArIGFyb3VuZC50b3BMZWZ0XSB8PSBUT1VDSF9GUk9NX0JPVFRPTV9SSUdIVDtcclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgYXJvdW5kLmJvdHRvbVJpZ2h0XSB8PSBUT1VDSF9GUk9NX1RPUF9MRUZUO1xyXG4gICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQudG9wUmlnaHRdIHw9IFRPVUNIX0ZST01fQk9UVE9NX0xFRlQ7XHJcbiAgICAgICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUb3VjaCArIGFyb3VuZC5ib3R0b21MZWZ0XSB8PSBUT1VDSF9GUk9NX1RPUF9SSUdIVDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBtYXJrZWQgPSBub2Rlcy5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHdoaWxlKG1hcmsubGVuZ3RoID4gbWFya2VkKSB7XHJcbiAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IG1hcmsubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGluZGV4ID0gbWFya1tpXTtcclxuICAgICAgICAgICAgICAgIGogPSBfcmF3TWFwW19ibG9ja1RvdWNoICsgaW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgLy8gYXJlIHdlIGRvbmUgd2l0aCB0aGlzIG5vZGUgYWxyZWFkeT9cclxuICAgICAgICAgICAgICAgIGlmKChqICYgVE9VQ0hfTUFSS0VEKSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHdlIGhhdmUgcHJvY2Vzc2VkIGl0IG5vdyFcclxuICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgaW5kZXhdIHw9IFRPVUNIX01BUktFRDtcclxuICAgICAgICAgICAgICAgICAgICBtYXJrZWQrKztcclxuICAgICAgICAgICAgICAgICAgICAvLyByZXNldCBkaWZmZXJlbmNlIGluZGljYXRvclxyXG4gICAgICAgICAgICAgICAgICAgIG1heERpZmYgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNhY2hlIHRoZSBjdXJyZW50IHZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgayA9IF9yYXdNYXBbaW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGdldCB0aGUgc3Vycm91bmRpbmcgbm9kZXNcclxuICAgICAgICAgICAgICAgICAgICBhcm91bmQgPSBnZXROb2Rlc0J5SW5kZXgoaW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNlZSBpZiB3ZSBuZWVkIHRvIGFkanVzdCB0aGUgZWxldmF0aW9uIG9mIHRoaXMgbm9kZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmKGogJiBUT1VDSF9GUk9NX1JJR0hUKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpZmYgPSBrIC0gX3Jhd01hcFthcm91bmQucmlnaHRdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihNYXRoLmFicyhkaWZmKSA+IE1BWF9FTEVWQVRJT04gJiYgTWF0aC5hYnMoZGlmZikgPiBNYXRoLmFicyhtYXhEaWZmKSkgbWF4RGlmZiA9IGRpZmY7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmKGogJiBUT1VDSF9GUk9NX0xFRlQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlmZiA9IGsgLSBfcmF3TWFwW2Fyb3VuZC5sZWZ0XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoTWF0aC5hYnMoZGlmZikgPiBNQVhfRUxFVkFUSU9OICYmIE1hdGguYWJzKGRpZmYpID4gTWF0aC5hYnMobWF4RGlmZikpIG1heERpZmYgPSBkaWZmO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZihqICYgVE9VQ0hfRlJPTV9UT1BfTEVGVCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaWZmID0gayAtIF9yYXdNYXBbYXJvdW5kLnRvcExlZnRdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihNYXRoLmFicyhkaWZmKSA+IE1BWF9FTEVWQVRJT04gJiYgTWF0aC5hYnMoZGlmZikgPiBNYXRoLmFicyhtYXhEaWZmKSkgbWF4RGlmZiA9IGRpZmY7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmKGogJiBUT1VDSF9GUk9NX0JPVFRPTV9SSUdIVCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaWZmID0gayAtIF9yYXdNYXBbYXJvdW5kLmJvdHRvbVJpZ2h0XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoTWF0aC5hYnMoZGlmZikgPiBNQVhfRUxFVkFUSU9OICYmIE1hdGguYWJzKGRpZmYpID4gTWF0aC5hYnMobWF4RGlmZikpIG1heERpZmYgPSBkaWZmO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZihqICYgVE9VQ0hfRlJPTV9UT1BfUklHSFQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlmZiA9IGsgLSBfcmF3TWFwW2Fyb3VuZC50b3BSaWdodF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKE1hdGguYWJzKGRpZmYpID4gTUFYX0VMRVZBVElPTiAmJiBNYXRoLmFicyhkaWZmKSA+IE1hdGguYWJzKG1heERpZmYpKSBtYXhEaWZmID0gZGlmZjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoaiAmIFRPVUNIX0ZST01fQk9UVE9NX0xFRlQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlmZiA9IGsgLSBfcmF3TWFwW2Fyb3VuZC5ib3R0b21MZWZ0XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoTWF0aC5hYnMoZGlmZikgPiBNQVhfRUxFVkFUSU9OICYmIE1hdGguYWJzKGRpZmYpID4gTWF0aC5hYnMobWF4RGlmZikpIG1heERpZmYgPSBkaWZmO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyBva2F5LCBkbyB3ZSBoYXZlIGFueXRoaW5nIHRvIGNoYW5nZSBpbiB0aGlzIG5vZGU/XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobWF4RGlmZikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjYWxjdWxhdGUgaG93IG11Y2ggdG8gY2hhbmdlIHRoZSBoZWlnaHQgaW4gdGhpcyBub2RlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG1heERpZmYgPCAwKSBtYXhEaWZmICs9IE1BWF9FTEVWQVRJT047XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYobWF4RGlmZiA+IDApIG1heERpZmYgLT0gTUFYX0VMRVZBVElPTjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm93IHdlIGtub3cgaG93IG11Y2ggY2hhbmdlIGhhcyB0byBiZSBkb25lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0hlaWdodCA9IGsgLSBtYXhEaWZmO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBjb21tZW50ZWQgb3V0IGJlY2F1c2UgdGhlc2UgdHdvIGxpbmVzIHNob3VsZCBuZXZlciBnZXQgZXhlY3V0ZWQgYW55d2F5LCBzbyByZW1vdmUgbGF0ZXI/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vaWYobmV3SGVpZ2h0IDwgMCkgeyBuZXdIZWlnaHQgPSAwOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vZWxzZSBpZihuZXdIZWlnaHQgPiBNQVhfSEVJR0hUKSB7IG5ld0hlaWdodCA9IE1BWF9IRUlHSFQ7IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXQgaXMgYWx3YXlzIGEgZ29vZCBpZGVhIHRvIGRyYXcgeW91ciBjaGFuZ2VzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbaW5kZXhdID0gbmV3SGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXJrIHRoZSBsZXZlbCBvZiB0b3VjaCBzbyB3ZSBrbm93IGhvdyB0byBhdm9pZCBkb2luZyB1bm5lY2Vzc2FyeSB3b3JrXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKChqICYgVE9VQ0hfRlJPTV9MRUZUKSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoX3Jhd01hcFtfYmxvY2tUb3VjaCArIGFyb3VuZC5sZWZ0XSA9PT0gMCkgbWFyay5wdXNoKGFyb3VuZC5sZWZ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQubGVmdF0gfD0gVE9VQ0hfRlJPTV9SSUdIVDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZigoaiAmIFRPVUNIX0ZST01fUklHSFQpID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihfcmF3TWFwW19ibG9ja1RvdWNoICsgYXJvdW5kLnJpZ2h0XSA9PT0gMCkgbWFyay5wdXNoKGFyb3VuZC5yaWdodCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgYXJvdW5kLnJpZ2h0XSB8PSBUT1VDSF9GUk9NX0xFRlQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoKGogJiBUT1VDSF9GUk9NX1RPUF9MRUZUKSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoX3Jhd01hcFtfYmxvY2tUb3VjaCArIGFyb3VuZC50b3BMZWZ0XSA9PT0gMCkgbWFyay5wdXNoKGFyb3VuZC50b3BMZWZ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQudG9wTGVmdF0gfD0gVE9VQ0hfRlJPTV9CT1RUT01fUklHSFQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoKGogJiBUT1VDSF9GUk9NX0JPVFRPTV9SSUdIVCkgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQuYm90dG9tUmlnaHRdID09PSAwKSBtYXJrLnB1c2goYXJvdW5kLmJvdHRvbVJpZ2h0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQuYm90dG9tUmlnaHRdIHw9IFRPVUNIX0ZST01fVE9QX0xFRlQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoKGogJiBUT1VDSF9GUk9NX1RPUF9SSUdIVCkgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQudG9wUmlnaHRdID09PSAwKSBtYXJrLnB1c2goYXJvdW5kLnRvcFJpZ2h0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQudG9wUmlnaHRdIHw9IFRPVUNIX0ZST01fQk9UVE9NX0xFRlQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoKGogJiBUT1VDSF9GUk9NX0JPVFRPTV9MRUZUKSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoX3Jhd01hcFtfYmxvY2tUb3VjaCArIGFyb3VuZC5ib3R0b21MZWZ0XSA9PT0gMCkgbWFyay5wdXNoKGFyb3VuZC5ib3R0b21MZWZ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNYXBbX2Jsb2NrVG91Y2ggKyBhcm91bmQuYm90dG9tTGVmdF0gfD0gVE9VQ0hfRlJPTV9UT1BfUklHSFQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gY2xlYW4gb3VyIGNoYW5nZXMgaW4gdGhlIHRvdWNoIGJsb2NrXHJcbiAgICAgICAgZm9yKGkgPSAwOyBpIDwgbWFyay5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RvdWNoICsgbWFya1tpXV0gPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdmFyIGdldEFsbFNpdGVzT2ZUeXBlID0gZnVuY3Rpb24oc2l0ZVR5cGUsIHN0cmljdE1vZGUpIHtcclxuICAgICAgICB2YXIgaSxcclxuICAgICAgICAgICAgbWFzayA9IDB4RkYsXHJcbiAgICAgICAgICAgIHNpdGVzID0gW107XHJcblxyXG4gICAgICAgIGlmKCFzdHJpY3RNb2RlICYmIChzaXRlVHlwZSAmIDB4RjApID09PSAwKSB7XHJcbiAgICAgICAgICAgIG1hc2sgPSAweDBGO1xyXG4gICAgICAgICAgICBzaXRlVHlwZSAmPSBtYXNrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yKGkgPSAwOyBpIDwgX3NpemU7IGkrKykge1xyXG4gICAgICAgICAgICBpZigoX3Jhd01hcFtfYmxvY2tTaXRlcyArIGldICYgbWFzaykgPT09IHNpdGVUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBzaXRlcy5wdXNoKGkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gc2l0ZXM7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBnZXRCbG9jayA9IGZ1bmN0aW9uKGluZGV4KSB7XHJcbiAgICAgICAgaW5kZXggPSB+fmluZGV4O1xyXG4gICAgICAgIGlmKGluZGV4ID49IDAgJiYgaW5kZXggPD0gMTMpIHtcclxuICAgICAgICAgICAgcmV0dXJuIF9yYXdNYXAuc3ViYXJyYXkoaW5kZXggKiBfc2l6ZSwgKytpbmRleCAqIF9zaXplKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBnZXROb2Rlc0J5SW5kZXggPSBmdW5jdGlvbihpbmRleCkge1xyXG4gICAgICAgIHZhciB4ID0gaW5kZXggJSBfd2lkdGgsXHJcbiAgICAgICAgICAgIHkgPSAoaW5kZXggLSB4KSAvIF93aWR0aCxcclxuICAgICAgICAgICAgeEwgPSAoeCA+IDAgPyB4IDogX3dpZHRoKSAtIDEsXHJcbiAgICAgICAgICAgIHhSID0gKHggKyAxKSAlIF93aWR0aCxcclxuICAgICAgICAgICAgeVQgPSAoKHkgPiAwID8geSA6IF9oZWlnaHQpIC0gMSkgKiBfd2lkdGgsXHJcbiAgICAgICAgICAgIHlCID0gKCh5ICsgMSkgJSBfaGVpZ2h0KSAqIF93aWR0aCxcclxuICAgICAgICAgICAgb2RkID0gKHkgJiAxKSA9PT0gMTtcclxuXHJcbiAgICAgICAgeSAqPSBfd2lkdGg7XHJcblxyXG4gICAgICAgIGlmKG9kZCkge1xyXG4gICAgICAgICAgICAvLyBvZGRcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGxlZnQ6IHkgKyB4TCxcclxuICAgICAgICAgICAgICAgIHJpZ2h0OiB5ICsgeFIsXHJcbiAgICAgICAgICAgICAgICB0b3BMZWZ0OiB5VCArIHgsXHJcbiAgICAgICAgICAgICAgICB0b3BSaWdodDogeVQgKyB4UixcclxuICAgICAgICAgICAgICAgIGJvdHRvbUxlZnQ6IHlCICsgeCxcclxuICAgICAgICAgICAgICAgIGJvdHRvbVJpZ2h0OiB5QiArIHhSXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBldmVuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBsZWZ0OiB5ICsgeEwsXHJcbiAgICAgICAgICAgICAgICByaWdodDogeSArIHhSLFxyXG4gICAgICAgICAgICAgICAgdG9wTGVmdDogeVQgKyB4TCxcclxuICAgICAgICAgICAgICAgIHRvcFJpZ2h0OiB5VCArIHgsXHJcbiAgICAgICAgICAgICAgICBib3R0b21MZWZ0OiB5QiArIHhMLFxyXG4gICAgICAgICAgICAgICAgYm90dG9tUmlnaHQ6IHlCICsgeFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyByZXR1cm4gYXJyYXkgb2YgaW5kZXhlcyBmb3IgbmVhcmJ5IHBvaW50c1xyXG4gICAgLy8gb3V0c2V0ID0gYm9vbGVhbiwgcmV0dXJuIG9ubHkgdGhlIG91dGVybW9zdCByYWRpdXMgcG9pbnRzXHJcbiAgICB2YXIgZ2V0UmFkaXVzTm9kZXMgPSBmdW5jdGlvbih4LCB5LCByYWRpdXMsIG91dHNldCwgYnVmZmVyKSB7XHJcbiAgICAgICAgdmFyIG5vZGVzLFxyXG4gICAgICAgICAgICBpLFxyXG4gICAgICAgICAgICBqLFxyXG4gICAgICAgICAgICBrID0gMCxcclxuICAgICAgICAgICAgbCxcclxuICAgICAgICAgICAgbSxcclxuICAgICAgICAgICAgZmlyc3QgPSAwLFxyXG4gICAgICAgICAgICBsYXN0ID0gMCxcclxuICAgICAgICAgICAgcmVtb3ZlTGFzdCA9IDEgPT09ICh5ICYgMSksXHJcbiAgICAgICAgICAgIHhDYWNoZSxcclxuICAgICAgICAgICAgeUNhY2hlLFxyXG4gICAgICAgICAgICBtYXhSYWRpdXM7XHJcblxyXG4gICAgICAgIC8vIHNhbml0aXplIGlucHV0XHJcbiAgICAgICAgcmFkaXVzID0gTWF0aC5hYnMofn5yYWRpdXMpO1xyXG4gICAgICAgIG91dHNldCA9ICEhb3V0c2V0O1xyXG4gICAgICAgIC8vIHNlZSBpZiB3ZSBhZGQgdGhlIHBvaW50IGl0c2VsZiB0byByZXN1bHQgYmxvY2tzXHJcbiAgICAgICAgaWYocmFkaXVzID09PSAwKSB7XHJcbiAgICAgICAgICAgIG5vZGVzID0gbmV3IFVpbnQzMkFycmF5KGJ1ZmZlciB8fCAxKTtcclxuICAgICAgICAgICAgbm9kZXNbMF0gPSB5ICogX3dpZHRoICsgeDtcclxuICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIHJhZGl1cyBkb2VzIG5vdCBvdmVybGFwIGl0c2VsZlxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIHNvbWUgbGltaXRzIGhhdmUgdG8gYmUgaW4gcGxhY2VcclxuICAgICAgICAgICAgbWF4UmFkaXVzID0gfn4oKE1hdGgubWluKF93aWR0aCwgX2hlaWdodCkgLSAyKSAvIDIpO1xyXG4gICAgICAgICAgICBpZihyYWRpdXMgPiBtYXhSYWRpdXMpIHJhZGl1cyA9IG1heFJhZGl1cztcclxuICAgICAgICAgICAgLy8gY2FjaGUgWCBhbmQgWSB2YWx1ZXMgdG8gYXZvaWQgcmVjYWxjdWxhdGluZyBhbGwgdGhlIHRpbWVcclxuICAgICAgICAgICAgeENhY2hlID0gbmV3IFVpbnQzMkFycmF5KHJhZGl1cyAqIDIgKyAxKTtcclxuICAgICAgICAgICAgeUNhY2hlID0gbmV3IFVpbnQzMkFycmF5KHJhZGl1cyAqIDIgKyAxKTtcclxuICAgICAgICAgICAgLy8gc2VlIGlmIHdlIG5lZWQgdG8gY2FyZSBhYm91dCBib3JkZXJzXHJcbiAgICAgICAgICAgIGlmKCh4IC0gcmFkaXVzKSA+PSAwICYmICh5IC0gcmFkaXVzKSA+PSAwICYmICh4ICsgcmFkaXVzKSA8IF93aWR0aCAmJiAoeSArIHJhZGl1cykgPCBfaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICAvLyB3ZSBhcmUgbm93aGVyZSBjbG9zZVxyXG4gICAgICAgICAgICAgICAgZm9yKGogPSAwLCBpID0gLXJhZGl1czsgaSA8PSByYWRpdXM7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHhDYWNoZVtqXSA9IHggKyBpO1xyXG4gICAgICAgICAgICAgICAgICAgIHlDYWNoZVtqKytdID0geSArIGk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBoYXZlIHRvIHBsYXkgaXQgc2FmZVxyXG4gICAgICAgICAgICAgICAgZm9yKGogPSAwLCBpID0gLXJhZGl1czsgaSA8PSByYWRpdXM7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHhDYWNoZVtqXSA9IChfd2lkdGggKyB4ICsgaSkgJSBfd2lkdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgeUNhY2hlW2orK10gPSAoX2hlaWdodCArIHkgKyBpKSAlIF9oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gbGFzdCBpbmRleCBpbiBYXHJcbiAgICAgICAgICAgIGxhc3QgPSByYWRpdXMgKiAyO1xyXG4gICAgICAgICAgICAvLyBhbGwgbm9kZXMgb3Igb25seSB0aGUgZWRnZSBub2Rlcz9cclxuICAgICAgICAgICAgaWYoIW91dHNldCkge1xyXG4gICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHRoZSB0b3RhbCBzaXplIG9mIHJlc3VsdGluZyBhcnJheVxyXG4gICAgICAgICAgICAgICAgbm9kZXMgPSBuZXcgVWludDMyQXJyYXkoYnVmZmVyIHx8IDEgKyA2ICogKHJhZGl1cyAqIChyYWRpdXMgKyAxKSA+PiAxKSk7XHJcbiAgICAgICAgICAgICAgICAvLyBzdGFydCBwdXNoaW5nIG91dCB0aGUgcmVzdWx0c1xyXG4gICAgICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgeENhY2hlLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZXNbaysrXSA9IHlDYWNoZVtyYWRpdXNdICogX3dpZHRoICsgeENhY2hlW2ldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gdGhlbiBhbGwgdGhlIG90aGVyIFkgcm93c1xyXG4gICAgICAgICAgICAgICAgZm9yKGogPSAxOyBqIDw9IHJhZGl1czsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYocmVtb3ZlTGFzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0LS07XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3QrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTGFzdCA9ICFyZW1vdmVMYXN0O1xyXG4gICAgICAgICAgICAgICAgICAgIGwgPSB5Q2FjaGVbcmFkaXVzIC0gal0gKiBfd2lkdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgbSA9IHlDYWNoZVtyYWRpdXMgKyBqXSAqIF93aWR0aDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IoaSA9IGZpcnN0OyBpIDw9IGxhc3Q7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2Rlc1trKytdID0gbCArIHhDYWNoZVtpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZXNbaysrXSA9IG0gKyB4Q2FjaGVbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHRoZSB0b3RhbCBzaXplIG9mIHJlc3VsdGluZyBhcnJheVxyXG4gICAgICAgICAgICAgICAgbm9kZXMgPSBuZXcgVWludDMyQXJyYXkoYnVmZmVyIHx8IDYgKiByYWRpdXMpO1xyXG4gICAgICAgICAgICAgICAgLy8gY3VycmVudCBsaW5lIGZpcnN0IGFuZCBsYXN0XHJcbiAgICAgICAgICAgICAgICBub2Rlc1trKytdID0geUNhY2hlW3JhZGl1c10gKiBfd2lkdGggKyB4Q2FjaGVbZmlyc3RdO1xyXG4gICAgICAgICAgICAgICAgbm9kZXNbaysrXSA9IHlDYWNoZVtyYWRpdXNdICogX3dpZHRoICsgeENhY2hlW2xhc3RdO1xyXG4gICAgICAgICAgICAgICAgLy8gZmlyc3QgYW5kIGxhc3Qgb24gYWxsIGxpbmVzIGV4Y2VwdCB0aGUgdG9wbW9zdCBhbmQgYm90dG9tbW9zdCByb3dcclxuICAgICAgICAgICAgICAgIGZvcihqID0gMTsgaiA8IHJhZGl1czsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYocmVtb3ZlTGFzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0LS07XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3QrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTGFzdCA9ICFyZW1vdmVMYXN0O1xyXG4gICAgICAgICAgICAgICAgICAgIGwgPSB5Q2FjaGVbcmFkaXVzIC0gal0gKiBfd2lkdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgbSA9IHlDYWNoZVtyYWRpdXMgKyBqXSAqIF93aWR0aDtcclxuICAgICAgICAgICAgICAgICAgICBub2Rlc1trKytdID0gbCArIHhDYWNoZVtmaXJzdF07XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZXNbaysrXSA9IGwgKyB4Q2FjaGVbbGFzdF07XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZXNbaysrXSA9IG0gKyB4Q2FjaGVbZmlyc3RdO1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVzW2srK10gPSBtICsgeENhY2hlW2xhc3RdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gYWxsIG5vZGVzIGluIHRvcG1vc3QgYW5kIGJvdHRvbW1vc3Qgcm93XHJcbiAgICAgICAgICAgICAgICBpZihyZW1vdmVMYXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFzdC0tO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBmaXJzdCsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbCA9IHlDYWNoZVtyYWRpdXMgLSBqXSAqIF93aWR0aDtcclxuICAgICAgICAgICAgICAgIG0gPSB5Q2FjaGVbcmFkaXVzICsgal0gKiBfd2lkdGg7XHJcbiAgICAgICAgICAgICAgICBmb3IoaSA9IGZpcnN0OyBpIDw9IGxhc3Q7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVzW2srK10gPSBsICsgeENhY2hlW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVzW2srK10gPSBtICsgeENhY2hlW2ldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbm9kZXM7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBnZXRSYXdEYXRhID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIF9yYXdNYXA7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBnZXRUZXh0dXJlTm9kZXNCeUluZGV4ID0gZnVuY3Rpb24oaW5kZXgpIHtcclxuICAgICAgICB2YXIgeCA9IGluZGV4ICUgX3dpZHRoLFxyXG4gICAgICAgICAgICB5ID0gKGluZGV4IC0geCkgLyBfd2lkdGgsXHJcbiAgICAgICAgICAgIHhMID0gKHggPiAwID8geCA6IF93aWR0aCkgLSAxLFxyXG4gICAgICAgICAgICB4UixcclxuICAgICAgICAgICAgeVQgPSAoKHkgPiAwID8geSA6IF9oZWlnaHQpIC0gMSkgKiBfd2lkdGgsXHJcbiAgICAgICAgICAgIG9kZCA9ICh5ICYgMSkgPT09IDE7XHJcblxyXG4gICAgICAgIHkgKj0gX3dpZHRoO1xyXG5cclxuICAgICAgICBpZihvZGQpIHtcclxuICAgICAgICAgICAgLy8gb25seSBuZWVkZWQgaGVyZVxyXG4gICAgICAgICAgICB4UiA9ICh4ICsgMSkgJSBfd2lkdGhcclxuICAgICAgICAgICAgLy8gb2RkXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBib3R0b21MZWZ0OiB5ICsgeEwgKyBfc2l6ZSxcclxuICAgICAgICAgICAgICAgIGJvdHRvbTogaW5kZXgsXHJcbiAgICAgICAgICAgICAgICBib3R0b21SaWdodDogaW5kZXggKyBfc2l6ZSxcclxuICAgICAgICAgICAgICAgIHRvcExlZnQ6IHlUICsgeCxcclxuICAgICAgICAgICAgICAgIHRvcDogeVQgKyB4ICsgX3NpemUsXHJcbiAgICAgICAgICAgICAgICB0b3BSaWdodDogeVQgKyB4UlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gZXZlblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgYm90dG9tTGVmdDogeSArIHhMICsgX3NpemUsXHJcbiAgICAgICAgICAgICAgICBib3R0b206IGluZGV4LFxyXG4gICAgICAgICAgICAgICAgYm90dG9tUmlnaHQ6IGluZGV4ICsgX3NpemUsXHJcbiAgICAgICAgICAgICAgICB0b3BMZWZ0OiB5VCArIHhMLFxyXG4gICAgICAgICAgICAgICAgdG9wOiB5VCArIHhMICsgX3NpemUsXHJcbiAgICAgICAgICAgICAgICB0b3BSaWdodDogeVQgKyB4XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIHdpbGwgbm90IG1haW50YWluIGhhcmJvciBmbGFnXHJcbiAgICB2YXIgZ2V0VGV4dHVyZXNCeUluZGV4ID0gZnVuY3Rpb24oaW5kZXgpIHtcclxuICAgICAgICB2YXIgbm9kZXMgPSBnZXRUZXh0dXJlTm9kZXNCeUluZGV4KGluZGV4KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdG9wTGVmdDogX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIG5vZGVzLnRvcExlZnRdICYgVEVYVFVSRS5UT19JRF9WQUxVRSxcclxuICAgICAgICAgICAgdG9wOiBfcmF3TWFwW19ibG9ja1RleHR1cmVzICsgbm9kZXMudG9wXSAmIFRFWFRVUkUuVE9fSURfVkFMVUUsXHJcbiAgICAgICAgICAgIHRvcFJpZ2h0OiBfcmF3TWFwW19ibG9ja1RleHR1cmVzICsgbm9kZXMudG9wUmlnaHRdICYgVEVYVFVSRS5UT19JRF9WQUxVRSxcclxuICAgICAgICAgICAgYm90dG9tTGVmdDogX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIG5vZGVzLmJvdHRvbUxlZnRdICYgVEVYVFVSRS5UT19JRF9WQUxVRSxcclxuICAgICAgICAgICAgYm90dG9tOiBfcmF3TWFwW19ibG9ja1RleHR1cmVzICsgbm9kZXMuYm90dG9tXSAmIFRFWFRVUkUuVE9fSURfVkFMVUUsXHJcbiAgICAgICAgICAgIGJvdHRvbVJpZ2h0OiBfcmF3TWFwW19ibG9ja1RleHR1cmVzICsgbm9kZXMuYm90dG9tUmlnaHRdICYgVEVYVFVSRS5UT19JRF9WQUxVRVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLy8gZmxhdHMgb3V0IHRoZSBoZWlnaHQgbWFwLCBkb2Vzbid0IGRvIGFueXRoaW5nIGVsc2VcclxuICAgIHZhciBpbml0aWFsaXplSGVpZ2h0ID0gZnVuY3Rpb24oYmFzZUxldmVsKSB7XHJcbiAgICAgICAgdmFyIGk7XHJcblxyXG4gICAgICAgIGJhc2VMZXZlbCA9IH5+YmFzZUxldmVsO1xyXG5cclxuICAgICAgICBpZihiYXNlTGV2ZWwgPCAwKSBiYXNlTGV2ZWwgPSAwO1xyXG4gICAgICAgIGVsc2UgaWYoYmFzZUxldmVsID4gTUFYX0hFSUdIVCkgYmFzZUxldmVsID0gTUFYX0hFSUdIVDtcclxuXHJcbiAgICAgICAgZm9yKGkgPSAwOyBpIDwgX3NpemU7IGkrKykge1xyXG4gICAgICAgICAgICBfcmF3TWFwW19ibG9ja0hlaWdodCArIGldID0gYmFzZUxldmVsO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdmFyIGluaXRpYWxpemVUZXh0dXJlID0gZnVuY3Rpb24odGV4dHVyZSkge1xyXG4gICAgICAgIHZhciBpO1xyXG4gICAgICAgIC8vIHNhbml0aXplXHJcbiAgICAgICAgdGV4dHVyZSA9IE1hdGguYWJzKH5+dGV4dHVyZSkgJiBURVhUVVJFLlRPX0lEX1ZBTFVFO1xyXG4gICAgICAgIC8vIGlzIHRoaXMgYSBrbm93biB0ZXh0dXJlP1xyXG4gICAgICAgIGlmKFRFWFRVUkVfSU5GT1t0ZXh0dXJlXSkge1xyXG4gICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBfc2l6ZSAqIDI7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIGldID0gdGV4dHVyZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdmFyIGlzRWFjaFRleHR1cmVTYW1lID0gZnVuY3Rpb24oaW5kZXgsIHRleHR1cmUpIHtcclxuICAgICAgICB2YXIgbm9kZXMsXHJcbiAgICAgICAgICAgIHRvcExlZnQsXHJcbiAgICAgICAgICAgIHRvcCxcclxuICAgICAgICAgICAgdG9wUmlnaHQsXHJcbiAgICAgICAgICAgIGJvdHRvbUxlZnQsXHJcbiAgICAgICAgICAgIGJvdHRvbSxcclxuICAgICAgICAgICAgYm90dG9tUmlnaHQ7XHJcblxyXG4gICAgICAgIGlmKF9sYXN0VGV4dHVyZUluZGV4ID09PSBpbmRleCkge1xyXG4gICAgICAgICAgICB0b3BMZWZ0ID0gX2xhc3RUZXh0dXJlVG9wTGVmdDtcclxuICAgICAgICAgICAgdG9wID0gX2xhc3RUZXh0dXJlVG9wO1xyXG4gICAgICAgICAgICB0b3BSaWdodCA9IF9sYXN0VGV4dHVyZVRvcFJpZ2h0O1xyXG4gICAgICAgICAgICBib3R0b21MZWZ0ID0gX2xhc3RUZXh0dXJlQm90dG9tTGVmdDtcclxuICAgICAgICAgICAgYm90dG9tID0gX2xhc3RUZXh0dXJlQm90dG9tO1xyXG4gICAgICAgICAgICBib3R0b21SaWdodCA9IF9sYXN0VGV4dHVyZUJvdHRvbVJpZ2h0O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG5vZGVzID0gZ2V0VGV4dHVyZU5vZGVzQnlJbmRleChpbmRleCk7XHJcbiAgICAgICAgICAgIF9sYXN0VGV4dHVyZUluZGV4ID0gaW5kZXg7XHJcbiAgICAgICAgICAgIF9sYXN0VGV4dHVyZVRvcExlZnQgICAgID0gdG9wTGVmdCAgICAgPSBfcmF3TWFwW19ibG9ja1RleHR1cmVzICsgbm9kZXMudG9wTGVmdCAgICBdICYgVEVYVFVSRS5UT19JRF9WQUxVRTtcclxuICAgICAgICAgICAgX2xhc3RUZXh0dXJlVG9wICAgICAgICAgPSB0b3AgICAgICAgICA9IF9yYXdNYXBbX2Jsb2NrVGV4dHVyZXMgKyBub2Rlcy50b3AgICAgICAgIF0gJiBURVhUVVJFLlRPX0lEX1ZBTFVFO1xyXG4gICAgICAgICAgICBfbGFzdFRleHR1cmVUb3BSaWdodCAgICA9IHRvcFJpZ2h0ICAgID0gX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIG5vZGVzLnRvcFJpZ2h0ICAgXSAmIFRFWFRVUkUuVE9fSURfVkFMVUU7XHJcbiAgICAgICAgICAgIF9sYXN0VGV4dHVyZUJvdHRvbUxlZnQgID0gYm90dG9tTGVmdCAgPSBfcmF3TWFwW19ibG9ja1RleHR1cmVzICsgbm9kZXMuYm90dG9tTGVmdCBdICYgVEVYVFVSRS5UT19JRF9WQUxVRTtcclxuICAgICAgICAgICAgX2xhc3RUZXh0dXJlQm90dG9tICAgICAgPSBib3R0b20gICAgICA9IF9yYXdNYXBbX2Jsb2NrVGV4dHVyZXMgKyBub2Rlcy5ib3R0b20gICAgIF0gJiBURVhUVVJFLlRPX0lEX1ZBTFVFO1xyXG4gICAgICAgICAgICBfbGFzdFRleHR1cmVCb3R0b21SaWdodCA9IGJvdHRvbVJpZ2h0ID0gX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIG5vZGVzLmJvdHRvbVJpZ2h0XSAmIFRFWFRVUkUuVE9fSURfVkFMVUU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gKHRvcExlZnQgPT09IHRleHR1cmUpXHJcbiAgICAgICAgICAgICYmICh0b3AgPT09IHRleHR1cmUpXHJcbiAgICAgICAgICAgICYmICh0b3BSaWdodCA9PT0gdGV4dHVyZSlcclxuICAgICAgICAgICAgJiYgKGJvdHRvbUxlZnQgPT09IHRleHR1cmUpXHJcbiAgICAgICAgICAgICYmIChib3R0b20gPT09IHRleHR1cmUpXHJcbiAgICAgICAgICAgICYmIChib3R0b21SaWdodCA9PT0gdGV4dHVyZSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBpc0VhY2hUZXh0dXJlV2l0aEFueU9mRmxhZ3MgPSBmdW5jdGlvbihpbmRleCwgZmxhZ3MpIHtcclxuICAgICAgICB2YXIgbm9kZXMsXHJcbiAgICAgICAgICAgIHRvcExlZnQsXHJcbiAgICAgICAgICAgIHRvcCxcclxuICAgICAgICAgICAgdG9wUmlnaHQsXHJcbiAgICAgICAgICAgIGJvdHRvbUxlZnQsXHJcbiAgICAgICAgICAgIGJvdHRvbSxcclxuICAgICAgICAgICAgYm90dG9tUmlnaHQ7XHJcblxyXG4gICAgICAgIGlmKF9sYXN0VGV4dHVyZUluZGV4ID09PSBpbmRleCkge1xyXG4gICAgICAgICAgICB0b3BMZWZ0ID0gX2xhc3RUZXh0dXJlVG9wTGVmdDtcclxuICAgICAgICAgICAgdG9wID0gX2xhc3RUZXh0dXJlVG9wO1xyXG4gICAgICAgICAgICB0b3BSaWdodCA9IF9sYXN0VGV4dHVyZVRvcFJpZ2h0O1xyXG4gICAgICAgICAgICBib3R0b21MZWZ0ID0gX2xhc3RUZXh0dXJlQm90dG9tTGVmdDtcclxuICAgICAgICAgICAgYm90dG9tID0gX2xhc3RUZXh0dXJlQm90dG9tO1xyXG4gICAgICAgICAgICBib3R0b21SaWdodCA9IF9sYXN0VGV4dHVyZUJvdHRvbVJpZ2h0O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG5vZGVzID0gZ2V0VGV4dHVyZU5vZGVzQnlJbmRleChpbmRleCk7XHJcbiAgICAgICAgICAgIF9sYXN0VGV4dHVyZUluZGV4ID0gaW5kZXg7XHJcbiAgICAgICAgICAgIF9sYXN0VGV4dHVyZVRvcExlZnQgICAgID0gdG9wTGVmdCAgICAgPSBfcmF3TWFwW19ibG9ja1RleHR1cmVzICsgbm9kZXMudG9wTGVmdCAgICBdICYgVEVYVFVSRS5UT19JRF9WQUxVRTtcclxuICAgICAgICAgICAgX2xhc3RUZXh0dXJlVG9wICAgICAgICAgPSB0b3AgICAgICAgICA9IF9yYXdNYXBbX2Jsb2NrVGV4dHVyZXMgKyBub2Rlcy50b3AgICAgICAgIF0gJiBURVhUVVJFLlRPX0lEX1ZBTFVFO1xyXG4gICAgICAgICAgICBfbGFzdFRleHR1cmVUb3BSaWdodCAgICA9IHRvcFJpZ2h0ICAgID0gX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIG5vZGVzLnRvcFJpZ2h0ICAgXSAmIFRFWFRVUkUuVE9fSURfVkFMVUU7XHJcbiAgICAgICAgICAgIF9sYXN0VGV4dHVyZUJvdHRvbUxlZnQgID0gYm90dG9tTGVmdCAgPSBfcmF3TWFwW19ibG9ja1RleHR1cmVzICsgbm9kZXMuYm90dG9tTGVmdCBdICYgVEVYVFVSRS5UT19JRF9WQUxVRTtcclxuICAgICAgICAgICAgX2xhc3RUZXh0dXJlQm90dG9tICAgICAgPSBib3R0b20gICAgICA9IF9yYXdNYXBbX2Jsb2NrVGV4dHVyZXMgKyBub2Rlcy5ib3R0b20gICAgIF0gJiBURVhUVVJFLlRPX0lEX1ZBTFVFO1xyXG4gICAgICAgICAgICBfbGFzdFRleHR1cmVCb3R0b21SaWdodCA9IGJvdHRvbVJpZ2h0ID0gX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIG5vZGVzLmJvdHRvbVJpZ2h0XSAmIFRFWFRVUkUuVE9fSURfVkFMVUU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gISEoVEVYVFVSRV9JTkZPW3RvcExlZnQgICAgXS5GTEFHICYgZmxhZ3MpXHJcbiAgICAgICAgICAgICYmICEhKFRFWFRVUkVfSU5GT1t0b3AgICAgICAgIF0uRkxBRyAmIGZsYWdzKVxyXG4gICAgICAgICAgICAmJiAhIShURVhUVVJFX0lORk9bdG9wUmlnaHQgICBdLkZMQUcgJiBmbGFncylcclxuICAgICAgICAgICAgJiYgISEoVEVYVFVSRV9JTkZPW2JvdHRvbUxlZnQgXS5GTEFHICYgZmxhZ3MpXHJcbiAgICAgICAgICAgICYmICEhKFRFWFRVUkVfSU5GT1tib3R0b20gICAgIF0uRkxBRyAmIGZsYWdzKVxyXG4gICAgICAgICAgICAmJiAhIShURVhUVVJFX0lORk9bYm90dG9tUmlnaHRdLkZMQUcgJiBmbGFncyk7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBzZXRUZXh0dXJlID0gZnVuY3Rpb24oaW5kZXgsIHRleHR1cmUpIHtcclxuICAgICAgICB2YXIgbm9kZXM7XHJcbiAgICAgICAgLy8gc2FuaXRpemVcclxuICAgICAgICB0ZXh0dXJlID0gTWF0aC5hYnMofn50ZXh0dXJlKTtcclxuICAgICAgICAvLyBpcyB0aGlzIGEga25vd24gdGV4dHVyZT9cclxuICAgICAgICBpZihURVhUVVJFX0lORk9bdGV4dHVyZV0pIHtcclxuICAgICAgICAgICAgbm9kZXMgPSBnZXRUZXh0dXJlTm9kZXNCeUluZGV4KGluZGV4KTtcclxuICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIG5vZGVzLmJvdHRvbUxlZnRdID0gdGV4dHVyZTtcclxuICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIG5vZGVzLmJvdHRvbV0gPSB0ZXh0dXJlO1xyXG4gICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RleHR1cmVzICsgbm9kZXMuYm90dG9tUmlnaHRdID0gdGV4dHVyZTtcclxuICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIG5vZGVzLnRvcExlZnRdID0gdGV4dHVyZTtcclxuICAgICAgICAgICAgX3Jhd01hcFtfYmxvY2tUZXh0dXJlcyArIG5vZGVzLnRvcF0gPSB0ZXh0dXJlO1xyXG4gICAgICAgICAgICBfcmF3TWFwW19ibG9ja1RleHR1cmVzICsgbm9kZXMudG9wUmlnaHRdID0gdGV4dHVyZTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgY2FsY3VsYXRlQXJlYU1hcDogY2FsY3VsYXRlQXJlYU1hcCxcclxuICAgICAgICBjYWxjdWxhdGVMaWdodE1hcDogY2FsY3VsYXRlTGlnaHRNYXAsXHJcbiAgICAgICAgY2FsY3VsYXRlU2l0ZU1hcDogY2FsY3VsYXRlU2l0ZU1hcCxcclxuICAgICAgICBjaGFuZ2VIZWlnaHQ6IGNoYW5nZUhlaWdodCxcclxuICAgICAgICBnZXRBbGxTaXRlc09mVHlwZTogZ2V0QWxsU2l0ZXNPZlR5cGUsXHJcbiAgICAgICAgZ2V0QmxvY2s6IGdldEJsb2NrLFxyXG4gICAgICAgIGdldE5vZGVzQnlJbmRleDogZ2V0Tm9kZXNCeUluZGV4LFxyXG4gICAgICAgIGdldFJhZGl1c05vZGVzOiBnZXRSYWRpdXNOb2RlcyxcclxuICAgICAgICBnZXRSYXdEYXRhOiBnZXRSYXdEYXRhLFxyXG4gICAgICAgIGdldFRleHR1cmVOb2Rlc0J5SW5kZXg6IGdldFRleHR1cmVOb2Rlc0J5SW5kZXgsXHJcbiAgICAgICAgZ2V0VGV4dHVyZXNCeUluZGV4OiBnZXRUZXh0dXJlc0J5SW5kZXgsXHJcbiAgICAgICAgaW5pdGlhbGl6ZUhlaWdodDogaW5pdGlhbGl6ZUhlaWdodCxcclxuICAgICAgICBpbml0aWFsaXplVGV4dHVyZTogaW5pdGlhbGl6ZVRleHR1cmUsXHJcbiAgICAgICAgaXNFYWNoVGV4dHVyZVNhbWU6IGlzRWFjaFRleHR1cmVTYW1lLFxyXG4gICAgICAgIGlzRWFjaFRleHR1cmVXaXRoQW55T2ZGbGFnczogaXNFYWNoVGV4dHVyZVdpdGhBbnlPZkZsYWdzLFxyXG4gICAgICAgIHNldFRleHR1cmU6IHNldFRleHR1cmVcclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWFwOyJdfQ==
