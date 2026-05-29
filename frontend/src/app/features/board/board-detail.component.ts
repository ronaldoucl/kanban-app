import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { AuthService } from '../../core/services/auth.service';
import { BoardService, Board, Card } from '../../core/services/board.service';
import { SocketService, CardMovedPayload } from '../../core/services/socket.service';
import { ColumnComponent, AddCardEvent } from './column.component';
import { extractBoardId } from './board-url.util';

@Component({
  selector: 'app-board-detail',
  standalone: true,
  imports: [DragDropModule, ColumnComponent],
  templateUrl: './board-detail.component.html',
  styleUrl: './board-detail.component.scss'
})
export class BoardDetailComponent implements OnInit, OnDestroy {
  private boardSvc = inject(BoardService);
  private auth = inject(AuthService);
  private socketSvc = inject(SocketService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  board = signal<Board | null>(null);
  loading = signal(true);

  private boardId = '';
  /** ID de la última card movida localmente para evitar aplicar el eco del socket. */
  private lastMovedCardId: string | null = null;
  private socketSub: Subscription | null = null;

  ngOnInit(): void {
    const lookupId = extractBoardId(this.route.snapshot.paramMap.get('id') ?? '');

    this.socketSvc.connect();

    this.boardSvc.getBoardById(lookupId).subscribe({
      next: board => {
        this.board.set(board);
        // Usamos el id real del tablero para el socket, no el sufijo de la URL.
        this.boardId = board.id;
        this.loading.set(false);
        this.socketSvc.joinBoard(board.id);
        this.listenToRemoteUpdates();
      },
      error: () => this.loading.set(false)
    });
  }

  ngOnDestroy(): void {
    this.socketSub?.unsubscribe();
    this.socketSvc.disconnect();
  }

  goBack(): void {
    this.router.navigate(['/boards']);
  }

  logout(): void { this.auth.logout(); }

  private updateBoard(fn: (board: Board) => Board): void {
    this.board.update(b => (b ? fn(b) : b));
  }

  private listenToRemoteUpdates(): void {
    this.socketSub = this.socketSvc.onCardUpdated().subscribe(payload => {
      // El backend usa socket.to() que excluye al emisor, pero aplicamos
      // el guard de todas formas por si la lógica de red varía.
      if (payload.cardId === this.lastMovedCardId) {
        this.lastMovedCardId = null;
        return;
      }
      this.applyRemoteMove(payload);
    });
  }

  private applyRemoteMove(payload: CardMovedPayload): void {
    this.updateBoard(board => {
      // Buscar la card en cualquier columna del tablero
      let movedCard: Card | undefined;
      let srcColId: string | undefined;

      for (const col of board.columns) {
        const found = col.cards.find(c => c.id === payload.cardId);
        if (found) { movedCard = found; srcColId = col.id; break; }
      }

      if (!movedCard) return board; // la card no pertenece a este tablero

      return {
        ...board,
        columns: board.columns.map(col => {
          if (col.id === srcColId) {
            return { ...col, cards: col.cards.filter(c => c.id !== payload.cardId) };
          }
          if (col.id === payload.newColumnId) {
            const cards = [...col.cards];
            cards.splice(payload.newPosition, 0, { ...movedCard!, columnId: payload.newColumnId, order: payload.newPosition });
            return { ...col, cards };
          }
          return col;
        })
      };
    });
  }

  onCardAdded(event: AddCardEvent): void {
    this.boardSvc.createCard(event.title, event.columnId).subscribe(newCard => {
      this.updateBoard(board => ({
        ...board,
        columns: board.columns.map(col =>
          col.id === event.columnId
            ? { ...col, cards: [...col.cards, newCard] }
            : col
        )
      }));
    });
  }

  onCardDeleted(cardId: string): void {
    const snapshot = this.board();
    this.updateBoard(board => ({
      ...board,
      columns: board.columns.map(col => ({
        ...col,
        cards: col.cards.filter(c => c.id !== cardId)
      }))
    }));

    this.boardSvc.deleteCard(cardId).subscribe({
      error: () => this.board.set(snapshot)
    });
  }

  onDrop(event: CdkDragDrop<Card[]>): void {
    const isSameColumn = event.previousContainer === event.container;
    if (isSameColumn && event.previousIndex === event.currentIndex) return;

    const snapshot = this.board();
    const srcColId = event.previousContainer.id;
    const dstColId = event.container.id;
    const card = event.previousContainer.data[event.previousIndex];

    // Optimistic update
    this.updateBoard(board => ({
      ...board,
      columns: board.columns.map(col => {
        if (isSameColumn && col.id === srcColId) {
          const cards = [...col.cards];
          moveItemInArray(cards, event.previousIndex, event.currentIndex);
          // Recalcular order para que coincida con la posición visual (0-based)
          return { ...col, cards: cards.map((c, index) => ({ ...c, order: index })) };
        }
        if (!isSameColumn && col.id === srcColId) {
          const cards = [...col.cards];
          cards.splice(event.previousIndex, 1);
          return { ...col, cards };
        }
        if (!isSameColumn && col.id === dstColId) {
          const cards = [...col.cards];
          cards.splice(event.currentIndex, 0, { ...card, columnId: dstColId });
          return { ...col, cards };
        }
        return col;
      })
    }));

    // Marcar como movida localmente antes del request
    this.lastMovedCardId = card.id;

    this.boardSvc.updateCardPosition(card.id, dstColId, event.currentIndex).subscribe({
      next: () => {
        this.socketSvc.emitCardMoved({
          boardId: this.boardId,
          cardId: card.id,
          newColumnId: dstColId,
          newPosition: event.currentIndex,
        });
      },
      error: () => {
        this.lastMovedCardId = null;
        this.board.set(snapshot);
      }
    });
  }
}
