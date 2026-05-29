import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Card {
  id: string;
  title: string;
  description: string | null;
  order: number;
  /** Número de tarea secuencial por tablero (se muestra como KAN-{number}). */
  number: number;
  columnId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  title: string;
  order: number;
  boardId: string;
  cards: Card[];
}

export interface Board {
  id: string;
  title: string;
  ownerId: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  data: T;
  error: string | null;
  message: string | null;
}

@Injectable({ providedIn: 'root' })
export class BoardService {
  private readonly apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getBoards(): Observable<Board[]> {
    return this.http
      .get<ApiResponse<Board[]>>(`${this.apiUrl}/boards`)
      .pipe(map(res => res.data));
  }

  getBoardById(id: string): Observable<Board> {
    return this.http
      .get<ApiResponse<Board>>(`${this.apiUrl}/boards/${id}`)
      .pipe(map(res => res.data));
  }

  createBoard(title: string): Observable<Board> {
    return this.http
      .post<ApiResponse<Board>>(`${this.apiUrl}/boards`, { title })
      .pipe(map(res => res.data));
  }

  renameBoard(boardId: string, title: string): Observable<Board> {
    return this.http
      .patch<ApiResponse<Board>>(`${this.apiUrl}/boards/${boardId}`, { title })
      .pipe(map(res => res.data));
  }

  deleteBoard(boardId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.apiUrl}/boards/${boardId}`)
      .pipe(map(() => undefined));
  }

  createCard(title: string, columnId: string): Observable<Card> {
    return this.http
      .post<ApiResponse<Card>>(`${this.apiUrl}/cards`, { title, columnId })
      .pipe(map(res => res.data));
  }

  updateCardPosition(cardId: string, newColumnId: string, newPosition: number): Observable<Card> {
    return this.http
      .put<ApiResponse<Card>>(`${this.apiUrl}/cards/${cardId}`, {
        columnId: newColumnId,
        position: newPosition,
      })
      .pipe(map(res => res.data));
  }

  deleteCard(cardId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.apiUrl}/cards/${cardId}`)
      .pipe(map(() => undefined));
  }

  createColumn(boardId: string, name: string): Observable<Column> {
    return this.http
      .post<ApiResponse<Column>>(`${this.apiUrl}/boards/${boardId}/columns`, { name })
      .pipe(map(res => res.data));
  }

  renameColumn(boardId: string, columnId: string, name: string): Observable<Column> {
    return this.http
      .patch<ApiResponse<Column>>(`${this.apiUrl}/boards/${boardId}/columns/${columnId}`, { name })
      .pipe(map(res => res.data));
  }

  deleteColumn(boardId: string, columnId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.apiUrl}/boards/${boardId}/columns/${columnId}`)
      .pipe(map(() => undefined));
  }

  reorderColumns(boardId: string, columns: { id: string; order: number }[]): Observable<void> {
    return this.http
      .patch<ApiResponse<null>>(`${this.apiUrl}/boards/${boardId}/columns/reorder`, { columns })
      .pipe(map(() => undefined));
  }
}
