/**
 * ChatWindow Component Usage Example
 * 
 * This component provides a complete chat interface with:
 * - Message list with infinite scroll
 * - Real-time typing indicators
 * - Online/offline status
 * - Message delivery status (ticks)
 * - Auto-scroll to bottom
 * - Message input with send button
 */

import ChatWindow from './ChatWindow';
import { User } from '@/lib/types';

// Example usage in a page or parent component
export default function ChatExample() {
  // Example recipient user
  const recipient: User = {
    _id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    profilePicture: 'https://example.com/avatar.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const conversationId = 'conv-123';

  return (
    <div className="h-screen">
      <ChatWindow
        conversationId={conversationId}
        recipient={recipient}
        className="h-full"
      />
    </div>
  );
}

/**
 * Features:
 * 
 * 1. Header:
 *    - Displays recipient's avatar, name, and online status
 *    - Shows "Online" when recipient is connected
 *    - Shows "Last seen [time]" when offline
 * 
 * 2. Message List:
 *    - Messages displayed in chronological order (oldest to newest)
 *    - Infinite scroll - loads older messages when scrolling up
 *    - Auto-scrolls to bottom when new messages arrive
 *    - Maintains scroll position when loading older messages
 * 
 * 3. Typing Indicator:
 *    - Shows "[Name] is typing..." when recipient is typing
 *    - Appears above the message input
 *    - Automatically disappears after 3 seconds or when message is sent
 * 
 * 4. Message Input:
 *    - Auto-expanding textarea (up to 4 lines)
 *    - Press Enter to send
 *    - Press Shift+Enter for new line
 *    - Send button with loading state
 *    - Triggers typing indicator while typing
 * 
 * 5. Message Bubbles:
 *    - Sent messages: Blue background, aligned right
 *    - Received messages: Gray background, aligned left
 *    - Shows timestamp for each message
 *    - Delivery status ticks for sent messages:
 *      - Single tick: Delivered but recipient offline
 *      - Double tick: Delivered and recipient online
 *      - Blue double tick: Seen by recipient
 * 
 * 6. Error Handling:
 *    - Shows error messages when message sending fails
 *    - Displays loading states appropriately
 *    - Graceful handling of network issues
 */
