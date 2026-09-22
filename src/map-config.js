// Generated from config/maps.yaml by tools/generate-map-config.mjs. Do not edit.
export const MAP_CONFIG={
  "schemaVersion": 1,
  "maps": [
    {
      "id": "duel",
      "strategyPools": {
        "classic": {
          "spy": 3,
          "paratrooper": 2,
          "rank_up": 5,
          "scouting": 4,
          "peace_talk": 2,
          "blitzkrieg": 3
        },
        "campaign": {
          "conscription": 4,
          "meds_team": 3,
          "spy": 3,
          "isr": 3,
          "paratrooper": 2,
          "rank_up": 5,
          "scouting": 4,
          "peace_talk": 2,
          "peace_negotiation": 3,
          "revolution": 2,
          "blitzkrieg": 3,
          "international_support": 3,
          "airborne_raid": 2,
          "economic_sanctions": 2,
          "economic_espionage": 2,
          "scorched_earth": 2,
          "relocate_capital": 1
        }
      },
      "fields": [
        {
          "id": "p1_capital",
          "label": "西境指挥部",
          "type": "capital",
          "x": 16,
          "y": 74,
          "links": [
            "p1_oil",
            "center_town"
          ],
          "owner": 0,
          "capital": true
        },
        {
          "id": "p1_oil",
          "label": "西部油田",
          "type": "oil",
          "x": 34,
          "y": 44,
          "links": [
            "p1_capital",
            "center_town"
          ]
        },
        {
          "id": "center_town",
          "label": "中央城镇",
          "type": "town",
          "x": 50,
          "y": 60,
          "links": [
            "p1_capital",
            "p1_oil",
            "p2_oil",
            "p2_capital"
          ],
          "fortified": true
        },
        {
          "id": "p2_oil",
          "label": "东部油田",
          "type": "oil",
          "x": 66,
          "y": 44,
          "links": [
            "p2_capital",
            "center_town"
          ]
        },
        {
          "id": "p2_capital",
          "label": "东境指挥部",
          "type": "capital",
          "x": 84,
          "y": 74,
          "links": [
            "p2_oil",
            "center_town"
          ],
          "owner": 1,
          "capital": true
        }
      ]
    },
    {
      "id": "rift",
      "strategyPools": {
        "classic": {
          "spy": 3,
          "paratrooper": 4,
          "rank_up": 3,
          "scouting": 4,
          "peace_talk": 2,
          "blitzkrieg": 2
        },
        "campaign": {
          "conscription": 4,
          "meds_team": 3,
          "spy": 3,
          "isr": 4,
          "paratrooper": 4,
          "rank_up": 3,
          "scouting": 4,
          "peace_talk": 2,
          "peace_negotiation": 2,
          "revolution": 3,
          "blitzkrieg": 2,
          "international_support": 3,
          "airborne_raid": 4,
          "economic_sanctions": 3,
          "economic_espionage": 2,
          "scorched_earth": 3,
          "relocate_capital": 2
        }
      },
      "fields": [
        {
          "id": "a",
          "label": "西部指挥部",
          "type": "capital",
          "x": 12,
          "y": 54,
          "links": [
            "b",
            "c"
          ],
          "owner": 0,
          "capital": true
        },
        {
          "id": "b",
          "label": "北部隘口",
          "type": "town",
          "x": 32,
          "y": 28,
          "links": [
            "a",
            "d",
            "e"
          ]
        },
        {
          "id": "c",
          "label": "南部油田",
          "type": "oil",
          "x": 32,
          "y": 76,
          "links": [
            "a",
            "d",
            "f"
          ]
        },
        {
          "id": "d",
          "label": "峡谷中继",
          "type": "town",
          "x": 50,
          "y": 52,
          "links": [
            "b",
            "c",
            "e",
            "f"
          ],
          "fortified": true
        },
        {
          "id": "e",
          "label": "北部油田",
          "type": "oil",
          "x": 68,
          "y": 28,
          "links": [
            "b",
            "d",
            "g"
          ]
        },
        {
          "id": "f",
          "label": "南部隘口",
          "type": "town",
          "x": 68,
          "y": 76,
          "links": [
            "c",
            "d",
            "g"
          ]
        },
        {
          "id": "g",
          "label": "东部指挥部",
          "type": "capital",
          "x": 88,
          "y": 54,
          "links": [
            "e",
            "f"
          ],
          "owner": 1,
          "capital": true
        }
      ]
    },
    {
      "id": "ring",
      "strategyPools": {
        "classic": {
          "spy": 4,
          "paratrooper": 4,
          "rank_up": 3,
          "scouting": 5,
          "peace_talk": 2,
          "blitzkrieg": 2
        },
        "campaign": {
          "conscription": 3,
          "meds_team": 3,
          "spy": 4,
          "isr": 5,
          "paratrooper": 4,
          "rank_up": 3,
          "scouting": 5,
          "peace_talk": 2,
          "peace_negotiation": 3,
          "revolution": 2,
          "blitzkrieg": 2,
          "international_support": 3,
          "airborne_raid": 4,
          "economic_sanctions": 2,
          "economic_espionage": 3,
          "scorched_earth": 2,
          "relocate_capital": 2
        }
      },
      "fields": [
        {
          "id": "a",
          "label": "西岸指挥部",
          "type": "capital",
          "x": 12,
          "y": 52,
          "links": [
            "b",
            "h"
          ],
          "owner": 0,
          "capital": true
        },
        {
          "id": "b",
          "label": "北港",
          "type": "town",
          "x": 24,
          "y": 25,
          "links": [
            "a",
            "c",
            "i"
          ]
        },
        {
          "id": "c",
          "label": "北部油田",
          "type": "oil",
          "x": 50,
          "y": 18,
          "links": [
            "b",
            "d"
          ]
        },
        {
          "id": "d",
          "label": "东部雷达",
          "type": "town",
          "x": 76,
          "y": 25,
          "links": [
            "c",
            "e",
            "i"
          ]
        },
        {
          "id": "e",
          "label": "东岸指挥部",
          "type": "capital",
          "x": 88,
          "y": 52,
          "links": [
            "d",
            "f"
          ],
          "owner": 1,
          "capital": true
        },
        {
          "id": "f",
          "label": "南港",
          "type": "town",
          "x": 76,
          "y": 79,
          "links": [
            "e",
            "g",
            "i"
          ]
        },
        {
          "id": "g",
          "label": "南部油田",
          "type": "oil",
          "x": 50,
          "y": 87,
          "links": [
            "f",
            "h"
          ]
        },
        {
          "id": "h",
          "label": "西侧沼泽",
          "type": "swamp",
          "x": 24,
          "y": 79,
          "links": [
            "g",
            "a",
            "i"
          ]
        },
        {
          "id": "i",
          "label": "中央堡垒",
          "type": "town",
          "x": 50,
          "y": 52,
          "links": [
            "b",
            "d",
            "f",
            "h"
          ],
          "fortified": true
        }
      ]
    },
    {
      "id": "eastern_front",
      "strategyPools": {
        "classic": {
          "spy": 2,
          "paratrooper": 2,
          "rank_up": 3,
          "scouting": 3,
          "peace_talk": 2,
          "blitzkrieg": 5
        },
        "campaign": {
          "conscription": 5,
          "meds_team": 3,
          "spy": 2,
          "isr": 3,
          "paratrooper": 2,
          "rank_up": 3,
          "scouting": 3,
          "peace_talk": 2,
          "peace_negotiation": 2,
          "revolution": 2,
          "blitzkrieg": 5,
          "international_support": 5,
          "airborne_raid": 3,
          "economic_sanctions": 3,
          "economic_espionage": 2,
          "scorched_earth": 5,
          "relocate_capital": 4
        }
      },
      "historical": {
        "control": {
          "berlin": 0,
          "prussia": 0,
          "warsaw": 0,
          "krakow": 0,
          "baltic": 0,
          "lviv": 0,
          "minsk": 1,
          "smolensk": 1,
          "kyiv": 1,
          "leningrad": 1,
          "kharkov": 1,
          "caucasus": 1,
          "stalingrad": 1,
          "moscow": 1
        }
      },
      "historicalStrategies": [
        [
          "blitzkrieg"
        ],
        [
          "international_support"
        ]
      ],
      "fields": [
        {
          "id": "berlin",
          "label": "柏林指挥部",
          "type": "capital",
          "x": 8,
          "y": 40,
          "links": [
            "prussia",
            "warsaw",
            "krakow"
          ],
          "owner": 0,
          "capital": true
        },
        {
          "id": "prussia",
          "label": "东普鲁士",
          "type": "port",
          "x": 25,
          "y": 30,
          "links": [
            "berlin",
            "warsaw",
            "baltic"
          ]
        },
        {
          "id": "warsaw",
          "label": "华沙枢纽",
          "type": "town",
          "x": 26,
          "y": 41,
          "links": [
            "berlin",
            "prussia",
            "krakow",
            "minsk",
            "lviv"
          ],
          "fortified": true
        },
        {
          "id": "krakow",
          "label": "克拉科夫",
          "type": "town",
          "x": 24,
          "y": 50,
          "links": [
            "berlin",
            "warsaw",
            "lviv"
          ]
        },
        {
          "id": "baltic",
          "label": "波罗的海走廊",
          "type": "port",
          "x": 34,
          "y": 21,
          "links": [
            "prussia",
            "minsk",
            "smolensk",
            "leningrad"
          ]
        },
        {
          "id": "minsk",
          "label": "明斯克",
          "type": "town",
          "x": 42,
          "y": 34,
          "links": [
            "warsaw",
            "baltic",
            "smolensk",
            "kyiv"
          ],
          "fortified": true
        },
        {
          "id": "lviv",
          "label": "利沃夫",
          "type": "town",
          "x": 36,
          "y": 55,
          "links": [
            "warsaw",
            "krakow",
            "kyiv",
            "caucasus"
          ]
        },
        {
          "id": "smolensk",
          "label": "斯摩棱斯克",
          "type": "town",
          "x": 53,
          "y": 30,
          "links": [
            "baltic",
            "minsk",
            "moscow",
            "kharkov"
          ],
          "fortified": true
        },
        {
          "id": "kyiv",
          "label": "基辅",
          "type": "town",
          "x": 49,
          "y": 48,
          "links": [
            "minsk",
            "lviv",
            "kharkov"
          ]
        },
        {
          "id": "leningrad",
          "label": "列宁格勒",
          "type": "port",
          "x": 48,
          "y": 9,
          "links": [
            "baltic",
            "moscow"
          ],
          "fortified": true
        },
        {
          "id": "kharkov",
          "label": "哈尔科夫",
          "type": "town",
          "x": 62,
          "y": 50,
          "links": [
            "smolensk",
            "kyiv",
            "stalingrad",
            "caucasus"
          ]
        },
        {
          "id": "caucasus",
          "label": "高加索油区",
          "type": "oil",
          "x": 72,
          "y": 73,
          "links": [
            "lviv",
            "kharkov",
            "stalingrad"
          ]
        },
        {
          "id": "stalingrad",
          "label": "斯大林格勒",
          "type": "town",
          "x": 82,
          "y": 55,
          "links": [
            "kharkov",
            "caucasus",
            "moscow"
          ],
          "fortified": true
        },
        {
          "id": "moscow",
          "label": "莫斯科指挥部",
          "type": "capital",
          "x": 66,
          "y": 26,
          "links": [
            "smolensk",
            "leningrad",
            "stalingrad"
          ],
          "owner": 1,
          "capital": true
        }
      ]
    },
    {
      "id": "korea",
      "strategyPools": {
        "classic": {
          "spy": 3,
          "paratrooper": 5,
          "rank_up": 3,
          "scouting": 4,
          "peace_talk": 2,
          "blitzkrieg": 2
        },
        "campaign": {
          "conscription": 4,
          "meds_team": 4,
          "spy": 3,
          "isr": 4,
          "paratrooper": 5,
          "rank_up": 3,
          "scouting": 4,
          "peace_talk": 2,
          "peace_negotiation": 3,
          "revolution": 2,
          "blitzkrieg": 2,
          "international_support": 5,
          "airborne_raid": 5,
          "economic_sanctions": 4,
          "economic_espionage": 2,
          "scorched_earth": 3,
          "relocate_capital": 2
        }
      },
      "historical": {
        "control": {
          "pyongyang": 0,
          "sinuiju": 0,
          "chosin": 0,
          "wonsan": 0,
          "kaesong": 0,
          "incheon": 1,
          "seoul": 1,
          "chuncheon": 1,
          "daejeon": 1,
          "daegu": 1,
          "busan": 1
        }
      },
      "historicalStrategies": [
        [
          "international_support"
        ],
        [
          "economic_sanctions"
        ]
      ],
      "seaLinks": [
        [
          "incheon",
          "wonsan"
        ]
      ],
      "fields": [
        {
          "id": "pyongyang",
          "label": "平壤指挥部",
          "type": "capital",
          "x": 31,
          "y": 41,
          "links": [
            "sinuiju",
            "wonsan",
            "kaesong"
          ],
          "owner": 0,
          "capital": true
        },
        {
          "id": "sinuiju",
          "label": "鸭绿江补给线",
          "type": "oil",
          "x": 16,
          "y": 33,
          "links": [
            "pyongyang",
            "chosin"
          ]
        },
        {
          "id": "chosin",
          "label": "长津山地",
          "type": "mountain",
          "x": 47,
          "y": 29,
          "links": [
            "sinuiju",
            "wonsan"
          ]
        },
        {
          "id": "wonsan",
          "label": "元山港",
          "type": "port",
          "x": 49,
          "y": 40,
          "links": [
            "pyongyang",
            "chosin",
            "chuncheon",
            "incheon"
          ]
        },
        {
          "id": "kaesong",
          "label": "开城防线",
          "type": "town",
          "x": 34,
          "y": 48,
          "links": [
            "pyongyang",
            "seoul",
            "chuncheon"
          ],
          "fortified": true
        },
        {
          "id": "incheon",
          "label": "仁川港",
          "type": "port",
          "x": 34,
          "y": 62,
          "links": [
            "seoul",
            "daejeon",
            "wonsan"
          ]
        },
        {
          "id": "seoul",
          "label": "首尔枢纽",
          "type": "town",
          "x": 52,
          "y": 56,
          "links": [
            "kaesong",
            "incheon",
            "chuncheon",
            "daejeon"
          ],
          "fortified": true
        },
        {
          "id": "chuncheon",
          "label": "春川山口",
          "type": "mountain",
          "x": 57,
          "y": 43,
          "links": [
            "wonsan",
            "kaesong",
            "seoul",
            "daegu"
          ]
        },
        {
          "id": "daejeon",
          "label": "大田",
          "type": "town",
          "x": 49,
          "y": 64,
          "links": [
            "incheon",
            "seoul",
            "daegu"
          ]
        },
        {
          "id": "daegu",
          "label": "大邱防线",
          "type": "town",
          "x": 62,
          "y": 68,
          "links": [
            "chuncheon",
            "daejeon",
            "busan"
          ],
          "fortified": true
        },
        {
          "id": "busan",
          "label": "釜山指挥部",
          "type": "capital",
          "x": 68,
          "y": 74,
          "links": [
            "daegu"
          ],
          "owner": 1,
          "capital": true
        }
      ]
    },
    {
      "id": "western_front",
      "strategyPools": {
        "classic": {
          "spy": 2,
          "paratrooper": 2,
          "rank_up": 4,
          "scouting": 4,
          "peace_talk": 4,
          "blitzkrieg": 5
        },
        "campaign": {
          "conscription": 3,
          "meds_team": 3,
          "spy": 2,
          "isr": 3,
          "paratrooper": 2,
          "rank_up": 4,
          "scouting": 4,
          "peace_talk": 4,
          "peace_negotiation": 3,
          "revolution": 2,
          "blitzkrieg": 5,
          "international_support": 3,
          "airborne_raid": 2,
          "economic_sanctions": 3,
          "economic_espionage": 2,
          "scorched_earth": 3,
          "relocate_capital": 3
        }
      },
      "historical": {
        "control": {
          "berlin": 0,
          "hamburg": 0,
          "ruhr": 0,
          "frankfurt": 0,
          "munich": 0,
          "luxembourg": 1,
          "alsace": 1,
          "ardennes": 1,
          "sedan": 1,
          "belgium": 1,
          "reims": 1,
          "paris": 1
        }
      },
      "historicalStrategies": [
        [
          "blitzkrieg"
        ],
        [
          "peace_talk"
        ]
      ],
      "seaLinks": [
        [
          "belgium",
          "hamburg"
        ]
      ],
      "fields": [
        {
          "id": "paris",
          "label": "巴黎指挥部",
          "type": "capital",
          "x": 30,
          "y": 57,
          "links": [
            "reims",
            "belgium",
            "alsace"
          ],
          "owner": 1,
          "capital": true
        },
        {
          "id": "reims",
          "label": "兰斯",
          "type": "town",
          "x": 40,
          "y": 50,
          "links": [
            "paris",
            "belgium",
            "sedan"
          ]
        },
        {
          "id": "belgium",
          "label": "比利时低地",
          "type": "port",
          "x": 47,
          "y": 34,
          "links": [
            "paris",
            "reims",
            "ardennes",
            "hamburg"
          ]
        },
        {
          "id": "sedan",
          "label": "色当要塞",
          "type": "town",
          "x": 52,
          "y": 60,
          "links": [
            "reims",
            "ardennes",
            "luxembourg",
            "alsace"
          ],
          "fortified": true
        },
        {
          "id": "ardennes",
          "label": "阿登山林",
          "type": "forest",
          "x": 53,
          "y": 38,
          "links": [
            "belgium",
            "sedan",
            "luxembourg",
            "ruhr"
          ]
        },
        {
          "id": "alsace",
          "label": "阿尔萨斯",
          "type": "mountain",
          "x": 63,
          "y": 53,
          "links": [
            "paris",
            "sedan",
            "luxembourg",
            "munich"
          ]
        },
        {
          "id": "luxembourg",
          "label": "卢森堡走廊",
          "type": "town",
          "x": 66,
          "y": 49,
          "links": [
            "sedan",
            "ardennes",
            "alsace",
            "frankfurt"
          ],
          "fortified": true
        },
        {
          "id": "hamburg",
          "label": "汉堡港",
          "type": "port",
          "x": 73,
          "y": 18,
          "links": [
            "belgium",
            "ruhr",
            "berlin"
          ]
        },
        {
          "id": "ruhr",
          "label": "鲁尔工业区",
          "type": "oil",
          "x": 59,
          "y": 33,
          "links": [
            "ardennes",
            "hamburg",
            "frankfurt",
            "berlin"
          ]
        },
        {
          "id": "frankfurt",
          "label": "法兰克福",
          "type": "town",
          "x": 67,
          "y": 42,
          "links": [
            "luxembourg",
            "ruhr",
            "munich",
            "berlin"
          ],
          "fortified": true
        },
        {
          "id": "munich",
          "label": "慕尼黑",
          "type": "town",
          "x": 80,
          "y": 56,
          "links": [
            "alsace",
            "frankfurt",
            "berlin"
          ]
        },
        {
          "id": "berlin",
          "label": "柏林指挥部",
          "type": "capital",
          "x": 88,
          "y": 25,
          "links": [
            "hamburg",
            "ruhr",
            "frankfurt",
            "munich"
          ],
          "owner": 0,
          "capital": true
        }
      ]
    },
    {
      "id": "hormuz",
      "strategyPools": {
        "classic": {
          "spy": 5,
          "paratrooper": 3,
          "rank_up": 2,
          "scouting": 5,
          "peace_talk": 2,
          "blitzkrieg": 2
        },
        "campaign": {
          "conscription": 3,
          "meds_team": 3,
          "spy": 5,
          "isr": 5,
          "paratrooper": 3,
          "rank_up": 2,
          "scouting": 5,
          "peace_talk": 2,
          "peace_negotiation": 3,
          "revolution": 2,
          "blitzkrieg": 2,
          "international_support": 3,
          "airborne_raid": 4,
          "economic_sanctions": 5,
          "economic_espionage": 5,
          "scorched_earth": 3,
          "relocate_capital": 2
        }
      },
      "historical": {
        "control": {
          "oman_hq": 0,
          "gulf_port": 0,
          "musandam": 0,
          "offshore": 0,
          "desert": 0,
          "iran_hq": 1,
          "iran_coast": 1,
          "bandar": 1,
          "qeshm": 1,
          "island": 1
        }
      },
      "historicalStrategies": [
        [
          "economic_sanctions"
        ],
        [
          "economic_espionage"
        ]
      ],
      "seaLinks": [
        [
          "musandam",
          "qeshm"
        ],
        [
          "gulf_port",
          "qeshm"
        ]
      ],
      "fields": [
        {
          "id": "oman_hq",
          "label": "马斯喀特指挥部",
          "type": "capital",
          "x": 88,
          "y": 77,
          "links": [
            "gulf_port",
            "musandam"
          ],
          "owner": 0,
          "capital": true
        },
        {
          "id": "gulf_port",
          "label": "苏哈尔港",
          "type": "port",
          "x": 58,
          "y": 66,
          "links": [
            "oman_hq",
            "musandam",
            "island",
            "qeshm",
            "desert"
          ]
        },
        {
          "id": "musandam",
          "label": "穆桑代姆",
          "type": "mountain",
          "x": 50,
          "y": 40,
          "links": [
            "oman_hq",
            "gulf_port",
            "island",
            "qeshm",
            "offshore"
          ]
        },
        {
          "id": "island",
          "label": "海峡中岛",
          "type": "town",
          "x": 54,
          "y": 35,
          "links": [
            "gulf_port",
            "musandam",
            "qeshm",
            "bandar"
          ],
          "fortified": true
        },
        {
          "id": "qeshm",
          "label": "格什姆港",
          "type": "port",
          "x": 43,
          "y": 31,
          "links": [
            "gulf_port",
            "musandam",
            "island",
            "bandar",
            "iran_coast"
          ]
        },
        {
          "id": "bandar",
          "label": "阿巴斯油港",
          "type": "oil",
          "x": 48,
          "y": 26,
          "links": [
            "island",
            "qeshm",
            "iran_hq",
            "offshore"
          ]
        },
        {
          "id": "iran_coast",
          "label": "沿岸山口",
          "type": "mountain",
          "x": 64,
          "y": 26,
          "links": [
            "qeshm",
            "iran_hq",
            "desert"
          ]
        },
        {
          "id": "iran_hq",
          "label": "波斯湾指挥部",
          "type": "capital",
          "x": 20,
          "y": 35,
          "links": [
            "bandar",
            "iran_coast"
          ],
          "owner": 1,
          "capital": true
        },
        {
          "id": "offshore",
          "label": "外海锚地",
          "type": "port",
          "x": 45,
          "y": 49,
          "links": [
            "musandam",
            "bandar"
          ]
        },
        {
          "id": "desert",
          "label": "内陆沙漠",
          "type": "town",
          "x": 80,
          "y": 90,
          "links": [
            "gulf_port",
            "iran_coast"
          ]
        }
      ]
    },
    {
      "id": "china_civil_war",
      "strategyPools": {
        "classic": {
          "spy": 4,
          "paratrooper": 3,
          "rank_up": 3,
          "scouting": 4,
          "peace_talk": 3,
          "blitzkrieg": 2
        },
        "campaign": {
          "conscription": 4,
          "meds_team": 4,
          "spy": 4,
          "isr": 3,
          "paratrooper": 3,
          "rank_up": 3,
          "scouting": 4,
          "peace_talk": 3,
          "peace_negotiation": 5,
          "revolution": 5,
          "blitzkrieg": 2,
          "international_support": 5,
          "airborne_raid": 3,
          "economic_sanctions": 3,
          "economic_espionage": 3,
          "scorched_earth": 4,
          "relocate_capital": 5
        }
      },
      "factionLogos": [
        "☀",
        "★"
      ],
      "historical": {
        "control": {
          "nanjing": 0,
          "shanghai": 0,
          "hangzhou": 0,
          "wuhan": 0,
          "changsha": 0,
          "nanchang": 0,
          "xuzhou": 0,
          "tianjin": 0,
          "beiping": 0,
          "zhengzhou": 1,
          "jinan": 1,
          "yanan": 1,
          "shenyang": 1
        }
      },
      "historicalStrategies": [
        [
          "relocate_capital",
          "peace_negotiation"
        ],
        [
          "peace_negotiation",
          "international_support"
        ]
      ],
      "seaLinks": [
        [
          "shanghai",
          "tianjin"
        ]
      ],
      "fields": [
        {
          "id": "nanjing",
          "label": "南京指挥部",
          "type": "capital",
          "x": 65,
          "y": 57,
          "links": [
            "xuzhou",
            "wuhan",
            "shanghai"
          ],
          "owner": 0,
          "capital": true
        },
        {
          "id": "shanghai",
          "label": "上海港",
          "type": "port",
          "x": 82,
          "y": 51,
          "links": [
            "nanjing",
            "hangzhou",
            "tianjin"
          ]
        },
        {
          "id": "hangzhou",
          "label": "杭州",
          "type": "town",
          "x": 74,
          "y": 68,
          "links": [
            "shanghai",
            "wuhan"
          ]
        },
        {
          "id": "wuhan",
          "label": "武汉枢纽",
          "type": "town",
          "x": 49,
          "y": 54,
          "links": [
            "nanjing",
            "hangzhou",
            "xuzhou",
            "zhengzhou",
            "changsha",
            "nanchang"
          ],
          "fortified": true
        },
        {
          "id": "changsha",
          "label": "长沙",
          "type": "forest",
          "x": 40,
          "y": 68,
          "links": [
            "wuhan",
            "nanchang"
          ]
        },
        {
          "id": "nanchang",
          "label": "南昌",
          "type": "town",
          "x": 56,
          "y": 70,
          "links": [
            "changsha",
            "wuhan"
          ]
        },
        {
          "id": "xuzhou",
          "label": "徐州",
          "type": "town",
          "x": 62,
          "y": 45,
          "links": [
            "nanjing",
            "wuhan",
            "jinan",
            "zhengzhou"
          ],
          "fortified": true
        },
        {
          "id": "jinan",
          "label": "济南",
          "type": "town",
          "x": 51,
          "y": 35,
          "links": [
            "xuzhou",
            "tianjin",
            "zhengzhou"
          ],
          "fortified": true
        },
        {
          "id": "tianjin",
          "label": "天津港",
          "type": "port",
          "x": 69,
          "y": 37,
          "links": [
            "jinan",
            "beiping",
            "shenyang",
            "shanghai"
          ]
        },
        {
          "id": "beiping",
          "label": "北平枢纽",
          "type": "town",
          "x": 62,
          "y": 23,
          "links": [
            "tianjin",
            "zhengzhou",
            "yanan",
            "shenyang"
          ],
          "fortified": true
        },
        {
          "id": "zhengzhou",
          "label": "郑州",
          "type": "town",
          "x": 43,
          "y": 44,
          "links": [
            "wuhan",
            "xuzhou",
            "jinan",
            "beiping",
            "yanan"
          ],
          "fortified": true
        },
        {
          "id": "yanan",
          "label": "延安指挥部",
          "type": "capital",
          "x": 27,
          "y": 29,
          "links": [
            "beiping",
            "zhengzhou",
            "shenyang"
          ],
          "owner": 1,
          "capital": true
        },
        {
          "id": "shenyang",
          "label": "沈阳油区",
          "type": "oil",
          "x": 86,
          "y": 22,
          "links": [
            "tianjin",
            "beiping",
            "yanan"
          ]
        }
      ]
    }
  ]
};
