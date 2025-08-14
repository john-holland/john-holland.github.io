// Board Game Language in Ink
// A narrative approach to game rules and coin systems

VAR coins = LIST()
VAR castle_token = 0
VAR en_passant_token = 0
VAR queen_token = 0

VAR current_state = "setup"
VAR game_phase = "main"

// Game state tracking
VAR board = LIST()
VAR pieces = LIST()
VAR turn = 1
VAR player = "white"

// Rule tracking
VAR triggers_fired = LIST()
VAR actions_available = LIST()
VAR constraints_active = LIST()

// === GAME INITIALIZATION ===
~ function initialize_game()
    ~ coins = LIST()
    ~ castle_token = 0
    ~ en_passant_token = 0
    ~ queen_token = 0
    ~ current_state = "setup"
    ~ game_phase = "main"
    ~ turn = 1
    ~ player = "white"
    ~ triggers_fired = LIST()
    ~ actions_available = LIST()
    ~ constraints_active = LIST()

// === COIN SYSTEM FUNCTIONS ===
~ function give_coins(coin_string)
    ~ temp coin_list = coin_string
    ~ temp coin_array = coin_list
    {coin_array:
        - castle_token: ~ castle_token++
        - en_passant_token: ~ en_passant_token++
        - queen_token: ~ queen_token++
    }

~ function can_pay_cost(cost_string)
    ~ temp cost_list = cost_string
    ~ temp cost_array = cost_list
    ~ temp can_pay = true
    {cost_array:
        - castle_token: ~ can_pay = can_pay && castle_token > 0
        - en_passant_token: ~ can_pay = can_pay && en_passant_token > 0
        - queen_token: ~ can_pay = can_pay && queen_token > 0
    }
    ~ return can_pay

~ function consume_coins(cost_string)
    ~ temp cost_list = cost_string
    ~ temp cost_array = cost_list
    {cost_array:
        - castle_token: ~ castle_token--
        - en_passant_token: ~ en_passant_token--
        - queen_token: ~ queen_token--
    }

// === RULE ENGINE ===
~ function check_triggers(move_type)
    {move_type:
        - pawn_moved_2:
            ~ give_coins("en_passant_token")
            ~ triggers_fired += "en_passant_enabled"
            -> TRIGGER_FIRED("Pawn moved 2 squares - En passant enabled!")
        - king_first_move:
            ~ give_coins("castle_token")
            ~ triggers_fired += "castling_enabled"
            -> TRIGGER_FIRED("King first move - Castling enabled!")
        - queen_first_move:
            ~ give_coins("castle_token queen_token")
            ~ triggers_fired += "queen_side_castling_enabled"
            -> TRIGGER_FIRED("Queen first move - Queen-side castling enabled!")
    }

~ function execute_action(action_name)
    {action_name:
        - en_passant:
            ? can_pay_cost("en_passant_token")
                ~ consume_coins("en_passant_token")
                -> ACTION_EXECUTED("En passant executed!")
            - else
                -> ACTION_FAILED("Not enough en_passant_token!")
        - advanced_castling:
            ? can_pay_cost("castle_token queen_token")
                ~ consume_coins("castle_token queen_token")
                -> ACTION_EXECUTED("Advanced castling executed!")
            - else
                -> ACTION_FAILED("Not enough castle_token and queen_token!")
    }

~ function check_constraint(constraint_name)
    {constraint_name:
        - castling_constraint:
            ? can_pay_cost("castle_token")
                ~ consume_coins("castle_token")
                -> CONSTRAINT_BYPASSED("Castling constraint bypassed with castle_token!")
            - else
                -> CONSTRAINT_BLOCKED("Cannot castle - need castle_token!")
        - queen_side_castling_constraint:
            ? can_pay_cost("castle_token queen_token")
                ~ consume_coins("castle_token queen_token")
                -> CONSTRAINT_BYPASSED("Queen-side castling constraint bypassed!")
            - else
                -> CONSTRAINT_BLOCKED("Cannot queen-side castle - need both tokens!")
    }

// === GAME FLOW ===
=== function game_loop ===
    {current_state:
        - setup:
            -> SETUP_PHASE
        - main:
            -> MAIN_PHASE
        - end:
            -> END_GAME
    }

=== SETUP_PHASE ===
    # Setup Phase
    Place pieces on the board.
    
    [Start Game] -> MAIN_PHASE

