import { Server, Socket } from 'socket.io';

interface CardMovedPayload {
  boardId: string;
  cardId: string;
  newColumnId: string;
  newPosition: number;
}

function registerBoardHandlers(socket: Socket): void {
  socket.on('join-board', (boardId: string) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('card-moved', (payload: CardMovedPayload) => {
    socket.to(`board:${payload.boardId}`).emit('card-updated', payload);
  });
}

export function initBoardSocket(io: Server): void {
  io.on('connection', (socket) => {
    registerBoardHandlers(socket);
  });
}
