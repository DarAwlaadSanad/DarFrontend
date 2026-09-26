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
import { ChatMessageDTO } from '../../../core/models/chat.models';
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

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') private messageInput!: ElementRef<HTMLTextAreaElement>;

  private isNearBottom = true;
  private previousMessageCount = 0;

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

  ngOnDestroy() {}

  async onSendMessage() {
    const text = this.inputText().trim();
    if (!text) return;

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
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  private formatDateKey(dateStr: string): string {
    if (!dateStr) return 'غير محدد';
    const date = new Date(dateStr);
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) return 'اليوم';

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return 'أمس';

    return date.toLocaleDateString('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
