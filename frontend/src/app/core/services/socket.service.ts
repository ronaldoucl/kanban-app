import { Injectable } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

export interface CardMovedPayload {
  boardId: string;
  cardId: string;
  newColumnId: string;
  newPosition: number;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private readonly serverUrl = environment.socketUrl;

  connect(): void {
    if (this.socket?.connected) return;
    this.socket = io(this.serverUrl, { transports: ['websocket'] });
  }

  joinBoard(boardId: string): void {
    this.socket?.emit('join-board', boardId);
  }

  emitCardMoved(payload: CardMovedPayload): void {
    this.socket?.emit('card-moved', payload);
  }

  onCardUpdated(): Observable<CardMovedPayload> {
    if (!this.socket) throw new Error('Socket no inicializado. Llamá connect() primero.');
    return fromEvent<CardMovedPayload>(this.socket, 'card-updated');
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
