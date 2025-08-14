// XState Interpreter for Board Game Language
import { createMachine, interpret } from 'xstate';

class BoardGameXStateInterpreter {
  constructor(gameDefinition) {
    this.gameDefinition = gameDefinition;
    this.stateMachine = this.createStateMachine();
  }

  createStateMachine() {
    const states = this.buildStates();
    const events = this.buildEvents();
    
    return createMachine({
      id: this.gameDefinition.game.name,
      initial: 'setup',
      states: states,
      context: {
        board: this.gameDefinition.game.state.board,
        pieces: this.gameDefinition.game.state.pieces,
        turn: 1,
        phase: 'setup',
        playerCoins: new Map(),
        moveHistory: []
      }
    });
  }

  buildStates() {
    const states = {
      setup: {
        on: {
          'PLACE_PIECES': 'main',
          'START_GAME': 'main'
        }
      },
      main: {
        on: {
          'SELECT_PIECE': 'selecting',
          'MOVE_PIECE': 'moving',
          'VALIDATE_MOVE': 'validating',
          'EXECUTE_MOVE': 'executing',
          'CHECK_WIN': 'checking_win',
          'NEXT_TURN': 'main'
        }
      },
      selecting: {
        on: {
          'PIECE_SELECTED': 'moving',
          'CANCEL_SELECTION': 'main'
        }
      },
      moving: {
        on: {
          'MOVE_VALID': 'validating',
          'MOVE_INVALID': 'main'
        }
      },
      validating: {
        on: {
          'CONSTRAINTS_PASS': 'executing',
          'CONSTRAINTS_FAIL': 'main',
          'COIN_BYPASS': 'executing'
        }
      },
      executing: {
        on: {
          'MOVE_EXECUTED': 'checking_win',
          'TRIGGER_FIRED': 'checking_win',
          'ACTION_COST_PAID': 'checking_win'
        }
      },
      checking_win: {
        on: {
          'WIN_CONDITION_MET': 'end',
          'NO_WIN': 'main'
        }
      },
      end: {
        type: 'final'
      }
    };

    // Add coin states for each coin type
    const coinStates = this.buildCoinStates();
    Object.assign(states, coinStates);

    return states;
  }

  buildCoinStates() {
    const coinStates = {};
    const allCoins = this.extractAllCoins();

    allCoins.forEach(coinType => {
      coinStates[`${coinType}_available`] = {
        on: {
          [`SPEND_${coinType.toUpperCase()}`]: 'main',
          [`GAIN_${coinType.toUpperCase()}`]: 'main'
        }
      };
    });

    return coinStates;
  }

  buildEvents() {
    const events = {};
    
    // Add events for each trigger
    this.gameDefinition.rules.triggers.forEach(trigger => {
      const eventName = `TRIGGER_${trigger.event.toUpperCase()}`;
      events[eventName] = {
        actions: ['giveCoins', 'logTrigger']
      };
    });

    // Add events for each action
    this.gameDefinition.rules.actions.forEach(action => {
      const eventName = `ACTION_${action.name.toUpperCase()}`;
      events[eventName] = {
        actions: ['consumeCoins', 'executeAction', 'logAction']
      };
    });

    // Add events for each constraint
    this.gameDefinition.rules.constraints.forEach(constraint => {
      const eventName = `CONSTRAINT_${constraint.name.toUpperCase()}`;
      events[eventName] = {
        actions: ['checkConstraint', 'logConstraint']
      };
    });

    return events;
  }

  extractAllCoins() {
    const coins = new Set();
    
    // Extract from triggers
    this.gameDefinition.rules.triggers.forEach(trigger => {
      if (trigger.coin) {
        trigger.coin.split(' ').forEach(coin => coins.add(coin));
      }
    });

    // Extract from actions
    this.gameDefinition.rules.actions.forEach(action => {
      if (action.coin) {
        action.coin.split(' ').forEach(coin => coins.add(coin));
      }
      if (action.cost) {
        action.cost.split(' ').forEach(coin => coins.add(coin));
      }
    });

    // Extract from constraints
    this.gameDefinition.rules.constraints.forEach(constraint => {
      if (constraint.coin) {
        constraint.coin.split(' ').forEach(coin => coins.add(coin));
      }
      if (constraint.cost) {
        constraint.cost.split(' ').forEach(coin => coins.add(coin));
      }
    });

    return Array.from(coins);
  }

  // Action implementations
  giveCoins(context, event) {
    const trigger = this.findTrigger(event.type);
    if (trigger && trigger.coin) {
      const coins = trigger.coin.split(' ');
      coins.forEach(coinType => {
        const current = context.playerCoins.get(coinType) || 0;
        context.playerCoins.set(coinType, current + 1);
      });
    }
  }

