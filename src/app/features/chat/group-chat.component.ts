import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { StudentService } from '../../core/services/student.service';
import { ChatMessageDTO, ChatRoomDTO } from '../../core/models/chat.models';
import { StudentDetailsDTO } from '../../core/models/student.models';
import { firstValueFrom } from 'rxjs';

interface MessageGroup {
  dateLabel: string;
  messages: ChatMessageDTO[];
}

@Component({
  selector: 'app-group-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-chat.component.html',
  styleUrls: ['./group-chat.component.css']
})
export class GroupChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  public chatService = inject(ChatService);
  public authService = inject(AuthService);
  public studentService = inject(StudentService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') private messageInput!: ElementRef<HTMLTextAreaElement>;

  // Tab State: 'group' (staff group chat) or 'students' (student conversations)
  activeTab = signal<'group' | 'students'>('group');

  // Input & UI Signals
  inputText = signal<string>('');
  searchQuery = signal<string>('');
  studentSearchQuery = signal<string>('');
  isSearchOpen = signal<boolean>(false);
  isEmojiOpen = signal<boolean>(false);
  shouldScrollToBottom = true;
  showScrollButton = signal<boolean>(false);

  // New Student Conversation Modal
  isNewStudentModalOpen = signal<boolean>(false);
  newStudentSearch = signal<string>('');
  searchedStudents = signal<StudentDetailsDTO[]>([]);
  isSearchingStudents = signal<boolean>(false);

  // Popular quick emojis
  quickEmojis = ['🤲', '🌹', '👍', '👏', '🌟', '✨', '🤍', '😊', '📚', '🎯', '💡', '✅'];

  // Quick reply chips
  quickReplies = [
    'السلام عليكم ورحمة الله وبركاته',
    'وعليكم السلام ورحمة الله وبركاته',
    'جزاكم الله خيراً وبوركتم',
    'تم بحمد الله وتوفيقه',
    'في انتظاركم بإذن الله',
    'وفقكم الله وسدد خطاكم'
  ];

  // Permission to view/reply to student chats
  canViewStudentChats = computed(() => {
    return (
      this.authService.hasRole('Admin') ||
      this.authService.hasRole('SuperAdmin') ||
      this.authService.hasPermission('Permissions.Chat.ViewStudentChats')
    );
  });

  // Filtered messages based on search
  filteredMessages = computed(() => {
    const list = this.chatService.messages();
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return list;
    return list.filter(m =>
      m.content.toLowerCase().includes(query) ||
      m.senderName.toLowerCase().includes(query)
    );
  });

  // Filtered student rooms
  filteredStudentRooms = computed(() => {
    const list = this.chatService.studentRooms();
    const query = this.studentSearchQuery().trim().toLowerCase();
    if (!query) return list;
    return list.filter(r =>
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.studentName && r.studentName.toLowerCase().includes(query))
    );
  });

  // Total unread count across all student chats
  totalStudentUnread = computed(() => {
    return this.chatService.studentRooms().reduce((sum, r) => sum + (r.unreadCount || 0), 0);
  });

  // Group messages by date
  groupedMessages = computed<MessageGroup[]>(() => {
    const msgs = this.filteredMessages();
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
    // 1. Start SignalR real-time connection
    this.chatService.startConnection();

    // 2. Load the staff room by default
    this.loadStaffRoom();

    // 3. Preload student rooms if user has permission
    if (this.canViewStudentChats()) {
      this.chatService.getStudentRooms().subscribe();
    }
  }

  loadStaffRoom() {
    this.chatService.getStaffRoom().subscribe({
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
        console.error('Failed to load staff chat room:', err);
      }
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom(false);
    }
  }

  ngOnDestroy() {}

  // ─── Tab Switching ────────────────────────────────────────────────────────

  switchTab(tab: 'group' | 'students') {
    this.activeTab.set(tab);
    this.searchQuery.set('');
    this.isSearchOpen.set(false);

    if (tab === 'group') {
      this.loadStaffRoom();
    } else {
      this.chatService.getStudentRooms().subscribe({
        next: (rooms) => {
          if (rooms && rooms.length > 0) {
            // Select first student room if current active is not a student support room
            const current = this.chatService.activeRoom();
            if (!current || current.type !== 'StudentSupport') {
              this.selectStudentRoom(rooms[0]);
            }
          }
        }
      });
    }
  }

  selectStudentRoom(room: ChatRoomDTO) {
    this.chatService.activeRoom.set(room);
    this.chatService.joinRoom(room.id);
    this.chatService.loadMessages(room.id).subscribe({
      next: () => {
        this.scrollToBottom(true);
      }
    });

    // Mark as read
    if (room.unreadCount > 0) {
      this.chatService.markAsRead(room.id).subscribe({
        next: () => {
          this.chatService.studentRooms.update(list =>
            list.map(r => r.id === room.id ? { ...r, unreadCount: 0 } : r)
          );
        }
      });
    }
  }

  // ─── New Student Conversation Modal ───────────────────────────────────────

  openNewStudentModal() {
    this.isNewStudentModalOpen.set(true);
    this.newStudentSearch.set('');
    this.searchedStudents.set([]);
    this.searchStudents('');
  }

  closeNewStudentModal() {
    this.isNewStudentModalOpen.set(false);
  }

  searchStudents(query: string) {
    this.isSearchingStudents.set(true);
    this.studentService.getStudents(1, 20, undefined, undefined, query || undefined).subscribe({
      next: (res) => {
        this.searchedStudents.set(res.items);
        this.isSearchingStudents.set(false);
      },
      error: () => {
        this.isSearchingStudents.set(false);
      }
    });
  }

  startChatWithStudent(student: StudentDetailsDTO) {
    this.closeNewStudentModal();
    this.chatService.getStudentRoom(student.id).subscribe({
      next: (room) => {
        this.selectStudentRoom(room);
        // Refresh student rooms list so the new room is included
        this.chatService.getStudentRooms().subscribe();
      },
      error: (err) => {
        console.error('Failed to create student room:', err);
      }
    });
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  async onSendMessage() {
    const text = this.inputText().trim();
    if (!text) return;

    let room = this.chatService.activeRoom();
    if (!room) {
      if (this.activeTab() === 'group') {
        try {
          room = await firstValueFrom(this.chatService.getStaffRoom());
        } catch (err) {
          console.error('Failed to load chat room before sending:', err);
          return;
        }
      } else {
        return;
      }
    }

    if (!room || !room.id) return;

    this.inputText.set('');
    this.isEmojiOpen.set(false);
    this.shouldScrollToBottom = true;

    try {
      await this.chatService.sendMessage(room.id, text);
      this.scrollToBottom(true);
      // Refresh student rooms to update last message preview
      if (this.activeTab() === 'students') {
        this.chatService.getStudentRooms().subscribe();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
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

  toggleSearch() {
    this.isSearchOpen.update(v => !v);
    if (!this.isSearchOpen()) {
      this.searchQuery.set('');
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
      if (this.activeTab() === 'group') {
        this.loadStaffRoom();
      } else {
        this.chatService.getStudentRooms().subscribe();
      }
    }
  }

  reconnect() {
    this.chatService.startConnection().then(() => {
      const room = this.chatService.activeRoom();
      if (room && room.id) {
        this.chatService.joinRoom(room.id);
        this.chatService.loadMessages(room.id).subscribe(() => {
          this.scrollToBottom(true);
        });
      } else {
        this.loadStaffRoom();
      }
    });
  }

  // ─── Scroll Handling ──────────────────────────────────────────────────────

  onScroll() {
    if (!this.messagesContainer) return;
    const el = this.messagesContainer.nativeElement;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    this.shouldScrollToBottom = atBottom;
    this.showScrollButton.set(!atBottom);
  }

  scrollToBottom(immediate: boolean = false) {
    if (!this.messagesContainer) return;
    try {
      const el = this.messagesContainer.nativeElement;
      if (immediate) {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
      this.shouldScrollToBottom = false;
      this.showScrollButton.set(false);
    } catch {}
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  isMyMessage(message: ChatMessageDTO): boolean {
    const myId = this.authService.userId();
    if (myId && message.senderId && message.senderId === myId) {
      return true;
    }
    const current = this.authService.currentUser();
    if (current?.fullName && message.senderName === current.fullName) {
      return true;
    }
    if (current?.userName && message.senderName === current.userName) {
      return true;
    }
    // For staff talking in a student room, any non-student message is from staff
    if (this.activeTab() === 'students' && !message.isStudent && !message.studentSenderId) {
      return true;
    }
    return false;
  }

  getInitials(name: string): string {
    if (!name) return 'م';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return parts[0][0] + ' ' + parts[1][0];
    }
    return parts[0].slice(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = [
      'from-emerald-500 to-teal-600 text-white',
      'from-blue-500 to-cyan-600 text-white',
      'from-purple-500 to-indigo-600 text-white',
      'from-amber-500 to-orange-600 text-white',
      'from-rose-500 to-pink-600 text-white',
      'from-teal-500 to-emerald-700 text-white'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
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
