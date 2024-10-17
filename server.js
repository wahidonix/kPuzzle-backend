const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

class PuzzleState {
  constructor(board, parent = null, move = null) {
    this.board = board;
    this.parent = parent;
    this.move = move;
    this.g = parent ? parent.g + 1 : 0;
    this.h = 0;
    this.f = 0;
  }

  getId() {
    return this.board.flat().join(',');
  }

  isGoal() {
    return this.getId() === '1,2,3,4,5,6,7,8,0';
  }

  getNeighbors() {
    const neighbors = [];
    const [x, y] = this.findZero();
    const moves = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    for (const [dx, dy] of moves) {
      const newX = x + dx, newY = y + dy;
      if (newX >= 0 && newX < 3 && newY >= 0 && newY < 3) {
        const newBoard = this.board.map(row => [...row]);
        [newBoard[x][y], newBoard[newX][newY]] = [newBoard[newX][newY], newBoard[x][y]];
        neighbors.push(new PuzzleState(newBoard, this, [dx, dy]));
      }
    }
    return neighbors;
  }

  findZero() {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.board[i][j] === 0) return [i, j];
      }
    }
  }
}

function hammingDistance(state) {
  return state.board.flat().filter((tile, index) => tile !== 0 && tile !== index + 1).length;
}

function manhattanDistance(state) {
  let distance = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const tile = state.board[i][j];
      if (tile !== 0) {
        const [goalX, goalY] = [(tile - 1) / 3 | 0, (tile - 1) % 3];
        distance += Math.abs(goalX - i) + Math.abs(goalY - j);
      }
    }
  }
  return distance;
}

function bfs(initialState) {
    console.log('Starting BFS');
    const frontier = [initialState];
    const explored = new Set();
    let iterations = 0;
  
    while (frontier.length > 0) {
      iterations++;
      if (iterations % 1000 === 0) {
        console.log(`BFS: ${iterations} iterations, frontier size: ${frontier.length}`);
      }
  
      const state = frontier.shift();
      if (state.isGoal()) {
        console.log(`BFS found solution in ${iterations} iterations`);
        return reconstructPath(state);
      }
  
      explored.add(state.getId());
  
      for (const neighbor of state.getNeighbors()) {
        if (!explored.has(neighbor.getId())) {
          frontier.push(neighbor);
          explored.add(neighbor.getId());
        }
      }
    }
    console.log(`BFS terminated after ${iterations} iterations without finding a solution`);
    return null;
  }
  
  function bestFirstSearch(initialState, heuristic) {
    console.log('Starting Best-First Search');
    const frontier = [initialState];
    const explored = new Set();
    let iterations = 0;
  
    while (frontier.length > 0) {
      iterations++;
      if (iterations % 1000 === 0) {
        console.log(`Best-First: ${iterations} iterations, frontier size: ${frontier.length}`);
      }
  
      const state = frontier.shift();
      if (state.isGoal()) {
        console.log(`Best-First found solution in ${iterations} iterations`);
        return reconstructPath(state);
      }
  
      explored.add(state.getId());
  
      const neighbors = state.getNeighbors();
      for (const neighbor of neighbors) {
        if (!explored.has(neighbor.getId())) {
          neighbor.h = heuristic(neighbor);
          const index = frontier.findIndex(s => s.h > neighbor.h);
          if (index === -1) {
            frontier.push(neighbor);
          } else {
            frontier.splice(index, 0, neighbor);
          }
        }
      }
    }
    console.log(`Best-First terminated after ${iterations} iterations without finding a solution`);
    return null;
  }
  
  function aStar(initialState, heuristic) {
    console.log('Starting A*');
    const frontier = [initialState];
    const explored = new Set();
    let iterations = 0;
  
    while (frontier.length > 0) {
      iterations++;
      if (iterations % 1000 === 0) {
        console.log(`A*: ${iterations} iterations, frontier size: ${frontier.length}`);
      }
  
      const state = frontier.shift();
      if (state.isGoal()) {
        console.log(`A* found solution in ${iterations} iterations`);
        return reconstructPath(state);
      }
  
      explored.add(state.getId());
  
      const neighbors = state.getNeighbors();
      for (const neighbor of neighbors) {
        if (!explored.has(neighbor.getId())) {
          neighbor.h = heuristic(neighbor);
          neighbor.f = neighbor.g + neighbor.h;
          const index = frontier.findIndex(s => s.f > neighbor.f);
          if (index === -1) {
            frontier.push(neighbor);
          } else {
            frontier.splice(index, 0, neighbor);
          }
        }
      }
    }
    console.log(`A* terminated after ${iterations} iterations without finding a solution`);
    return null;
  }
  
  function reconstructPath(state) {
    const path = [];
    while (state.parent) {
      path.unshift(state.move);
      state = state.parent;
    }
    return path;
  }
  
  app.post('/solve', (req, res) => {
 
    const { puzzle, algorithm, heuristic } = req.body;
    const initialState = new PuzzleState(puzzle);
    let solution;
  
    console.log(`Solving puzzle using ${algorithm} algorithm`);
    if (algorithm === 'bestFirst' || algorithm === 'aStar') {
      console.log(`Using ${heuristic} heuristic`);
    }
  
    const startTime = process.hrtime();
  
    switch (algorithm) {
      case 'bfs':
        solution = bfs(initialState);
        break;
      case 'bestFirst':
        solution = bestFirstSearch(initialState, heuristic === 'hamming' ? hammingDistance : manhattanDistance);
        break;
      case 'aStar':
        solution = aStar(initialState, heuristic === 'hamming' ? hammingDistance : manhattanDistance);
        break;
      default:
        console.log('Invalid algorithm specified');
        return res.status(400).json({ error: 'Invalid algorithm' });
    }
  
    const endTime = process.hrtime(startTime);
    const executionTime = (endTime[0] * 1000 + endTime[1] / 1e6).toFixed(2);
  
    if (solution) {
      console.log(`Solution found in ${executionTime}ms`);
      console.log(`Number of moves: ${solution.length}`);
      res.json({ solution });
    } else {
      console.log(`No solution found after ${executionTime}ms`);
      res.status(404).json({ error: 'No solution found' });
    }
  });
  
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  