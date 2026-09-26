export interface ChatMessageDTO {
  id: number;
  roomId: number;
  senderName: string;
  senderId?: string;
  studentSenderId?: number;
  isStudent: boolean;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface ChatRoomDTO {
  id: number;
  name: string;
  type: string; // 'Staff' | 'StudentSupport'
  studentId?: number;
  studentName?: string;
  lastMessage?: ChatMessageDTO;
  unreadCount: number;
}

export interface SendMessageDTO {
  content: string;
}