=== MAIN_PHASE ===
    # Main Game Phase
    Turn {turn} - {player}'s move
    
    Current coins:
    - Castle Token: {castle_token}
    - En Passant Token: {en_passant_token}
    - Queen Token: {queen_token}
    
    [Select Piece] -> SELECTING_PIECE
    [Move Piece] -> MOVING_PIECE
    [Check Triggers] -> CHECKING_TRIGGERS
    [Execute Actions] -> EXECUTING_ACTIONS
    [Check Constraints] -> CHECKING_CONSTRAINTS
    [Next Turn] -> NEXT_TURN

=== SELECTING_PIECE ===
    # Selecting Piece
    Choose a piece to move.
    
    [Back to Main] -> MAIN_PHASE

=== MOVING_PIECE ===
    # Moving Piece
    Moving piece...
    
    [Pawn moved 2 squares] -> check_triggers("pawn_moved_2") -> MAIN_PHASE
    [King first move] -> check_triggers("king_first_move") -> MAIN_PHASE
    [Queen first move] -> check_triggers("queen_first_move") -> MAIN_PHASE
    [Back to Main] -> MAIN_PHASE

=== CHECKING_TRIGGERS ===
    # Checking Triggers
    Triggers fired: {triggers_fired}
    
    [Back to Main] -> MAIN_PHASE

=== EXECUTING_ACTIONS ===
    # Executing Actions
    Available actions:
    
    [En Passant] -> execute_action("en_passant") -> MAIN_PHASE
    [Advanced Castling] -> execute_action("advanced_castling") -> MAIN_PHASE
    [Back to Main] -> MAIN_PHASE

=== CHECKING_CONSTRAINTS ===
    # Checking Constraints
    
    [Test Castling Constraint] -> check_constraint("castling_constraint") -> MAIN_PHASE
    [Test Queen-side Castling Constraint] -> check_constraint("queen_side_castling_constraint") -> MAIN_PHASE
    [Back to Main] -> MAIN_PHASE

=== NEXT_TURN ===
    ~ turn++
    ~ player = (player == "white") ? "black" : "white"
    -> MAIN_PHASE

// === TRIGGER RESPONSES ===
=== TRIGGER_FIRED ===
    {message}
    [Continue] -> MAIN_PHASE

=== ACTION_EXECUTED ===
    {message}
    [Continue] -> MAIN_PHASE

=== ACTION_FAILED ===
    {message}
    [Continue] -> MAIN_PHASE

=== CONSTRAINT_BYPASSED ===
    {message}
    [Continue] -> MAIN_PHASE

=== CONSTRAINT_BLOCKED ===
    {message}
    [Continue] -> MAIN_PHASE

=== END_GAME ===
    # Game Over
    Final coin counts:
    - Castle Token: {castle_token}
    - En Passant Token: {en_passant_token}
    - Queen Token: {queen_token}
    
    [Restart] -> initialize_game() -> game_loop

// === RULE DEFINITIONS (Narrative Style) ===
=== RULE_DEFINITIONS ===
    # Rule Definitions
    
    ## Triggers (When coins are awarded)
    - When a pawn moves 2 squares: Award 1 en_passant_token
    - When king makes first move: Award 1 castle_token
    - When queen makes first move: Award 1 castle_token AND 1 queen_token
    
    ## Actions (What costs coins)
    - En passant capture: Costs 1 en_passant_token
    - Advanced castling: Costs 1 castle_token AND 1 queen_token
    
    ## Constraints (What can be bypassed with coins)
    - Castling constraint: Can be bypassed with 1 castle_token
    - Queen-side castling constraint: Can be bypassed with 1 castle_token AND 1 queen_token
    
    [Back to Main] -> MAIN_PHASE

// === DEBUGGING ===
=== DEBUG_MODE ===
    # Debug Mode
    
    Current State: {current_state}
    Game Phase: {game_phase}
    Turn: {turn}
    Player: {player}
    
    Coins:
    - Castle Token: {castle_token}
    - En Passant Token: {en_passant_token}
    - Queen Token: {queen_token}
    
    Triggers Fired: {triggers_fired}
    Actions Available: {actions_available}
    Constraints Active: {constraints_active}
    
    [Back to Main] -> MAIN_PHASE
    [Reset Game] -> initialize_game() -> game_loop

// === START GAME ===
~ initialize_game()
-> game_loop 