  consumeCoins(context, event) {
    const action = this.findAction(event.type);
    if (action && action.cost) {
      const costCoins = action.cost.split(' ');
      const coinCounts = {};
      costCoins.forEach(coin => {
        coinCounts[coin] = (coinCounts[coin] || 0) + 1;
      });

      Object.entries(coinCounts).forEach(([coinType, amount]) => {
        const current = context.playerCoins.get(coinType) || 0;
        if (current >= amount) {
          context.playerCoins.set(coinType, current - amount);
        }
      });
    }
  }

  checkConstraint(context, event) {
    const constraint = this.findConstraint(event.type);
    if (constraint) {
      const condition = constraint.condition(context, event);
      if (condition && constraint.cost) {
        // Check if player can pay the cost to bypass
        return this.canPayCost(context, constraint.cost);
      }
      return !condition;
    }
    return true;
  }

  canPayCost(context, costString) {
    const costCoins = costString.split(' ');
    const coinCounts = {};
    costCoins.forEach(coin => {
      coinCounts[coin] = (coinCounts[coin] || 0) + 1;
    });

    return Object.entries(coinCounts).every(([coinType, required]) => {
      const current = context.playerCoins.get(coinType) || 0;
      return current >= required;
    });
  }

  findTrigger(eventType) {
    const triggerName = eventType.replace('TRIGGER_', '').toLowerCase();
    return this.gameDefinition.rules.triggers.find(t => 
      t.event.toLowerCase() === triggerName
    );
  }

  findAction(eventType) {
    const actionName = eventType.replace('ACTION_', '').toLowerCase();
    return this.gameDefinition.rules.actions.find(a => 
      a.name.toLowerCase() === actionName
    );
  }

  findConstraint(eventType) {
    const constraintName = eventType.replace('CONSTRAINT_', '').toLowerCase();
    return this.gameDefinition.rules.constraints.find(c => 
      c.name.toLowerCase() === constraintName
    );
  }

  // Logging actions for visualization
  logTrigger(context, event) {
    console.log(`Trigger fired: ${event.type}`, context.playerCoins);
  }

  logAction(context, event) {
    console.log(`Action executed: ${event.type}`, context.playerCoins);
  }

  logConstraint(context, event) {
    console.log(`Constraint checked: ${event.type}`, context.playerCoins);
  }

  // Start the interpreter
  start() {
    this.service = interpret(this.stateMachine)
      .onTransition((state) => {
        console.log('State:', state.value);
        console.log('Coins:', state.context.playerCoins);
      })
      .start();
    
    return this.service;
  }

  // Send events to the state machine
  send(event) {
    if (this.service) {
      this.service.send(event);
    }
  }
}

// Example usage with chess rules
const chessRules = {
  game: {
    name: "Chess",
    players: 2,
    state: {
      board: "8x8 grid",
      pieces: {white: ["king", "queen", "rooks", "bishops", "knights", "pawns"], black: ["king", "queen", "rooks", "bishops", "knights", "pawns"]},
      turn: 1,
      phase: "main"
    }
  },
  rules: {
    triggers: [
      {
        event: "piece_moved",
        condition: "piece.type == 'pawn' && distance == 2",
        action: "enable_en_passant",
        coin: "en_passant_token",
        cost: 0
      },
      {
        event: "king_first_move", 
        condition: "king_never_moved && rook_never_moved",
        action: "enable_castling",
        coin: "castle_token",
        cost: 0
      },
      {
        event: "queen_first_move",
        condition: "queen_never_moved && queen_side_rook_never_moved", 
        action: "enable_queen_side_castling",
        coin: "castle_token queen_token",
        cost: 0
      }
    ],
    actions: [
      {
        name: "en_passant",
        when: "pawn_captures_en_passant",
        effect: "remove_opponent_pawn",
        coin: "en_passant_token",
        cost: "en_passant_token"
      },
      {
        name: "advanced_castling",
        when: "king_castles_with_queen_side",
        effect: "castle_queen_side", 
        coin: "castle_token queen_token",
        cost: "castle_token queen_token"
      }
    ],
    constraints: [
      {
        name: "castling_constraint",
        condition: "king_has_moved || rook_has_moved || king_in_check",
        message: "Cannot castle: king/rook moved or king in check",
        coin: "castle_token",
        cost: "castle_token"
      },
      {
        name: "queen_side_castling_constraint",
        condition: "queen_has_moved || queen_side_rook_moved",
        message: "Cannot castle queen-side: queen or rook has moved",
        coin: "castle_token queen_token",
        cost: "castle_token queen_token"
      }
    ]
  }
};

// Create and start the interpreter
const interpreter = new BoardGameXStateInterpreter(chessRules);
const service = interpreter.start();

// Export for use in XState Visualizer
export { interpreter, service, chessRules }; 