import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { AuthService } from '../../core/services/auth.service';
import { BoardService, Board, Card } from '../../core/services/board.service';
import { SocketService, CardMovedPayload } from '../../core/services/socket.service';
import { ColumnComponent, AddCardEvent } from './column.component';

@Component({
  selector: 'app-boards',
  standalone: true,
  imports: [DragDropModule, ColumnComponent],
  templateUrl: './boards.component.html',
  styleUrl: './boards.component.scss'
})
export class BoardsComponent implements OnInit, OnDestroy {
  private boardSvc = inject(BoardService);
  private auth = inject(AuthService);
  private socketSvc = inject(SocketService);

  boards = signal<Board[]>([]);
  loading = signal(true);
  creatingBoard = signal(false);

  /** Tablero cuyo menú contextual (⋯) está abierto, o null si ninguno. */
  activeMenuId = signal<string | null>(null);
  /** Tablero que se está renombrando en línea, o null. */
  editingBoardId = signal<string | null>(null);
  /** Valor en edición del input de renombrado. */
  editingName = signal<string>('');

  /** ID de la última card movida localmente para evitar aplicar el eco del socket. */
  private lastMovedCardId: string | null = null;
  private socketSub: Subscription | null = null;

  ngOnInit(): void {
    this.socketSvc.connect();

    this.boardSvc.getBoards().subscribe({
      next: boards => {
        this.boards.set(boards);
        this.loading.set(false);
        // Unirse a la sala de cada tablero cargado
        boards.forEach(b => this.socketSvc.joinBoard(b.id));
        this.listenToRemoteUpdates();
      },
      error: () => this.loading.set(false)
    });
  }

  ngOnDestroy(): void {
    this.socketSub?.unsubscribe();
    this.socketSvc.disconnect();
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
    this.boards.update(bs => bs.map(board => {
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
    }));
  }

  logout(): void { this.auth.logout(); }

  addBoard(title: string): void {
    const trimmed = title.trim();
    if (!trimmed) return;
    this.creatingBoard.set(false);
    this.boardSvc.createBoard(trimmed).subscribe(board => {
      this.boards.update(bs => [...bs, board]);
      this.socketSvc.joinBoard(board.id);
    });
  }

  toggleMenu(boardId: string, event: Event): void {
    event.stopPropagation();
    this.activeMenuId.set(this.activeMenuId() === boardId ? null : boardId);
  }

  startRename(board: Board, event: Event): void {
    event.stopPropagation();
    this.editingBoardId.set(board.id);
    this.editingName.set(board.title);
    this.activeMenuId.set(null);
  }

  confirmRename(boardId: string): void {
    const title = this.editingName().trim();
    if (!title) {
      this.cancelRename();
      return;
    }
    this.boardSvc.renameBoard(boardId, title).subscribe({
      next: () => {
        this.boards.update(bs => bs.map(b => (b.id === boardId ? { ...b, title } : b)));
        this.editingBoardId.set(null);
      }
    });
  }

  cancelRename(): void {
    this.editingBoardId.set(null);
  }

  deleteBoard(boardId: string): void {
    this.activeMenuId.set(null);
    const snapshot = this.boards();
    this.boards.update(bs => bs.filter(b => b.id !== boardId));
    this.boardSvc.deleteBoard(boardId).subscribe({
      error: () => this.boards.set(snapshot)
    });
  }

  @HostListener('document:click')
  closeMenu(): void {
    this.activeMenuId.set(null);
  }

  onCardAdded(event: AddCardEvent, board: Board): void {
    this.boardSvc.createCard(event.title, event.columnId).subscribe(newCard => {
      this.boards.update(bs => bs.map(b => {
        if (b.id !== board.id) return b;
        return {
          ...b,
          columns: b.columns.map(col =>
            col.id === event.columnId
              ? { ...col, cards: [...col.cards, newCard] }
              : col
          )
        };
      }));
    });
  }

  onCardDeleted(cardId: string, board: Board): void {
    const snapshot = this.boards();
    this.boards.update(bs => bs.map(b => {
      if (b.id !== board.id) return b;
      return {
        ...b,
        columns: b.columns.map(col => ({
          ...col,
          cards: col.cards.filter(c => c.id !== cardId)
        }))
      };
    }));

    this.boardSvc.deleteCard(cardId).subscribe({
      error: () => this.boards.set(snapshot)
    });
  }

  onDrop(event: CdkDragDrop<Card[]>, board: Board): void {
    const isSameColumn = event.previousContainer === event.container;
    if (isSameColumn && event.previousIndex === event.currentIndex) return;

    const snapshot = this.boards();
    const srcColId = event.previousContainer.id;
    const dstColId = event.container.id;
    const card = event.previousContainer.data[event.previousIndex];

    // Optimistic update
    this.boards.update(bs => bs.map(b => {
      if (b.id !== board.id) return b;
      return {
        ...b,
        columns: b.columns.map(col => {
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
      };
    }));

    // Marcar como movida localmente antes del request
    this.lastMovedCardId = card.id;

    this.boardSvc.updateCardPosition(card.id, dstColId, event.currentIndex).subscribe({
      next: () => {
        this.socketSvc.emitCardMoved({
          boardId: board.id,
          cardId: card.id,
          newColumnId: dstColId,
          newPosition: event.currentIndex,
        });
      },
      error: () => {
        this.lastMovedCardId = null;
        this.boards.set(snapshot);
      }
    });
  }
}
