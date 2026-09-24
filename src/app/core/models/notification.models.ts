export interface NotificationDTO {
  id: number;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
  sessionId?: number;
  groupId?: number;
}

export interface NotificationListResponseDTO {
  unreadCount: number;
  notifications: NotificationDTO[];
}
