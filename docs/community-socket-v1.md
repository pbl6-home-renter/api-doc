# Community Socket v1

Contract realtime cho chat Web và Android. REST trong OpenAPI vẫn là nguồn dữ liệu chính: client gửi tin qua `POST /api/v1/messages`, đánh dấu đã đọc qua `POST /api/v1/messages/mark-read`, và tải lịch sử qua `GET /api/v1/messages`.

## Kết nối

- Socket.IO v4, chỉ dùng transport `websocket`.
- Gateway path: `/api/v1/community/socket.io`; namespace mặc định `/`.
- Gửi access token trong Socket.IO `auth: { token: "<JWT>" }`; không đưa token vào query string.
- Community tự kiểm tra chữ ký, hạn dùng và trạng thái tài khoản. Kết nối sai token hoặc hết hạn bị ngắt. Sau khi xác thực, server phát `session:ready` với `{ "userId": "uuid" }`.
- Khi token được refresh, client kết nối lại bằng token mới rồi join lại các conversation đang mở.

```ts
const socket = io(gatewayOrigin, {
  path: '/api/v1/community/socket.io',
  transports: ['websocket'],
  auth: { token: accessToken },
});
socket.on('session:ready', () => {
  socket.emit('conversation:join', { conversationId }, (result) => {
    // result: { ok: true, code: 'JOINED', conversationId }
  });
});
```

## Client → server

| Event | Payload | Acknowledgement | Quy tắc |
|---|---|---|---|
| `conversation:join` | `{ conversationId: uuid }` | `{ ok: true, code: "JOINED", conversationId }` hoặc `{ ok: false, code: "UNAUTHORIZED" \| "INVALID_CONVERSATION_ID" \| "FORBIDDEN" }` | Chỉ member `active` được vào room. Member `read_only` đọc lịch sử qua REST trong giới hạn đã chốt. |
| `conversation:leave` | `{ conversationId: uuid }` | `{ ok: true, code: "LEFT", conversationId }` hoặc lỗi như trên | Chỉ rời room Socket, không thay đổi membership trong DB. |

## Server → client

