import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CdkDrag, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { Card } from '../../core/services/board.service';

interface ColumnSummary {
  id: string;
  title: string;
}

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CdkDrag, CdkDragPlaceholder],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  @Input({ required: true }) card!: Card;
  /** Columnas disponibles como destino del menú "Mover a…" (alternativa
   *  táctil al drag&drop en mobile). */
  @Input() columns: ColumnSummary[] = [];
  /** En mobile el drag se desactiva en favor del menú de acciones. */
  @Input() dragDisabled = false;

  @Output() cardDeleted = new EventEmitter<string>();
  @Output() cardMoved = new EventEmitter<{
    cardId: string;
    targetColumnId: string;
  }>();

  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  menuOpen = signal(false);

  /** Columnas distintas a la actual: posibles destinos de la tarjeta. */
  moveTargets = computed(() =>
    this.columns.filter((c) => c.id !== this.card.columnId)
  );

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  moveTo(targetColumnId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.cardMoved.emit({ cardId: this.card.id, targetColumnId });
    this.menuOpen.set(false);
  }

  remove(event: MouseEvent): void {
    event.stopPropagation();
    this.cardDeleted.emit(this.card.id);
    this.menuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (this.menuOpen() && !this.host.nativeElement.contains(target)) {
      this.menuOpen.set(false);
    }
  }
}
