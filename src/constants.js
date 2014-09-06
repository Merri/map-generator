'use strict';

var AREA = {
	UNUSED: 0,
	LAND: 1,
	WATER: 2,
	IMPASSABLE: 254
};

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
	SUPPORT_S2: 0x01,	// texture is usable in The Settlers II
	SUPPORT_RTTR: 0x02,	// texture is usable in Return to the Roots
	ARABLE: 0x04,		// you can expect farm fields to grow here
	HABITABLE: 0x08,	// you can build buildings here
	ARID: 0x10,			// it's too hard to build anything here, but you can make roads
	ROCK: 0x20,			// mines be here
	WET: 0x40,			// swamp and water
	EXTREME: 0x80,		// snow and lava
	IMPASSABLE: 0xC0,	// bitflag for matching WET and EXTREME for all areas that not usable for the player

	// for actual texture ID matching
	TO_ID_VALUE: 0x3F,	// bitflag for removing two highest bits that are used for bitflags!
	HARBOR: 0x40,		// this is the other bitflag for the two highest bits
	UNKNOWN: 0x80,		// we do not know the meaning of this bitflag; only exists on one or two BlueByte maps
	DROP_SUPPORT: 0xFC	// to get rid of support flags
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

exports.AREA = AREA;
exports.OBJECT_TYPE = OBJECT_TYPE;
exports.RESOURCE = RESOURCE;
exports.SITE = SITE;
exports.TERRAIN = TERRAIN;
exports.TEXTURE = TEXTURE;
exports.TEXTURE_INFO = TEXTURE_INFO;
