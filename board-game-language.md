# Board Game Language Design

## Core Philosophy
A board game language should encode the **intent** and **procedures** of a game, not just the rules. It should be:
- **Declarative**: Describe what should happen, not how
- **Composable**: Rules should combine and interact cleanly
- **Testable**: Each rule should be verifiable
- **Human-readable**: Game designers should be able to write it

## Language Structure

### 1. Game State Representation
```yaml
game:
  name: "Chess"
  players: 2
  state:
    board: 8x8 grid
    pieces: {white: [king, queen, rooks, bishops, knights, pawns], black: [...]}
    turn: current_player
    phase: "main" | "check" | "checkmate"
```

### 2. Rule Types

#### **Triggers** (When rules activate)
```yaml
triggers:
  - event: "piece_moved"
    condition: "piece.type == 'pawn' && distance == 2"
    action: "enable_en_passant"
    coin: "en_passant_token"
    cost: 0  # Gives player 1 en_passant_token
    
  - event: "turn_start"
    condition: "king_in_check"
    action: "require_legal_move"
    coin: "check_token"
    cost: 0
    
  - event: "king_first_move"
    condition: "king_never_moved && rook_never_moved"
    action: "enable_castling"
    coin: "castle_token"
    cost: 0  # Gives player 1 castle_token
    
  - event: "queen_first_move"
    condition: "queen_never_moved && queen_side_rook_never_moved"
    action: "enable_queen_side_castling"
    coin: "castle_token queen_token"
    cost: 0  # Gives 1 castle_token and 1 queen_token


    - name: "queen_can_move"
        condition: "up_open || down_open || left_open || right_open || diag_up_left_open || diag_down_left_open || diag_up_right_open || diag_down_right_open"
        message: "Queen can move"
        coin: "queen_move_token"
        cost: 0

    - name: "space_occupied"
        condition: "target_occupied"
        message: "space is occupied"
        coin: "occupied_token"
        cost: 0

    - name: "have_queen"
        condition: "queen_in_play"
        message: "queen must be in play"
        coin: "queen_on_team_token"
        cost: 0
```

#### **Constraints** (What's forbidden)
```yaml
constraints:
  - name: "no_moving_into_check"
    condition: "move_would_expose_king"
    message: "This move would put your king in check"
    coin: "check_token"
    cost: 0
    
  - name: "pawn_direction"
    condition: "pawn_moving_backward"
    message: "Pawns can only move forward"
    coin: "pawn_token"
    cost: 0
    
  - name: "castling_constraint"
    condition: "!king_has_moved && rook_has_moved || king_in_check"
    message: "Cannot castle: king/rook moved or king in check"
    coin: "castle_token"
    cost: "castle_token"  # Requires 1 castle_token to bypass this constraint

- name: "queen_castling_constraint"
    condition: "!king_has_moved || !king_in_check"
    message: "Cannot castle: king/rook moved or king in check"
    coin: "queen_castle_token"
    cost: "queen_token"  # Requires 1 castle_token to bypass this constraint  
    
- name: "queen_side_castling_constraint"
    condition: "queen_has_moved || queen_side_rook_moved"
    message: "Cannot castle queen-side: queen or rook has moved"
    coin: "castle_token queen_castle_token"
    cost: "castle_token queen_token"  # Requires both castle_token AND queen_token to bypass
```

#### **Actions** (What happens when rules fire)
```yaml
actions:
  - name: "move_queen"
    when: "not_captured && queen_on_team_token"
    effect: "capture_piece || move_piece"
    coin: "queen_token"
    cost: 0

  - name: "move_piece"
    when: "not_captured"
    effect: "capture_piece || moved"
    coin: "move_token"
    cost: 0

  - name: "capture_piece"
    when: "landing_on_opponent_piece"
    effect: "remove_piece_from_board"
    coin: "capture_token"
    cost: "occupied_token"
    
  - name: "promote_pawn"
    when: "pawn_reaches_back_rank"
    effect: "replace_with_queen"
    coin: "promotion_token"
    cost: 0
    
  - name: "en_passant"
    when: "pawn_captures_en_passant"
    effect: "remove_opponent_pawn"
    coin: "en_passant_token"
    cost: "en_passant_token"  # Requires 1 en_passant_token to execute

  - name: "queen_promotion"
    when: "pawn_reaches_back_rank"
    effect: "replace_with_queen"
    coin: "promotion_token"
    cost: "promotion_token"
    
  - name: "advanced_castling"
    when: "king_castles_with_queen_side"
    effect: "castle_queen_side"
    coin: "castle_token"
    cost: "castle_viable rook_out knight_out"  # Requires both castle_token AND queen_token
```

### 3. Game Flow Control

#### **Phases** (Game state machines)
```yaml
phases:
  setup:
    - "place_pieces"
    - "determine_first_player"
  
  main:
    - "select_piece"
    - "validate_move"
    - "execute_move"
    - "check_game_end"
    - "next_turn"
  
  end:
    - "declare_winner"
    - "show_final_state"
```

#### **Win Conditions**
```yaml
win_conditions:
  - type: "checkmate"
    condition: "opponent_king_cannot_move"
    description: "Checkmate the opponent's king"
  
  - type: "stalemate"
    condition: "no_legal_moves && !in_check"
    description: "Opponent has no legal moves but isn't in check"
```

### 4. Component System

