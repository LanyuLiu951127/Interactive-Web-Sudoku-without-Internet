from flask import Flask, jsonify, request, send_from_directory
import random

app = Flask(__name__, static_folder='../frontend', static_url_path='')

class SudokuGenerator:
    def __init__(self):
        self.board = [[0 for _ in range(9)] for _ in range(9)]

    def is_valid(self, board, row, col, num):
        # Check row
        for x in range(9):
            if board[row][x] == num:
                return False
        # Check column
        for x in range(9):
            if board[x][col] == num:
                return False
        # Check 3x3 box
        start_row, start_col = 3 * (row // 3), 3 * (col // 3)
        for i in range(3):
            for j in range(3):
                if board[i + start_row][j + start_col] == num:
                    return False
        return True

    def solve(self, board):
        for row in range(9):
            for col in range(9):
                if board[row][col] == 0:
                    nums = list(range(1, 10))
                    random.shuffle(nums)
                    for num in nums:
                        if self.is_valid(board, row, col, num):
                            board[row][col] = num
                            if self.solve(board):
                                return True
                            board[row][col] = 0
                    return False
        return True

    def generate_puzzle(self, difficulty):
        # 1. Generate full board
        self.board = [[0 for _ in range(9)] for _ in range(9)]
        self.solve(self.board)
        solution = [row[:] for row in self.board]

        # 2. Remove numbers based on difficulty
        if difficulty == "easy":
            attempts = 81 - random.randint(40, 45)
        elif difficulty == "medium":
            attempts = 81 - random.randint(30, 35)
        else: # hard
            attempts = 81 - random.randint(22, 28)

        puzzle = [row[:] for row in solution]
        while attempts > 0:
            row = random.randint(0, 8)
            col = random.randint(0, 8)
            if puzzle[row][col] != 0:
                puzzle[row][col] = 0
                attempts -= 1
        
        return puzzle, solution

generator = SudokuGenerator()

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/game', methods=['GET'])
def get_game():
    difficulty = request.args.get('difficulty', 'easy')
    puzzle, solution = generator.generate_puzzle(difficulty)
    return jsonify({
        "status": "success",
        "data": {
            "puzzle": puzzle,
            "solution": solution,
            "difficulty": difficulty
        }
    })

@app.route('/api/solve', methods=['POST'])
def solve_puzzle():
    data = request.json
    puzzle = data.get('puzzle')
    if not puzzle:
        return jsonify({"status": "error", "message": "No puzzle provided"}), 400
    
    # Create a copy to solve
    board_to_solve = [row[:] for row in puzzle]
    if generator.solve(board_to_solve):
        return jsonify({
            "status": "success",
            "data": {
                "solution": board_to_solve
            }
        })
    else:
        return jsonify({"status": "error", "message": "Unsolvable puzzle"}), 400

if __name__ == '__main__':
    try:
        from flask_cors import CORS
        CORS(app)
    except ImportError:
        pass
    app.run(debug=True, port=5000)