| Event | Payload | Người nhận |
|---|---|---|
| `message:created` | `{ id, conversationId, senderUserId, senderName, senderType, sequence, clientMessageId, type, content, mediaId, payload, createdAt }` | Mọi session đã join conversation; `senderUserId=null` và `senderType=system` cho system message. Shape tương ứng với message REST. |
| `conversation:read-updated` | `{ conversationId, unreadCount, lastReadSequence }` | Mọi session của user vừa mark-read. |
| `conversation:access-revoked` | `{ conversationId }` | Mọi session của user vừa leave/bị kick; server cũng loại các session khỏi room. |
| `conversation:available` | `{ conversationId }` | Mọi session của user khi conversation được tạo/mở lại hoặc khi được thêm/kích hoạt lại; client có thể gọi REST rồi join. |
| `chat:message-received` | `{ messageId, conversationId, sequence, senderUserId, senderName, conversationName, type, contentPreview, createdAt }` | User room của mọi member **user** đang `active` trong conversation, **kể cả người gửi** (để tab khác của người gửi cập nhật list). Chỉ cho message `text`, `image`, `bot`; không phát cho `system`. Chi tiết ở mục [Tin mới trên user room](#tin-mới-trên-user-room). |
| `notification:created` | `{ notificationId, type, title, body, deepLink, data, createdAt }` | Mọi session của user nhận notification. |
| `notification:read-state-updated` | `{ notificationId, readAt, all }` | Mọi session của user vừa mark-read; `all=true` và `notificationId=null` khi mark-all-read. |

`message:created` được phát sau khi lưu thành công. Retry `POST /messages` cùng `clientMessageId` trả message cũ và không phát lại event. System message của thay đổi nhóm cũng phát qua Socket nhưng không gửi FCM. Chat message của user được gửi FCM (category `chat`) cho các member khác, không tạo notification inbox.

`notification:created` được phát sau khi notification đã lưu vào inbox. Socket và FCM là best-effort: nếu mất, client vẫn thấy notification qua `GET /notifications`.

## Tin mới trên user room

Mọi giá trị sequence/cursor trong REST và Socket (`sequence`, `lastReadSequence`, `leftSequence`) là chuỗi thập phân, ví dụ `"42"`. Không dùng JSON number cho bigint để tránh mất chính xác ở JavaScript.

`chat:message-received` giúp FE cập nhật badge, toast và danh sách hội thoại ở **mọi trang** mà không phải join mọi conversation. Server tự đưa mỗi session vào user room sau `session:ready`; client không cần join.

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `messageId` | uuid | Bằng `id` của message REST và `message:created`; khóa khử trùng. |
| `conversationId` | uuid | |
| `sequence` | string | Bigint dạng chuỗi, giống `sequence` của message REST. |
| `senderUserId` | uuid \| null | `null` khi `type=bot`. |
| `senderName` | string | Snapshot tên người gửi trên message. |
| `conversationName` | string \| null | Tên theo **người nhận** event: direct là `displayName` snapshot của người còn lại với người nhận; group là `title` đã lưu. Cùng giá trị với `displayName` trong `GET /conversations` của người nhận. |
| `type` | `text` \| `image` \| `bot` | Không bao giờ là `system`. |
| `contentPreview` | string | Tối đa 120 ký tự (cắt 117 + `...`, như `lastMessage.contentPreview`); `image` là `Đã gửi ảnh`; content rỗng thành `""`. |
| `createdAt` | date-time | |

Quy tắc:

- Phát **sau khi** transaction lưu message commit, cùng thời điểm `message:created`. Retry `POST /messages` cùng `clientMessageId` trả message cũ và **không** phát lại.
- Người nhận: member `participantType=user`, `status=active`, chưa xóa. Member `read_only`/đã rời không nhận. Event **không chứa unread count**; FE tự tăng unread tại chỗ và lấy lại tổng qua `GET /conversations/unread-summary` khi mở app, reconnect hoặc nhận `conversation:read-updated`.
- `senderUserId` trùng user hiện tại: FE chỉ cập nhật list (đưa conversation lên đầu, cập nhật last message), **không** tăng unread, **không** toast.
- Tin đầu tiên của direct: cả hai người nhận event. Nếu `conversationId` chưa có trong cache list, FE refetch `GET /conversations` thay vì tự dựng hàng. `conversation:available` của direct chưa có message không làm hiện chat trống (REST list vẫn ẩn).
- Chống trùng với `message:created`: một message có thể đến qua cả conversation room lẫn user room. FE khử trùng theo `messageId`. Nếu user đang mở đúng conversation đó và tab đang hiển thị, `chat:message-received` **không** tạo toast; việc hiển thị và mark-read do màn chat quyết định. Mỗi `messageId` tạo tối đa một toast.
- Best-effort như các event khác: không replay; REST là nguồn phục hồi.

## Mất kết nối và đồng bộ

Socket là kênh tín hiệu, không bảo đảm client nhận đủ mọi event. Sau `connect` hoặc `reconnect`, client tải các message còn thiếu bằng REST cursor; `sequence` xác định thứ tự trong một conversation. Nếu nhận lại một message sau REST sync, client khử trùng bằng `id`. Trạng thái unread lấy từ REST conversation list/detail và `GET /conversations/unread-summary`, đồng bộ qua `conversation:read-updated` khi có mark-read. `unreadCount` trong `conversation:read-updated` dùng cùng quy tắc unread với REST: chỉ đếm `text`/`image`/`bot` của người khác, không đếm `system`, read-only chỉ tới `leftSequence`.

Lát cắt đầu chạy một Community instance. Khi chạy nhiều instance cần Socket.IO adapter dùng chung (ví dụ Redis) để room, revoke và fan-out hoạt động xuyên instance.
