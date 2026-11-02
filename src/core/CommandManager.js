export class Command {
  constructor(commandType) {
    this.commandType = commandType;
    this.timestamp = Date.now();
  }

  execute() {
    throw new Error('execute() must be implemented by a concrete command.');
  }

  undo() {
    throw new Error('undo() must be implemented by a concrete command.');
  }

  redo(stateManager) {
    this.execute(stateManager);
  }

  getSummary() {
    return this.commandType;
  }
}

export class PlaceTileCommand extends Command {
  constructor(row, col, tileType, variantId = 'classic') {
    super('PlaceTile');
    this.row = row;
    this.col = col;
    this.tileType = tileType;
    this.variantId = variantId;
    this.previousTileType = null;
    this.previousVariantId = null;
  }

  execute(stateManager) {
    this.previousTileType = stateManager.getTile(this.row, this.col);
    this.previousVariantId = stateManager.getTileVariant(this.row, this.col);
    return stateManager.setTile(this.row, this.col, this.tileType, this.variantId);
  }

  undo(stateManager) {
    stateManager.setTile(this.row, this.col, this.previousTileType, this.previousVariantId || 'classic');
  }

  getSummary() {
    return `Place ${this.tileType} at (${this.col}, ${this.row})`;
  }
}

export class RemoveTileCommand extends Command {
  constructor(row, col) {
    super('RemoveTile');
    this.row = row;
    this.col = col;
    this.previousTileType = null;
  }

  execute(stateManager) {
    this.previousTileType = stateManager.getTile(this.row, this.col);
    this.previousVariantId = stateManager.getTileVariant(this.row, this.col);
    return stateManager.setTile(this.row, this.col, null);
  }

  undo(stateManager) {
    stateManager.setTile(this.row, this.col, this.previousTileType, this.previousVariantId || 'classic');
  }

  getSummary() {
    return `Erase tile at (${this.col}, ${this.row})`;
  }
}

export class MoveTilesCommand extends Command {
  constructor(cells, deltaRow, deltaCol) {
    super('MoveTiles');
    this.cells = cells.map(cell => ({ ...cell }));
    this.deltaRow = deltaRow;
    this.deltaCol = deltaCol;
    this.previousState = null;
    this.nextState = null;
  }

  execute(stateManager) {
    this.previousState ||= stateManager.getWorldSnapshot();
    const destinations = this.cells.map(cell => ({
      row: cell.row + this.deltaRow,
      col: cell.col + this.deltaCol
    }));
    const moving = new Set(this.cells.map(cell => `${cell.row}:${cell.col}`));
    if (destinations.some(cell =>
      cell.row < 0 || cell.row >= stateManager.rows ||
      cell.col < 0 || cell.col >= stateManager.cols ||
      (stateManager.getTile(cell.row, cell.col) &&
        !moving.has(`${cell.row}:${cell.col}`))
    )) return false;
    if (this.deltaRow === 0 && this.deltaCol === 0) return false;

    const movedCells = this.cells.map(cell => ({
      ...cell,
      tileType: stateManager.getTile(cell.row, cell.col),
      variantId: stateManager.getTileVariant(cell.row, cell.col)
    }));
    if (movedCells.some(cell => !cell.tileType)) return false;
    const endpointMoves = new Map(movedCells.map((cell, index) => [
      `${cell.row}:${cell.col}`,
      destinations[index]
    ]));
    const pipeLinks = stateManager.pipeLinks.map(link => ({
      source: endpointMoves.get(`${link.source.row}:${link.source.col}`) || link.source,
      destination: endpointMoves.get(`${link.destination.row}:${link.destination.col}`) || link.destination
    }));
    for (const cell of movedCells) stateManager.setTile(cell.row, cell.col, null);
    movedCells.forEach((cell, index) => {
      const destination = destinations[index];
      stateManager.setTile(destination.row, destination.col, cell.tileType, cell.variantId);
    });
    stateManager.pipeLinks = pipeLinks;
    this.nextState = stateManager.getWorldSnapshot();
    return true;
  }

  undo(stateManager) {
    stateManager.restoreWorld(this.previousState);
  }

  redo(stateManager) {
    stateManager.restoreWorld(this.nextState);
  }

  getSummary() {
    return `Move ${this.cells.length === 1 ? 'object' : 'pipe'} on the board`;
  }
}

export class SetPipeLinksCommand extends Command {
  constructor(pipeLinks) {
    super('SetPipeLinks');
    this.pipeLinks = pipeLinks.map(link => ({
      source: { ...link.source },
      destination: { ...link.destination }
    }));
    this.previousLinks = null;
  }

