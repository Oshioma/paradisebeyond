export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  senderRole: "guest" | "host" | "admin";
  senderName: string;
  body: string;
  createdAt: string;
}
