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
  template: `
    <div class="column">
      <h3 class="column-title">{{ column.title }}</h3>

      <div
        cdkDropList
        [id]="column.id"
        [cdkDropListData]="column.cards"
        class="cards-container"
        (cdkDropListDropped)="dropped.emit($event)"
      >
        @for (card of column.cards; track card.id) {
          <app-card [card]="card" (cardDeleted)="cardDeleted.emit($event)" />
        }
      </div>

      @if (addingCard()) {
        <div class="add-card-form">
          <input
            #cardInput
            type="text"
            placeholder="Título de la tarea"
            (keydown.enter)="submitCard(cardInput.value)"
            (keydown.escape)="addingCard.set(false)"
            autofocus
          />
          <div class="add-card-actions">
            <button (click)="submitCard(cardInput.value)">Agregar</button>
            <button class="cancel" (click)="addingCard.set(false)">Cancelar</button>
          </div>
        </div>
      } @else {
        <button class="add-card-btn" (click)="addingCard.set(true)">+ Agregar tarea</button>
      }
    </div>
  `,
  styles: [`
    .column {
      background: #f7fafc;
      border-radius: 8px;
      padding: 12px;
      min-width: 260px;
      max-width: 280px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }
    .column-title {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 10px;
      color: #2d3748;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cards-container {
      min-height: 60px;
      flex: 1;
    }
    .cards-container.cdk-drop-list-dragging app-card:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0,0,0.2,1);
    }
    .add-card-btn {
      background: none;
      border: none;
      color: #718096;
      font-size: 13px;
      cursor: pointer;
      padding: 6px 4px;
      text-align: left;
      width: 100%;
    }
    .add-card-btn:hover { color: #2d3748; }
    .add-card-form input {
      width: 100%;
      padding: 8px;
      border: 1px solid #cbd5e0;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
      margin-bottom: 6px;
    }
    .add-card-actions { display: flex; gap: 6px; }
    .add-card-actions button { padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; font-size: 13px; }
    .add-card-actions button:first-child { background: #3182ce; color: #fff; }
    .add-card-actions button.cancel { background: #e2e8f0; color: #4a5568; }
  `]
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
