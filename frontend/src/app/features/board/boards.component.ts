import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BoardService, Board } from '../../core/services/board.service';
import { buildBoardPath } from './board-url.util';

@Component({
  selector: 'app-boards',
  standalone: true,
  imports: [],
  templateUrl: './boards.component.html',
  styleUrl: './boards.component.scss'
})
export class BoardsComponent implements OnInit {
  private boardSvc = inject(BoardService);
  private auth = inject(AuthService);
  private router = inject(Router);

  boards = signal<Board[]>([]);
  loading = signal(true);
  creatingBoard = signal(false);

  /** Tablero cuyo menú contextual (⋯) está abierto, o null si ninguno. */
  activeMenuId = signal<string | null>(null);
  /** Tablero que se está renombrando en línea, o null. */
  editingBoardId = signal<string | null>(null);
  /** Valor en edición del input de renombrado. */
  editingName = signal<string>('');

  ngOnInit(): void {
    this.boardSvc.getBoards().subscribe({
      next: boards => {
        this.boards.set(boards);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  logout(): void { this.auth.logout(); }

  openBoard(board: Board): void {
    this.router.navigate(['/boards', buildBoardPath(board)]);
  }

  /** Cantidad total de tarjetas en el tablero (suma de todas sus columnas). */
  cardCount(board: Board): number {
    return board.columns.reduce((total, col) => total + col.cards.length, 0);
  }

  addBoard(title: string): void {
    const trimmed = title.trim();
    if (!trimmed) return;
    this.creatingBoard.set(false);
    this.boardSvc.createBoard(trimmed).subscribe(board => {
      this.boards.update(bs => [...bs, board]);
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
}