  execute(stateManager) {
    this.previousLinks ||= stateManager.pipeLinks.map(link => ({
      source: { ...link.source },
      destination: { ...link.destination }
    }));
    if (JSON.stringify(this.previousLinks) === JSON.stringify(this.pipeLinks)) return false;
    stateManager.validateWorld({
      ...stateManager.getWorldSnapshot(),
      pipeLinks: this.pipeLinks
    });
    stateManager.pipeLinks = this.pipeLinks.map(link => ({
      source: { ...link.source },
      destination: { ...link.destination }
    }));
    return true;
  }

  undo(stateManager) {
    stateManager.pipeLinks = this.previousLinks.map(link => ({
      source: { ...link.source },
      destination: { ...link.destination }
    }));
  }

  redo(stateManager) {
    stateManager.pipeLinks = this.pipeLinks.map(link => ({
      source: { ...link.source },
      destination: { ...link.destination }
    }));
  }

  getSummary() {
    return this.pipeLinks.length ? 'Connect pipes' : 'Remove pipe connections';
  }
}

export class SetTileVariantCommand extends Command {
  constructor(tileType, variantId, variantName = variantId) {
    super('SetTileVariant');
    this.tileType = tileType;
    this.variantId = variantId;
    this.variantName = variantName;
    this.previousVariants = [];
  }

  execute(stateManager) {
    this.previousVariants = [];
    for (let row = 0; row < stateManager.rows; row++) {
      for (let col = 0; col < stateManager.cols; col++) {
        if (stateManager.getTile(row, col) !== this.tileType) continue;
        const previousVariantId = stateManager.getTileVariant(row, col);
        if (previousVariantId === this.variantId) continue;
        this.previousVariants.push({ row, col, variantId: previousVariantId });
        stateManager.setTileVariant(row, col, this.variantId);
      }
    }
    return this.previousVariants.length > 0;
  }

  undo(stateManager) {
    for (const cell of this.previousVariants) {
      stateManager.setTileVariant(cell.row, cell.col, cell.variantId);
    }
  }

  getSummary() {
    return `Change ${this.tileType} appearance to ${this.variantName}`;
  }
}

export class ResizeWorldCommand extends Command {
  constructor(newCols, newRows) {
    super('ResizeWorld');
    this.newCols = newCols;
    this.newRows = newRows;
    this.previousState = null;
  }

  execute(stateManager) {
    this.previousState ||= stateManager.getWorldSnapshot();
    stateManager.resizeWorld(this.newCols, this.newRows);
    return true;
  }

  undo(stateManager) {
    stateManager.restoreWorld(this.previousState);
  }

  redo(stateManager) {
    stateManager.resizeWorld(this.newCols, this.newRows);
  }

  getSummary() {
    return `Resize world to ${this.newCols} × ${this.newRows}`;
  }
}

export class ClearGridCommand extends Command {
  constructor() {
    super('ClearGrid');
    this.previousState = null;
  }

  execute(stateManager) {
    this.previousState ||= stateManager.getWorldSnapshot();
    stateManager.clearGrid();
    return true;
  }

  undo(stateManager) {
    stateManager.restoreWorld(this.previousState);
  }

  redo(stateManager) {
    stateManager.clearGrid();
  }

  getSummary() {
    return 'Clear level';
  }
}

export class CommandManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 100;
  }

  execute(command) {
    throw new Error('Pass a StateManager to executeWithManager().');
  }

  undo() {
    throw new Error('Pass a StateManager to undoWithManager().');
  }

  redo() {
    throw new Error('Pass a StateManager to redoWithManager().');
  }

  executeWithManager(command, stateManager) {
    if (!command.execute(stateManager)) return false;
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
    return true;
  }

  undoWithManager(stateManager) {
    const command = this.undoStack.pop();
    if (!command) return false;
    command.undo(stateManager);
    this.redoStack.push(command);
    return true;
  }

  redoWithManager(stateManager) {
    const command = this.redoStack.pop();
    if (!command) return false;
    command.redo(stateManager);
    this.undoStack.push(command);
    return true;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  getUndoCount() {
    return this.undoStack.length;
  }

  getRedoCount() {
    return this.redoStack.length;
  }

  getLastCommandSummary() {
    return this.undoStack.at(-1)?.getSummary() || null;
  }

  clearHistory() {
    this.undoStack = [];
    this.redoStack = [];
  }

  getHistory() {
    return {
      undo: this.undoStack.map(command => command.getSummary()),
      redo: this.redoStack.map(command => command.getSummary())
    };
  }
}
