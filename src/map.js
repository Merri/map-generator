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