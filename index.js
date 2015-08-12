/**
 * MapGenerator for processing various parts of 2D map generation (land / water separation, height map etc.)
 * @module map-generator
 */
'use strict'

const MIN_WIDTH = 2
const MIN_HEIGHT = 2
const MAX_WIDTH = 1024
const MAX_HEIGHT = 1024

const STRAIGHT = 0
const TURN_LEFT_60 = 1
const TURN_RIGHT_60 = 2
const TURN_LEFT_120 = 3
const TURN_RIGHT_120 = 4
const REVERSE = 5

const HEX_LEFT = 0
const HEX_TOP_LEFT = 1
const HEX_TOP_RIGHT = 2
const HEX_RIGHT = 3
const HEX_BOTTOM_RIGHT = 4
const HEX_BOTTOM_LEFT = 5

class MapGenerator {
    /**
     * Creates a new MapGenerator instance.
     * @param {Number} width
     * @param {Number} height
     * @param {Function} random PRNG function (value equal or larger than 0, smaller than 1)
     */
    constructor(width, height, random = Math.random) {
        width = ~~width
        height = ~~height

        if (width < MIN_WIDTH || width > MAX_WIDTH) {
            throw new Error(`Width must be in range of ${MIN_WIDTH} to ${MAX_WIDTH}`)
        }

        if (height < MIN_HEIGHT || height > MAX_HEIGHT) {
            throw new Error(`Height must be in range of ${MIN_WIDTH} to ${MAX_WIDTH}`)
        }

        if (width & 1 || height & 1) {
            throw new Error('Width and height must be even numbers')
        }

        if (typeof random !== 'function') {
            throw new Error('Third argument must be a PRNG function like Math.random')
        }

        this.random = random
        this.width = width
        this.height = height
        this.size = width * height
        this.data = new Uint8Array(this.size)
    }

    /**
     * Adds random noise based on given value for a given ratio (=percentage)
     * @param {Number} ratio Ratio to meet completion, must be larger than 0 and smaller than 0.5
     * @param {Number} value Unsigned 8-bit value to add, must not be equal to emptyValue
     * @param {Number} emptyValue Unsigned 8-bit value that represents empty location in map data
     * @returns {Array} Array of indexes where a value was set to
     */
    addValueNoise(ratio, value, emptyValue = 0) {
        value &= 0xFF
        emptyValue &= 0xFF
        ratio = Number(ratio)

        if (ratio < 0 || ratio >= 0.5) {
            throw new Error('First argument must be a ratio between 0 and 0.5')
        }

        if (value === emptyValue) {
            throw new Error('Second argument `value` and third argument `emptyValue` must not be the same')
        }

        let iterationCounter = 0
        let iterations = ~~(ratio * this.size)
        let position
        let result = []

        if (iterations === 0) {
            iterations = 1
        }

        while (result.length < iterations && iterationCounter < this.size) {
            position = ~~(this.random() * this.size)

            if (this.data[position] === emptyValue) {
                this.data[position] = value
                result.push(position)
            }
            // protection against infinite loop
            iterationCounter++
        }

        return result
    }

