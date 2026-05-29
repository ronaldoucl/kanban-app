import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { CardComponent } from './card.component';
import { Column, Card } from '../../core/services/board.service';

export interface AddCardEvent {
  columnId: string;
  title: string;
}

@Component({
  selector: 'app-column',
  standalone: true,
  imports: [CdkDropList, CdkDragHandle, CardComponent],
  templateUrl: './column.component.html',
  styleUrl: './column.component.scss'
})
export class ColumnComponent {
  @Input({ required: true }) column!: Column;
  /** IDs de las listas de cards a las que se conecta esta columna (DnD entre columnas). */
  @Input() connectedTo: string[] = [];
  /** Si el menú contextual de esta columna está abierto. */
  @Input() activeMenu = false;
  /** Si esta columna está en modo edición de nombre. */
  @Input() isEditing = false;
  /** Valor actual del input de renombrado (controlado por el padre). */
  @Input() editingName = '';

  @Output() cardAdded = new EventEmitter<AddCardEvent>();
  @Output() cardDeleted = new EventEmitter<string>();
  @Output() dropped = new EventEmitter<CdkDragDrop<Card[]>>();

  @Output() menuToggled = new EventEmitter<Event>();
  @Output() renameStarted = new EventEmitter<Event>();
  @Output() renameConfirmed = new EventEmitter<void>();
  @Output() renameCancelled = new EventEmitter<void>();
  @Output() columnDeleted = new EventEmitter<void>();
  @Output() editingNameChanged = new EventEmitter<string>();

  addingCard = signal(false);

  submitCard(title: string): void {
    const trimmed = title.trim();
    if (!trimmed) return;
    this.cardAdded.emit({ columnId: this.column.id, title: trimmed });
    this.addingCard.set(false);
  }
}