#### **Pieces/Components**
```yaml
pieces:
  king:
    movement: "one_square_any_direction"
    special: "castling"
    value: "infinite"
  
  queen:
    movement: "unlimited_any_direction"
    value: 9
  
  pawn:
    movement: "forward_one_or_two_on_first_move"
    capture: "diagonal_only"
    special: "en_passant"
```

### 5. Advanced Features

#### **Rule Interactions**
```yaml
rule_interactions:
  - primary: "pawn_movement"
    secondary: "en_passant"
    priority: "en_passant_first"
    
  - primary: "castling"
    secondary: "king_in_check"
    result: "castling_forbidden"
```

#### **Meta-Rules** (Rules about rules)
```yaml
meta_rules:
  - "all_moves_must_be_legal"
  - "game_ends_when_win_condition_met"
  - "players_alternate_turns"
```

## Implementation Strategy

### 1. Rule Engine with Coin System
```javascript
class RuleEngine {
  constructor(gameDefinition) {
    this.rules = gameDefinition.rules;
    this.state = gameDefinition.initialState;
    this.playerCoins = new Map();
  }
  
  validateMove(move) {
    return this.rules.constraints.every(constraint => {
      const condition = constraint.condition(move, this.state);
      if (condition && constraint.coin) {
        // Check if player has enough coins to bypass constraint
        return this.canPayCost(constraint.coin, constraint.cost);
      }
      return !condition;
    });
  }
  
  executeMove(move) {
    // Apply move
    this.applyMove(move);
    
    // Generate coins from triggers
    this.processTriggers(move);
    
    // Consume coins for actions
    this.processActions(move);
    
    // Check win conditions
    this.checkWinConditions();
  }
  
  processTriggers(move) {
    this.rules.triggers.forEach(trigger => {
      if (trigger.condition(move, this.state)) {
        this.giveCoin(trigger.coin, trigger.cost);
      }
    });
  }
  
  processActions(move) {
    this.rules.actions.forEach(action => {
      if (action.when(move, this.state)) {
        if (this.canPayCost(action.coin, action.cost)) {
          this.consumeCoin(action.coin, action.cost);
          action.effect(move, this.state);
        }
      }
    });
  }
  
  giveCoin(coinTypes, amount = 1) {
    // Parse coin string into individual coins
    const coins = coinTypes.split(' ').filter(coin => coin.length > 0);
    
    coins.forEach(coinType => {
      const current = this.playerCoins.get(coinType) || 0;
      this.playerCoins.set(coinType, current + amount);
    });
  }
  
  canPayCost(coinTypes, costString) {
    if (!coinTypes || costString === 0) return true;
    
    // Parse cost string into coin counts
    const costCoins = costString.split(' ').filter(coin => coin.length > 0);
    const coinCounts = {};
    costCoins.forEach(coin => {
      coinCounts[coin] = (coinCounts[coin] || 0) + 1;
    });
    
    // Check if player has enough of each coin type
    return Object.entries(coinCounts).every(([coinType, required]) => {
      const current = this.playerCoins.get(coinType) || 0;
      return current >= required;
    });
  }
  
  consumeCoin(coinTypes, costString) {
    if (!coinTypes || costString === 0) return;
    
    // Parse cost string into coin counts
    const costCoins = costString.split(' ').filter(coin => coin.length > 0);
    const coinCounts = {};
    costCoins.forEach(coin => {
      coinCounts[coin] = (coinCounts[coin] || 0) + 1;
    });
    
    // Consume each coin type
    Object.entries(coinCounts).forEach(([coinType, amount]) => {
      const current = this.playerCoins.get(coinType) || 0;
      this.playerCoins.set(coinType, current - amount);
    });
  }
}
```

### 2. State Machine
```javascript
class GameStateMachine {
  constructor(phases) {
    this.phases = phases;
    this.currentPhase = 'setup';
  }
  
  transition(event) {
    const nextPhase = this.phases[this.currentPhase].transitions[event];
    if (nextPhase) {
      this.currentPhase = nextPhase;
      this.executePhaseActions();
    }
  }
}
```

## Example: Tic-Tac-Toe

```yaml
game:
  name: "Tic-Tac-Toe"
  players: 2
  board: 3x3_grid
  
rules:
  setup:
    - "empty_board"
    - "player1_goes_first"
  
  constraints:
    - name: "space_available"
      condition: "target_space_empty"
      message: "Space already occupied"
      coin: "space_token"
      cost: 0
  
  actions:
    - name: "place_mark"
      when: "valid_move"
      effect: "place_x_or_o"
      coin: "mark_token"
      cost: 0
  
  win_conditions:
    - type: "three_in_row"
      condition: "three_same_mark_in_line"
    - type: "stalemate"
      condition: "board_full"
  
  phases:
    main:
      - "select_space"
      - "validate_move"
      - "place_mark"
      - "check_win"
      - "next_turn"
```

## Key Design Principles

1. **Separation of Concerns**: Rules, state, and flow are separate
2. **Composability**: Rules can be combined without conflicts
3. **Declarative**: Focus on what, not how
4. **Testable**: Each rule can be unit tested
5. **Extensible**: Easy to add new rule types
6. **Human-readable**: Game designers can write it
7. **Machine-executable**: Computers can run it
8. **Coin Economy**: Simple token system for complex interactions

This approach treats board games as **finite state machines with complex transition rules**, making them both human-understandable and machine-executable. The coin system allows for elegant handling of complex game mechanics without overloading the language. 