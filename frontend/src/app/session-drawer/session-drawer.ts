import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_ICONS } from '@progress/kendo-angular-icons';
import { SVGIcon, trashIcon, bookIcon, chevronLeftIcon } from '@progress/kendo-svg-icons';

import { User as AppUser } from '../@backend/models/user';
import { sidebarIcon, pencilIcon } from '../icons';

export type DrawerPageMode = 'chat' | 'study';

export interface DrawerSession {
  id: number;
  title: string;
}

@Component({
  selector: 'app-session-drawer',
  standalone: true,
  imports: [CommonModule, RouterModule, KENDO_BUTTONS, KENDO_ICONS],
  templateUrl: './session-drawer.html',
  styleUrl: './session-drawer.css',
  encapsulation: ViewEncapsulation.None,
})
export class SessionDrawer {
  @Input() public sessions: DrawerSession[] = [];
  @Input() public activeSessionId: number | null = null;
  @Input() public currentUser: AppUser | null = null;
  @Input() public mode: DrawerPageMode = 'chat';
  @Input() public allowDelete = false;
  @Input() public expanded = true;

  @Output() public toggleDrawer = new EventEmitter<void>();
  @Output() public sessionSelected = new EventEmitter<number>();
  @Output() public actionClicked = new EventEmitter<void>();
  @Output() public deleteClicked = new EventEmitter<number>();
  @Output() public logoutClicked = new EventEmitter<void>();

  public sidebarIcon: SVGIcon = sidebarIcon;
  public pencilIcon: SVGIcon = pencilIcon;
  public bookIcon: SVGIcon = bookIcon;
  public trashIcon: SVGIcon = trashIcon;
  public backIcon: SVGIcon = chevronLeftIcon;

  public onSessionClick(id: number): void {
    this.sessionSelected.emit(id);
  }
  public onActionClick(): void {
    this.actionClicked.emit();
  }
  public onDeleteClick(event: Event, id: number): void {
    event.stopPropagation();
    this.deleteClicked.emit(id);
  }
  public onLogout(): void {
    this.logoutClicked.emit();
  }
}
