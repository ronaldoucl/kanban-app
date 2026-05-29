import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CdkDrag, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { Card } from '../../core/services/board.service';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CdkDrag, CdkDragPlaceholder],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss'
})
export class CardComponent {
  @Input({ required: true }) card!: Card;
  @Output() cardDeleted = new EventEmitter<string>();
}
