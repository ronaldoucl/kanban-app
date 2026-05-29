import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { CardComponent } from './card.component';
import { Column, Card } from '../../core/services/board.service';

export interface AddCardEvent {
  columnId: string;
  title: string;
}

@Component({
  selector: 'app-column',
  standalone: true,
  imports: [CdkDropList, CardComponent],
  templateUrl: './column.component.html',
  styleUrl: './column.component.scss'
})
export class ColumnComponent {
  @Input({ required: true }) column!: Column;
  @Output() cardAdded = new EventEmitter<AddCardEvent>();
  @Output() cardDeleted = new EventEmitter<string>();
  @Output() dropped = new EventEmitter<CdkDragDrop<Card[]>>();

  addingCard = signal(false);

  submitCard(title: string): void {
    const trimmed = title.trim();
    if (!trimmed) return;
    this.cardAdded.emit({ columnId: this.column.id, title: trimmed });
    this.addingCard.set(false);
  }
}
