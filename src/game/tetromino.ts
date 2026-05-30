export type TetrominoType = 'I' | 'O' | 'T' | 'L' | 'J' | 'S' | 'Z';

export interface Tetromino {
  type: TetrominoType;
  shape: number[][];
  color: string;
}

export const TETROMINOES: Record<TetrominoType, Tetromino> = {
  I: {
    type: 'I',
    shape: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]],

    color: '#00FFFF'
  },
  J: {
    type: 'J',
    shape: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]],

    color: '#0000FF'
  },
  L: {
    type: 'L',
    shape: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]],

    color: '#FFA500'
  },
  O: {
    type: 'O',
    shape: [
    [1, 1],
    [1, 1]],

    color: '#FFFF00'
  },
  S: {
    type: 'S',
    shape: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]],

    color: '#00FF00'
  },
  T: {
    type: 'T',
    shape: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]],

    color: '#800080'
  },
  Z: {
    type: 'Z',
    shape: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]],

    color: '#FF0000'
  }
};

export function rotateMatrix(matrix: number[][]): number[][] {
  const N = matrix.length;
  const result = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      result[c][N - 1 - r] = matrix[r][c];
    }
  }
  return result;
}