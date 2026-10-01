import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { ChatMessageDTO } from '../../../core/models/chat.models';
import { formatEgyptTime, formatEgyptDateKey, parseServerDate } from '../../../core/utils/date-time.util';
import { firstValueFrom } from 'rxjs';

interface MessageGroup {
  dateLabel: string;
  messages: ChatMessageDTO[];
}

@Component({
  selector: 'app-student-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-chat.component.html',
  styleUrls: ['./student-chat.component.css']
})
export class StudentChatComponent implements OnInit, OnDestroy {
  public chatService = inject(ChatService);
  public authService = inject(AuthService);
  public ui = inject(UiService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') private messageInput!: ElementRef<HTMLTextAreaElement>;

  private isNearBottom = true;
  private previousMessageCount = 0;
  private timerInterval: any = null;

  // Real-time ticking signal for 30s countdown
  now = signal<number>(Date.now());

  // Edit / Delete states
  editingMessage = signal<ChatMessageDTO | null>(null);
  messageToDelete = signal<ChatMessageDTO | null>(null);
  isSavingEdit = signal<boolean>(false);
  isDeleting = signal<boolean>(false);

  constructor() {
    effect(() => {
      const msgs = this.chatService.messages();
      const count = msgs.length;
      if (count > this.previousMessageCount) {
        const lastMsg = msgs[count - 1];
        const isMine = lastMsg ? this.isMyMessage(lastMsg) : false;
        if (isMine || this.isNearBottom) {
          this.scrollToBottom(false);
        }
      }
      this.previousMessageCount = count;
    });
  }

  inputText = signal<string>('');
  isEmojiOpen = signal<boolean>(false);
  shouldScrollToBottom = true;
  showScrollButton = signal<boolean>(false);

  quickEmojis = ['🤲', '🌹', '👍', '👏', '🌟', '✨', '🤍', '😊', '📚', '✅'];

  quickReplies = [
    'السلام عليكم ورحمة الله وبركاته',
    'جزاكم الله خيراً يا شيخنا',
    'تم بحمد الله وتوفيقه',
    'عندي استفسار بخصوص الحفظ',
    'بارك الله فيكم'
  ];

  // Group messages by date
  groupedMessages = computed<MessageGroup[]>(() => {
    const msgs = this.chatService.messages();
    const groups: { [key: string]: ChatMessageDTO[] } = {};

    msgs.forEach(m => {
      const dateKey = this.formatDateKey(m.sentAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(m);
    });

    return Object.keys(groups).map(key => ({
      dateLabel: key,
      messages: groups[key]
    }));
  });

  ngOnInit() {
    this.chatService.startConnection();
    this.loadMyRoom();

    // 30s countdown timer
    this.timerInterval = setInterval(() => {
      this.now.set(Date.now());
    }, 1000);
  }

  loadMyRoom() {
    this.chatService.getMyStudentRoom().subscribe({
      next: (room) => {
        if (room && room.id) {
          this.chatService.joinRoom(room.id);
          this.chatService.loadMessages(room.id).subscribe({
            next: () => {
              this.scrollToBottom(true);
            }
          });
        }
      },
      error: (err) => {
        console.error('Failed to load student room:', err);
      }
    });
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  canEditOrDelete(msg: ChatMessageDTO): boolean {
    if (!msg || !this.isMyMessage(msg)) return false;
    if (msg.id < 0) return true; // offline pending message
    const sentTime = parseServerDate(msg.sentAt).getTime();
    if (isNaN(sentTime)) return false;
    const diffSeconds = (this.now() - sentTime) / 1000;
    return diffSeconds >= 0 && diffSeconds <= 60;
  }

  getRemainingSeconds(msg: ChatMessageDTO): number {
    if (msg.id < 0) return 60;
    const sentTime = parseServerDate(msg.sentAt).getTime();
    if (isNaN(sentTime)) return 0;
    const diffSeconds = (this.now() - sentTime) / 1000;
    const remaining = Math.ceil(60 - diffSeconds);
    return remaining > 0 ? remaining : 0;
  }

  startEdit(msg: ChatMessageDTO) {
    if (!this.canEditOrDelete(msg)) {
      this.ui.error('انتهت مهلة الـ 60 ثانية لتعديل الرسالة');
      return;
    }
    this.editingMessage.set(msg);
    this.inputText.set(msg.content);
    setTimeout(() => {
      if (this.messageInput) {
        this.messageInput.nativeElement.focus();
        this.messageInput.nativeElement.select();
      }
    }, 50);
  }

  cancelEdit() {
    this.editingMessage.set(null);
    this.inputText.set('');
  }

  async saveEdit() {
    const msg = this.editingMessage();
    if (!msg) return;

    if (!this.canEditOrDelete(msg)) {
      this.ui.error('انتهت مهلة الـ 60 ثانية لتعديل الرسالة');
      this.cancelEdit();
      return;
    }

    const newText = this.inputText().trim();
    if (!newText) return;

    this.isSavingEdit.set(true);
    try {
      await this.chatService.editMessage(msg.id, newText);
      this.ui.success('تم تعديل الرسالة بنجاح');
      this.cancelEdit();
    } catch (err: any) {
      this.ui.error(err?.error?.message || 'تعذر تعديل الرسالة، قد تكون مهلة الـ 60 ثانية قد انتهت');
    } finally {
      this.isSavingEdit.set(false);
    }
  }

  confirmDelete(msg: ChatMessageDTO) {
    if (!this.canEditOrDelete(msg)) {
      this.ui.error('انتهت مهلة الـ 60 ثانية لحذف الرسالة');
      return;
    }
    this.messageToDelete.set(msg);
  }

  cancelDelete() {
    this.messageToDelete.set(null);
  }

  async executeDelete() {
    const msg = this.messageToDelete();
    if (!msg) return;

    if (!this.canEditOrDelete(msg)) {
      this.ui.error('انتهت مهلة الـ 60 ثانية لحذف الرسالة');
      this.cancelDelete();
      return;
    }

    this.isDeleting.set(true);
    try {
      await this.chatService.deleteMessage(msg.id);
      this.ui.success('تم حذف الرسالة بنجاح');
      if (this.editingMessage()?.id === msg.id) {
        this.cancelEdit();
      }
      this.cancelDelete();
    } catch (err: any) {
      this.ui.error(err?.error?.message || 'تعذر حذف الرسالة، قد تكون مهلة الـ 60 ثانية قد انتهت');
    } finally {
      this.isDeleting.set(false);
    }
  }

  async onSendMessage() {
    const text = this.inputText().trim();
    if (!text) return;

    // If editing, save edit
    if (this.editingMessage()) {
      await this.saveEdit();
      return;
    }

    let room = this.chatService.activeRoom();
    if (!room) {
      try {
        room = await firstValueFrom(this.chatService.getMyStudentRoom());
      } catch (err) {
        console.error('Failed to load student room before sending:', err);
        return;
      }
    }

    if (!room || !room.id) return;

    this.inputText.set('');
    this.isEmojiOpen.set(false);
    this.shouldScrollToBottom = true;
    this.scrollToBottom(false);

    try {
      await this.chatService.sendStudentMessage(text);
      this.scrollToBottom(false);
    } catch (err) {
      console.error('Failed to send student message:', err);
      this.inputText.set(text);
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.editingMessage()) {
      event.preventDefault();
      this.cancelEdit();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSendMessage();
    }
  }

  async sendQuickReply(text: string) {
    this.inputText.set(text);
    await this.onSendMessage();
  }

  addEmoji(emoji: string) {
    this.inputText.update(current => current + emoji);
    if (this.messageInput) {
      this.messageInput.nativeElement.focus();
    }
  }

  toggleEmoji() {
    this.isEmojiOpen.update(v => !v);
  }

  refreshMessages() {
    const room = this.chatService.activeRoom();
    if (room) {
      this.chatService.loadMessages(room.id).subscribe(() => {
        this.scrollToBottom(true);
      });
    } else {
      this.loadMyRoom();
    }
  }

  reconnect() {
    this.chatService.startConnection().then(() => {
      this.loadMyRoom();
    });
  }

  onScroll() {
    if (!this.messagesContainer) return;
    const el = this.messagesContainer.nativeElement;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.isNearBottom = distanceFromBottom < 80;
    this.showScrollButton.set(distanceFromBottom > 150);
  }

  scrollToBottom(immediate: boolean = false) {
    setTimeout(() => {
      if (!this.messagesContainer) return;
      const el = this.messagesContainer.nativeElement;
      if (immediate) {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
      this.isNearBottom = true;
      this.showScrollButton.set(false);
    }, 40);
  }

  isMyMessage(message: ChatMessageDTO): boolean {
    return message.isStudent || (message.studentSenderId !== null && message.studentSenderId !== undefined);
  }

  formatTime(dateStr: string): string {
    return formatEgyptTime(dateStr);
  }

  private formatDateKey(dateStr: string): string {
    return formatEgyptDateKey(dateStr);
  }
}
