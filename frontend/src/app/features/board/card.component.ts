import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CdkDrag, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { Card } from '../../core/services/board.service';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CdkDrag, CdkDragPlaceholder],
  template: `
    <div class="card" cdkDrag>
      <div class="card-drag-placeholder" *cdkDragPlaceholder></div>
      <span class="card-title">{{ card.title }}</span>
      <button class="card-delete" (click)="cardDeleted.emit(card.id)" title="Eliminar">✕</button>
    </div>
  `,
  styles: [`
    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: grab;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      transition: box-shadow 0.15s;
    }
    .card:active { cursor: grabbing; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
    .card-title { font-size: 14px; flex: 1; }
    .card-delete {
      background: none;
      border: none;
      cursor: pointer;
      color: #a0aec0;
      padding: 0 0 0 8px;
      font-size: 12px;
      line-height: 1;
    }
    .card-delete:hover { color: #e53e3e; }
    .card-drag-placeholder {
      background: #e2e8f0;
      border: 2px dashed #cbd5e0;
      border-radius: 6px;
      height: 44px;
      margin-bottom: 8px;
    }
    .cdk-drag-preview {
      box-shadow: 0 8px 24px rgba(0,0,0,0.18);
      border-radius: 6px;
    }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0,0,0.2,1); }
  `]
})
export class CardComponent {
  @Input({ required: true }) card!: Card;
  @Output() cardDeleted = new EventEmitter<string>();
}
