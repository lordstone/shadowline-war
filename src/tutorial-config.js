// Generated from config/tutorial-scenario.yaml. Do not edit.
export const TUTORIAL_SCENARIO={
  "schemaVersion": 1,
  "id": "tutorial_campaign",
  "map": "rift",
  "seed": 114,
  "playerHand": [
    49,
    0,
    39,
    30,
    44,
    14,
    7,
    28,
    42
  ],
  "aiHand": [
    21,
    37,
    1,
    4,
    6,
    9,
    15,
    19,
    23
  ],
  "garrisons": {
    "a": {
      "owner": 0,
      "cards": [
        {
          "id": 27,
          "open": false
        },
        {
          "id": 41,
          "open": false
        },
        {
          "id": 16,
          "open": false
        }
      ]
    },
    "b": {
      "owner": null,
      "cards": []
    },
    "c": {
      "owner": 0,
      "cards": [
        {
          "id": 32,
          "open": true
        },
        {
          "id": 10,
          "open": false
        },
        {
          "id": 38,
          "open": false
        }
      ]
    },
    "d": {
      "owner": 1,
      "cards": [
        {
          "id": 48,
          "open": true
        },
        {
          "id": 11,
          "open": false
        }
      ]
    },
    "e": {
      "owner": null,
      "cards": []
    },
    "f": {
      "owner": 1,
      "cards": [
        {
          "id": 17,
          "open": true
        }
      ]
    },
    "g": {
      "owner": 1,
      "cards": [
        {
          "id": 25,
          "open": false
        }
      ]
    }
  },
  "deckTop": [
    35
  ],
  "playerStrategies": [
    "rank_up",
    "airborne_raid"
  ],
  "strategyMarkets": [
    [
      "conscription",
      "spy",
      "blitzkrieg"
    ],
    [
      "conscription",
      "spy",
      "blitzkrieg"
    ]
  ],
  "steps": [
    {
      "id": "defend_first",
      "action": "reveal",
      "cards": [
        10
      ],
      "target": "c",
      "nextAi": "defend_reply"
    },
    {
      "id": "defend_second",
      "action": "reveal",
      "cards": [
        38
      ],
      "target": "c",
      "nextAi": "after_defense"
    },
    {
      "id": "supply",
      "action": "supply"
    },
    {
      "id": "occupy",
      "action": "occupy",
      "target": "b",
      "cards": [
        {
          "id": 30,
          "open": true
        },
        {
          "id": 44,
          "open": false
        }
      ]
    },
    {
      "id": "end_turn",
      "action": "pass",
      "nextAi": "after_player_turn"
    },
    {
      "id": "attack_center",
      "action": "attack",
      "target": "d"
    },
    {
      "id": "deploy_center",
      "action": "deploy",
      "cards": [
        {
          "id": 49,
          "open": true
        },
        {
          "id": 7,
          "open": false
        }
      ],
      "target": "d"
    },
    {
      "id": "tactics_continue",
      "action": "continue",
      "target": "d",
      "nextAi": "center_reply"
    },
    {
      "id": "rank_up",
      "action": "strategy",
      "strategy": "rank_up",
      "target": "d"
    },
    {
      "id": "end_turn_center",
      "action": "pass",
      "nextAi": "after_center_turn"
    },
    {
      "id": "airborne_raid",
      "action": "strategy",
      "strategy": "airborne_raid"
    },
    {
      "id": "attack_capital",
      "action": "attack",
      "target": "g"
    },
    {
      "id": "deploy_capital",
      "action": "deploy",
      "cards": [
        {
          "id": 0,
          "open": true
        },
        {
          "id": 39,
          "open": false
        }
      ],
      "target": "g",
      "nextAi": "capital_reply"
    },
    {
      "id": "reveal_capital",
      "action": "reveal",
      "cards": [
        39
      ],
      "target": "g"
    }
  ],
  "aiActions": [
    {
      "at": "opening",
      "action": {
        "type": "attack",
        "field": "c"
      },
      "nextAi": "opening_deploy"
    },
    {
      "at": "opening_deploy",
      "action": {
        "type": "deploy",
        "cards": [
          {
            "id": 21,
            "open": true
          },
          {
            "id": 37,
            "open": false
          }
        ]
      }
    },
    {
      "at": "defend_reply",
      "action": {
        "type": "reveal",
        "ids": [
          37
        ]
      },
      "nextStep": 1
    },
    {
      "at": "after_defense",
      "action": {
        "type": "pass"
      },
      "nextStep": 2
    },
    {
      "at": "after_player_turn",
      "action": {
        "type": "pass"
      },
      "nextStep": 5
    },
    {
      "at": "center_reply",
      "action": {
        "type": "reveal",
        "ids": [
          11
        ]
      },
      "nextStep": 8
    },
    {
      "at": "after_center_turn",
      "action": {
        "type": "pass"
      },
      "nextStep": 10
    },
    {
      "at": "capital_reply",
      "action": {
        "type": "reveal",
        "ids": [
          25
        ]
      },
      "nextStep": 13
    }
  ]
};
