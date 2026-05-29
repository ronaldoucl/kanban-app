import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { BoardService, Board, Card, Column } from '../../core/services/board.service';
import { SocketService, CardMovedPayload } from '../../core/services/socket.service';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { ColumnComponent, AddCardEvent } from './column.component';
import { extractBoardId } from './board-url.util';

@Component({
  selector: 'app-board-detail',
  standalone: true,
  imports: [DragDropModule, ColumnComponent, NavbarComponent],
  templateUrl: './board-detail.component.html',
  styleUrl: './board-detail.component.scss'
})
export class BoardDetailComponent implements OnInit, OnDestroy {
  private boardSvc = inject(BoardService);
  private socketSvc = inject(SocketService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  board = signal<Board | null>(null);
  loading = signal(true);

  /** IDs de todas las columnas; usado para conectar las listas de cards (DnD). */
  columnIds = computed(() => this.board()?.columns.map(col => col.id) ?? []);

  /** Resumen ligero de columnas para alimentar el menú "Mover a…" de cada
   *  card sin pasar el árbol completo de tarjetas. */
  columnSummaries = computed(
    () => this.board()?.columns.map(col => ({ id: col.id, title: col.title })) ?? []
  );

  /** Mobile (lista vertical) vs. Kanban horizontal. Se sincroniza con el
   *  mismo breakpoint del CSS (767px) para que UI y lógica no se desfasen
   *  (orientación del drag de columnas, drag de cards deshabilitado, etc.). */
  isMobile = signal(false);
  private mql: MediaQueryList | null =
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)')
      : null;
  private onMqlChange = (e: MediaQueryListEvent): void =>
    this.isMobile.set(e.matches);

  // Gestión de columnas
  activeColumnMenuId = signal<string | null>(null);
  editingColumnId = signal<string | null>(null);
  editingColumnName = signal<string>('');
  showNewColumnInput = signal<boolean>(false);
  newColumnName = signal<string>('');

  private boardId = '';
  /** ID de la última card movida localmente para evitar aplicar el eco del socket. */
  private lastMovedCardId: string | null = null;
  private socketSub: Subscription | null = null;

  ngOnInit(): void {
    if (this.mql) {
      this.isMobile.set(this.mql.matches);
      this.mql.addEventListener('change', this.onMqlChange);
    }

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
    this.mql?.removeEventListener('change', this.onMqlChange);
    this.socketSub?.unsubscribe();
    this.socketSvc.disconnect();
  }

  goBack(): void {
    this.router.navigate(['/boards']);
  }

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

  /**
   * Alternativa táctil al drag&drop (mobile): mueve una card al final de
   * otra columna desde el menú "Mover a…". Replica el flujo de onDrop:
   * update optimista, persistencia y emisión por socket con rollback.
   */
  onCardMoved(payload: { cardId: string; targetColumnId: string }): void {
    const current = this.board();
    if (!current) return;

    let card: Card | undefined;
    let srcColId: string | undefined;
    for (const col of current.columns) {
      const found = col.cards.find(c => c.id === payload.cardId);
      if (found) { card = found; srcColId = col.id; break; }
    }

    const target = current.columns.find(c => c.id === payload.targetColumnId);
    if (!card || !srcColId || !target || srcColId === target.id) return;

    const newPosition = target.cards.length; // se agrega al final del destino
    const movedCard = card;
    const snapshot = current;

    this.updateBoard(board => ({
      ...board,
      columns: board.columns.map(col => {
        if (col.id === srcColId) {
          return { ...col, cards: col.cards.filter(c => c.id !== movedCard.id) };
        }
        if (col.id === target.id) {
          return {
            ...col,
            cards: [
              ...col.cards,
              { ...movedCard, columnId: target.id, order: newPosition },
            ],
          };
        }
        return col;
      }),
    }));

    this.lastMovedCardId = movedCard.id;

    this.boardSvc.updateCardPosition(movedCard.id, target.id, newPosition).subscribe({
      next: () => {
        this.socketSvc.emitCardMoved({
          boardId: this.boardId,
          cardId: movedCard.id,
          newColumnId: target.id,
          newPosition,
        });
      },
      error: () => {
        this.lastMovedCardId = null;
        this.board.set(snapshot);
      },
    });
  }

  // ---- Gestión de columnas ----

  toggleColumnMenu(columnId: string, event: Event): void {
    event.stopPropagation();
    this.activeColumnMenuId.set(this.activeColumnMenuId() === columnId ? null : columnId);
  }

  startRenameColumn(column: Column, event: Event): void {
    event.stopPropagation();
    this.editingColumnId.set(column.id);
    this.editingColumnName.set(column.title);
    this.activeColumnMenuId.set(null);
  }

  confirmRenameColumn(columnId: string): void {
    const name = this.editingColumnName().trim();
    if (!name) {
      this.cancelRenameColumn();
      return;
    }

    this.boardSvc.renameColumn(this.boardId, columnId, name).subscribe({
      next: () => {
        this.updateBoard(board => ({
          ...board,
          columns: board.columns.map(col =>
            col.id === columnId ? { ...col, title: name } : col
          )
        }));
        this.editingColumnId.set(null);
      },
      // Si falla, se mantiene el modo edición para que el usuario reintente.
      error: () => {}
    });
  }

  cancelRenameColumn(): void {
    this.editingColumnId.set(null);
  }

  deleteColumn(columnId: string): void {
    this.activeColumnMenuId.set(null);

    // Optimista: quitamos la columna de inmediato y restauramos si la API falla.
    const snapshot = this.board();
    this.updateBoard(board => ({
      ...board,
      columns: board.columns.filter(col => col.id !== columnId)
    }));

    this.boardSvc.deleteColumn(this.boardId, columnId).subscribe({
      error: () => this.board.set(snapshot)
    });
  }

  addColumn(): void {
    const name = this.newColumnName().trim();
    if (!name) return;

    this.boardSvc.createColumn(this.boardId, name).subscribe({
      next: newColumn => {
        this.updateBoard(board => ({
          ...board,
          // La nueva columna se agrega al final del tablero.
          columns: [...board.columns, { ...newColumn, cards: newColumn.cards ?? [] }]
        }));
        this.newColumnName.set('');
        this.showNewColumnInput.set(false);
      },
      // Si falla, se conserva el texto y el formulario abierto para reintentar.
      error: () => {}
    });
  }

  onColumnDrop(event: CdkDragDrop<Column[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const snapshot = this.board();

    this.updateBoard(board => {
      const columns = [...board.columns];
      moveItemInArray(columns, event.previousIndex, event.currentIndex);
      // El índice visual pasa a ser el nuevo valor de order (0-based).
      return { ...board, columns: columns.map((col, index) => ({ ...col, order: index })) };
    });

    const columns = this.board()!.columns.map((col, index) => ({ id: col.id, order: index }));
    this.boardSvc.reorderColumns(this.boardId, columns).subscribe({
      error: () => this.board.set(snapshot)
    });
  }

  @HostListener('document:click')
  closeColumnMenu(): void {
    this.activeColumnMenuId.set(null);
  }
}