    /**
     * Adds random noise based on traveling on the map and plotting values until given ratio (percentage) is met
     * @param {Number} ratio Ratio to meet for completion, must be larger than 0 and smaller than 0.125
     * @param {Number} value Unsigned 8-bit value to add, must not be equal to emptyValue
     * @param {Number} emptyValue Unsigned 8-bit value that represents empty location in map data
     * @param {Number} distance Distance between plotting; must be 1, 2, 3, 4 or 5
     * @param {Object} weight Options object, props: noTurn, turnLeft60, turnRight60, turnLeft120, turnRight120, turn180
     * @returns {Array} Array of indexes where a value was set to
     */
    addHexTravelNoise(ratio, value, emptyValue = 0, distance = 1, weights = {}) {
        value &= 0xFF
        emptyValue &= 0xFF
        ratio = Number(ratio)
        distance = ~~distance

        if (ratio < 0 || ratio >= 0.125) {
            throw new Error('First argument must be a ratio between 0 and 0.125')
        }

        if (value === emptyValue) {
            throw new Error('Second argument `value` and third argument `emptyValue` must not be the same')
        }

        if (distance < 1 || distance > 5) {
            throw new Error('Fourth argument `distance` should be 1, 2, 3, 4 or 5')
        }

        if (typeof weights !== 'object') {
            throw new Error(`Fifth argument should be a weights object having integer properties:
noTurn,
turnLeft60,
turnRight60,
turnLeft120,
turnRight120,
turn180`)
        }

        let move = [
            weights.noTurn != null ? ~~weights.noTurn : 9,
            weights.turnLeft60 != null ? ~~weights.turnLeft60 : 3,
            weights.turnRight60 != null ? ~~weights.turnRight60 : 3,
            weights.turnLeft120 != null ? ~~weights.turnLeft120 : 1,
            weights.turnRight120 != null ? ~~weights.turnRight120 : 1,
            weights.turn180 != null ? ~~weights.turn180 : 0
        ]

        if (move[0] < 0 || move[1] < 0 || move[2] < 0 || move[3] < 0 || move[4] < 0 || move[5] < 0) {
            throw new Error('Weight properties cannot be negative')
        }

        let moveTotal = move[0] + move[1] + move[2] + move[3] + move[4] + move[5]

        if (moveTotal <= 0) {
            throw new Error('All weight properties cannot be zero')
        }

        // pre-calculate movement breakpoints; we can ignore last one as that is what is true after all else
        for (let i = 0; i < REVERSE; i++) {
            if (move[i] > 0) {
                move[i] /= moveTotal
            }
            if (i > 0) {
                move[i] += move[i - 1]
            }
        }

        let iterationCounter = 0
        let iterations = ~~(ratio * this.size)
        let position = ~~(this.random() * this.size)
        let direction = ~~(this.random() * 6)
        let result = []
        let moveChange
        let j

        if (iterations === 0) {
            iterations = 1
        }

        while (result.length < iterations && iterationCounter < this.size) {
            position = this.getHexIndex(position, distance, direction)
            moveChange = this.random()

            for (j = 0; j < REVERSE; j++) {
                if (moveChange <= move[j]) {
                    break
                }
            }

            switch (j) {
                case STRAIGHT:
                    break
                case TURN_LEFT_60:
                    direction = (direction + 5) % 6
                    break
                case TURN_RIGHT_60:
                    direction = (direction + 1) % 6
                    break
                case TURN_LEFT_120:
                    direction = (direction + 4) % 6
                    break
                case TURN_RIGHT_120:
                    direction = (direction + 2) % 6
                    break
                case REVERSE:
                    direction = (direction + 3) % 6
                    break
                default:
            }

            if (this.data[position] === emptyValue) {
                this.data[position] = value
                result.push(position)
            }
        }

        return result
    }

    /*
     * Helper function for traveling in a hex grid.
     * @param {Number} index Index to travel from
     * @param {Number} distance Distance to travel in given direction
     * @param {Number} direction HEX_LEFT, HEX_TOP_LEFT, HEX_TOP_RIGHT, HEX_RIGHT, HEX_BOTTOM_RIGHT, HEX_BOTTOM_LEFT
     * @returns {Number} Resulting index
     */
    getHexIndex(index, distance, direction) {
        distance = ~~distance

        if (distance < 0) {
            distance = -distance
            direction = (direction + 3) % 6
        }

        if (direction === HEX_LEFT || direction === HEX_RIGHT) {
            distance %= this.width
        }

        if (distance < 1) {
            return index
        }

        let x = index % this.width

        if (direction === HEX_LEFT) {
            if (x < distance) {
                index += this.width - distance
            } else {
                index -= distance
            }
            return index
        } else if (direction === HEX_RIGHT) {
            if (this.width <= x + distance) {
                index -= this.width - distance
            } else {
                index += distance
            }
            return index
        }

        let y = ~~(index / this.width)
        let odd = y & 1
        let even = odd ^ 1
        let xLeftDistance = (distance & 1 ? odd : 0) + (distance >> 1)
        let xRightDistance = (distance & 1 ? even : 0) + (distance >> 1)

        xLeftDistance %= this.width
        xRightDistance %= this.width

        switch (direction) {
            case HEX_TOP_LEFT:
                if (x < xLeftDistance) {
                    index -= (this.width * (distance - 1)) + xLeftDistance
                } else {
                    index -= (this.width * distance) + xLeftDistance
                }
                break
            case HEX_BOTTOM_LEFT:
                if (x < xLeftDistance) {
                    index += (this.width * (distance + 1)) - xLeftDistance
                } else {
                    index += (this.width * distance) - xLeftDistance
                }
                break
            case HEX_TOP_RIGHT:
                if (this.width <= x + xRightDistance) {
                    index -= (this.width * (distance + 1)) - xRightDistance
                } else {
                    index -= (this.width * distance) - xRightDistance
                }
                break
            case HEX_BOTTOM_RIGHT:
                if (this.width <= x + xRightDistance) {
                    index += (this.width * (distance - 1)) + xRightDistance
                } else {
                    index += (this.width * distance) + xRightDistance
                }
                break
            default:
                throw new Error(`Unknown direction: ${direction}`)
        }
        while (index < 0) {
            index += this.size
        }
        while (index >= this.size) {
            index -= this.size
        }
        return index
    }

    /*
     * Resets field to given value
     * @param {Number} value Fill with this unsigned 8-bit value
     */
    fill(value) {
        value &= 0xFF
        for (let i = 0; i < this.size; i++) {
            this.data[i] = value
        }
    }
/*
    get data() {
        return this.data
    }

    get height() {
        return this.height
    }

    get size() {
        return this.size
    }

    get width() {
        return this.width
    }
*/
}

module.exports = MapGenerator
