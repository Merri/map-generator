'use strict'

var MapGenerator = require('../index')
var expect = require('chai').expect

describe('MapGenerator', function() {
    it('should accept width and height', function() {
        var mg = new MapGenerator(2, 2)
        expect(mg.width).to.equal(2)
        expect(mg.height).to.equal(2)
        expect(mg.size).to.equal(4)
        expect(mg.data.length).to.equal(4)
    })

    it('should throw an error if no width is given', function() {
        try {
            var mg = new MapGenerator()
        } catch(e) {
            expect(e).to.be.an('object')
        }
        expect(mg).to.be.an('undefined')
    })

    it('should throw an error if no height is given', function() {
        try {
            var mg = new MapGenerator(2)
        } catch(e) {
            expect(e).to.be.an('object')
        }
        expect(mg).to.be.an('undefined')
    })

    it('should throw an error if passing odd, zero, negative or bigger than 1024 width', function() {
        try {
            var mg1 = new MapGenerator(0, 2)
        } catch(e) {
            expect(e).to.be.an('object')
        }

        try {
            var mg2 = new MapGenerator(-1, 2)
        } catch(e) {
            expect(e).to.be.an('object')
        }

        try {
            var mg3 = new MapGenerator(3, 2)
        } catch(e) {
            expect(e).to.be.an('object')
        }

        try {
            var mg4 = new MapGenerator(1023, 2)
        } catch(e) {
            expect(e).to.be.an('object')
        }

        try {
            var mg5 = new MapGenerator(1026, 2)
        } catch(e) {
            expect(e).to.be.an('object')
        }

        expect(mg1).to.be.an('undefined')
        expect(mg2).to.be.an('undefined')
        expect(mg3).to.be.an('undefined')
        expect(mg4).to.be.an('undefined')
        expect(mg5).to.be.an('undefined')
    })

    it('should throw an error if passing odd, zero, negative or bigger than 1024 height', function() {
        try {
            var mg1 = new MapGenerator(2, 0)
        } catch(e) {
            expect(e).to.be.an('object')
        }

        try {
            var mg2 = new MapGenerator(2, -1)
        } catch(e) {
            expect(e).to.be.an('object')
        }

        try {
            var mg3 = new MapGenerator(2, 3)
        } catch(e) {
            expect(e).to.be.an('object')
        }

        try {
            var mg4 = new MapGenerator(2, 1023)
        } catch(e) {
            expect(e).to.be.an('object')
        }

        try {
            var mg5 = new MapGenerator(2, 1026)
        } catch(e) {
            expect(e).to.be.an('object')
        }

        expect(mg1).to.be.an('undefined')
        expect(mg2).to.be.an('undefined')
        expect(mg3).to.be.an('undefined')
        expect(mg4).to.be.an('undefined')
        expect(mg5).to.be.an('undefined')
    })

    it('should return correct index for each direction at distance 1', function() {
        var mg = new MapGenerator(4, 4)

        // Data in order    | Realigned
        // -----------------+-----------------
        //   00  01  02  03 | 15  12  13  14
        // 04  05  06  07   |   03  00  01  02
        //   08  09  10  11 | 07  04  05  06
        // 12  13  14  15   |   11  08  09  10

        expect(mg.getHexIndex(0, 1, 0)).to.equal(3)
        expect(mg.getHexIndex(0, 1, 1)).to.equal(12)
        expect(mg.getHexIndex(0, 1, 2)).to.equal(13)
        expect(mg.getHexIndex(0, 1, 3)).to.equal(1)
        expect(mg.getHexIndex(0, 1, 4)).to.equal(5)
        expect(mg.getHexIndex(0, 1, 5)).to.equal(4)

        expect(mg.getHexIndex(4, 1, 0)).to.equal(7)
        expect(mg.getHexIndex(4, 1, 1)).to.equal(3)
        expect(mg.getHexIndex(4, 1, 2)).to.equal(0)
        expect(mg.getHexIndex(4, 1, 3)).to.equal(5)
        expect(mg.getHexIndex(4, 1, 4)).to.equal(8)
        expect(mg.getHexIndex(4, 1, 5)).to.equal(11)

        expect(mg.getHexIndex(8, 1, 0)).to.equal(11)
        expect(mg.getHexIndex(8, 1, 1)).to.equal(4)
        expect(mg.getHexIndex(8, 1, 2)).to.equal(5)
        expect(mg.getHexIndex(8, 1, 3)).to.equal(9)
        expect(mg.getHexIndex(8, 1, 4)).to.equal(13)
        expect(mg.getHexIndex(8, 1, 5)).to.equal(12)

        expect(mg.getHexIndex(12, 1, 0)).to.equal(15)
        expect(mg.getHexIndex(12, 1, 1)).to.equal(11)
        expect(mg.getHexIndex(12, 1, 2)).to.equal(8)
        expect(mg.getHexIndex(12, 1, 3)).to.equal(13)
        expect(mg.getHexIndex(12, 1, 4)).to.equal(0)
        expect(mg.getHexIndex(12, 1, 5)).to.equal(3)

        expect(mg.getHexIndex(3, 1, 0)).to.equal(2)
        expect(mg.getHexIndex(3, 1, 1)).to.equal(15)
        expect(mg.getHexIndex(3, 1, 2)).to.equal(12)
        expect(mg.getHexIndex(3, 1, 3)).to.equal(0)
        expect(mg.getHexIndex(3, 1, 4)).to.equal(4)
        expect(mg.getHexIndex(3, 1, 5)).to.equal(7)

        expect(mg.getHexIndex(7, 1, 0)).to.equal(6)
        expect(mg.getHexIndex(7, 1, 1)).to.equal(2)
        expect(mg.getHexIndex(7, 1, 2)).to.equal(3)
        expect(mg.getHexIndex(7, 1, 3)).to.equal(4)
        expect(mg.getHexIndex(7, 1, 4)).to.equal(11)
        expect(mg.getHexIndex(7, 1, 5)).to.equal(10)

        expect(mg.getHexIndex(11, 1, 0)).to.equal(10)
        expect(mg.getHexIndex(11, 1, 1)).to.equal(7)
        expect(mg.getHexIndex(11, 1, 2)).to.equal(4)
        expect(mg.getHexIndex(11, 1, 3)).to.equal(8)
        expect(mg.getHexIndex(11, 1, 4)).to.equal(12)
        expect(mg.getHexIndex(11, 1, 5)).to.equal(15)

        expect(mg.getHexIndex(15, 1, 0)).to.equal(14)
        expect(mg.getHexIndex(15, 1, 1)).to.equal(10)
        expect(mg.getHexIndex(15, 1, 2)).to.equal(11)
        expect(mg.getHexIndex(15, 1, 3)).to.equal(12)
        expect(mg.getHexIndex(15, 1, 4)).to.equal(3)
        expect(mg.getHexIndex(15, 1, 5)).to.equal(2)
    })

    it('should return correct index for each direction at distance 2', function() {
        var mg = new MapGenerator(4, 4)

        // Data in order    | Realigned
        // -----------------+-----------------
        //   00  01  02  03 | 15  12  13  14
        // 04  05  06  07   |   03  00  01  02
        //   08  09  10  11 | 07  04  05  06
        // 12  13  14  15   |   11  08  09  10

        expect(mg.getHexIndex(0, 2, 0)).to.equal(2)
        expect(mg.getHexIndex(0, 2, 1)).to.equal(11)
        expect(mg.getHexIndex(0, 2, 2)).to.equal(9)
        expect(mg.getHexIndex(0, 2, 3)).to.equal(2)
        expect(mg.getHexIndex(0, 2, 4)).to.equal(9)
        expect(mg.getHexIndex(0, 2, 5)).to.equal(11)

        expect(mg.getHexIndex(4, 2, 0)).to.equal(6)
        expect(mg.getHexIndex(4, 2, 1)).to.equal(15)
        expect(mg.getHexIndex(4, 2, 2)).to.equal(13)
        expect(mg.getHexIndex(4, 2, 3)).to.equal(6)
        expect(mg.getHexIndex(4, 2, 4)).to.equal(13)
        expect(mg.getHexIndex(4, 2, 5)).to.equal(15)

        expect(mg.getHexIndex(8, 2, 0)).to.equal(10)
        expect(mg.getHexIndex(8, 2, 1)).to.equal(3)
        expect(mg.getHexIndex(8, 2, 2)).to.equal(1)
        expect(mg.getHexIndex(8, 2, 3)).to.equal(10)
        expect(mg.getHexIndex(8, 2, 4)).to.equal(1)
        expect(mg.getHexIndex(8, 2, 5)).to.equal(3)

        expect(mg.getHexIndex(12, 2, 0)).to.equal(14)
        expect(mg.getHexIndex(12, 2, 1)).to.equal(7)
        expect(mg.getHexIndex(12, 2, 2)).to.equal(5)
        expect(mg.getHexIndex(12, 2, 3)).to.equal(14)
        expect(mg.getHexIndex(12, 2, 4)).to.equal(5)
        expect(mg.getHexIndex(12, 2, 5)).to.equal(7)

        expect(mg.getHexIndex(3, 2, 0)).to.equal(1)
        expect(mg.getHexIndex(3, 2, 1)).to.equal(10)
        expect(mg.getHexIndex(3, 2, 2)).to.equal(8)
        expect(mg.getHexIndex(3, 2, 3)).to.equal(1)
        expect(mg.getHexIndex(3, 2, 4)).to.equal(8)
        expect(mg.getHexIndex(3, 2, 5)).to.equal(10)

        expect(mg.getHexIndex(7, 2, 0)).to.equal(5)
        expect(mg.getHexIndex(7, 2, 1)).to.equal(14)
        expect(mg.getHexIndex(7, 2, 2)).to.equal(12)
        expect(mg.getHexIndex(7, 2, 3)).to.equal(5)
        expect(mg.getHexIndex(7, 2, 4)).to.equal(12)
        expect(mg.getHexIndex(7, 2, 5)).to.equal(14)

        expect(mg.getHexIndex(11, 2, 0)).to.equal(9)
        expect(mg.getHexIndex(11, 2, 1)).to.equal(2)
        expect(mg.getHexIndex(11, 2, 2)).to.equal(0)
        expect(mg.getHexIndex(11, 2, 3)).to.equal(9)
        expect(mg.getHexIndex(11, 2, 4)).to.equal(0)
        expect(mg.getHexIndex(11, 2, 5)).to.equal(2)

        expect(mg.getHexIndex(15, 2, 0)).to.equal(13)
        expect(mg.getHexIndex(15, 2, 1)).to.equal(6)
        expect(mg.getHexIndex(15, 2, 2)).to.equal(4)
        expect(mg.getHexIndex(15, 2, 3)).to.equal(13)
        expect(mg.getHexIndex(15, 2, 4)).to.equal(4)
        expect(mg.getHexIndex(15, 2, 5)).to.equal(6)
    })

    it('should always add at least one spot of noise', function() {
        var mg = new MapGenerator(4, 4)
        var result = mg.addValueNoise(0, 255)
        expect(result.length).to.equal(1)
    })

    it('should add one spot of noise when asking for 6.25% on 4 x 4 map', function() {
        var mg = new MapGenerator(4, 4)
        var result = mg.addValueNoise(0.0625, 255)
        expect(result.length).to.equal(1)
    })

    it('should add two spots of noise when asking for 12.5% on 4 x 4 map', function() {
        var mg = new MapGenerator(4, 4)
        var result = mg.addValueNoise(0.125, 255)
        expect(result.length).to.equal(2)
    })

    it('should fill data with given value', function() {
        var mg = new MapGenerator(2, 2)
        mg.fill(123)
        expect(mg.data[0]).to.equal(123)
        expect(mg.data[1]).to.equal(123)
        expect(mg.data[2]).to.equal(123)
        expect(mg.data[3]).to.equal(123)
    })
})
