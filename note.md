## Auth

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.1 #1–#6` là contract cho register, login, refresh, logout, password-reset request và password reset.
- `docs/phase-2/discovery/api-conventions.md §1, §3, §4, §5, §6, §10` là nguồn cho response wrapper, error/auth behavior, validation, naming và null fields.
- Các DTO đã triển khai trong `api-doc/src/requests/auth/` và `api-doc/src/responses/dtos/auth/` theo đúng contract từng endpoint.

Kết luận:

- Register có `RegisterRequest` và `RegisterResponse`.
- Login có `LoginRequest` và `LoginResponse`.
- Refresh chỉ có `RefreshResponse` vì không có request body.
- Password reset request có `RequestPasswordResetRequest`/`RequestPasswordResetResponse`.
- Password reset dùng `ResetPasswordRequest` nhưng success là `204 No Content`, nên không có Response DTO.
- Logout không có Request/Response DTO vì không có body và success là `204`; refresh token nằm trong cookie.

### 2. Giải thích các điểm khó hiểu

- Register response chỉ trả `id`, `role`, `status`; refresh cookie không phải JSON field.
- Login/refresh response trả access token và `expiresIn: 900`, còn refresh token được quản lý qua cookie.
- Admin không được tự đăng ký; role trong RegisterRequest chỉ gồm `tenant` và `landlord`.
- Password, refresh token và reset token là dữ liệu nhạy cảm; không được expose trong response DTO.

### 3. Lưu ý cần xác nhận với leader

- `201 Created` của register hiện ghi `Location: /api/v1/me`, là resource hiện tại thay vì URI theo id. Cần xác nhận có chủ ý dùng `/me` hay cần URI resource cụ thể trước khi freeze contract. Không thay đổi path trong task này.

## User

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.2 #7–#15` là contract cho current profile, admin user list/detail/update, lock, unlock và delete.
- `docs/phase-2/discovery/api-conventions.md §1, §2, §4, §5, §6, §10` là nguồn cho wrapper, quyền, validation, naming và null fields.
- `docs/phase-1/discovery/database-design.md §2.1 User` và `api-doc/src/schemas/user/user.yaml` là nguồn đối chiếu entity.
- DTO được đặt trong `api-doc/src/requests/users/` và `api-doc/src/responses/dtos/users/`.

Kết luận:

- `/me` có `CurrentUserResponse`; PATCH profile có `UpdateCurrentUserRequest`/`UpdateCurrentUserResponse`.
- Admin list/detail có `UserListResponse` và `UserDetailResponse`.
- Admin update có `UpdateUserRequest`/`UpdateUserResponse`.
- Lock có `LockUserRequest`/`LockUserResponse`; unlock không có Request DTO vì body không có và có `UnlockUserResponse`.
- Các endpoint GET không có Request Body DTO; delete user success `204` nên không có Response DTO.

### 2. Giải thích các điểm khó hiểu

- `/me` suy ra user từ authenticated actor, không cần `userId`; admin route mới nhận user cần quản trị.
- `role` là field bất biến; status lifecycle được xử lý bằng action lock/unlock, không đưa vào PATCH update.
- `payoutAccount` chỉ dành cho landlord; tenant/admin nhận `null`, `accountNumber` được mask khi trả về.
- User entity có password và các field nội bộ nhưng public DTO không expose password, BaseEntity nội bộ hoặc dữ liệu không được API công bố.
- Project clarification mới nhất: PATCH là partial update. Các DTO User cũ được giữ nguyên trong task này; việc cleanup required fields nếu cần xử lý riêng, không tự sửa ngược khi chỉ bổ sung note.

### 3. Lưu ý cần xác nhận với leader

- API dùng `id` trong current/detail response nhưng action lock/unlock dùng `userId`; cần xác nhận đây là khác biệt có chủ ý hay nên chuẩn hóa trước khi freeze API.
- `UpdateCurrentUserRequest` có nhánh landlord với `payoutAccount`, trong khi profile thường chỉ có name/phone; cần giữ rule gửi đủ ba field payoutAccount và chặn cập nhật khi còn invoice `pending` như contract hiện tại.

## PushDevice

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.3 #16` quy định POST `/me/push-devices` có JSON body gồm `platform` và `token`, success `201` với code `PUSH_DEVICE_REGISTERED` và data chỉ gồm `id` và `platform`.
- `docs/phase-2/discovery/api-spec.md §27.3 #17` quy định DELETE `/me/push-devices/{deviceId}` không có request body và success `204`.
- `docs/phase-2/discovery/api-conventions.md §1, §5` quy định success JSON dùng wrapper chung, còn `204 No Content` không có JSON body; request JSON phải reject field lạ.
- `docs/phase-1/discovery/database-design.md §2.23` và `api-doc/src/schemas/notification/push-device.yaml` quy định `platform` là enum `android|web` và `token` có độ dài 1–512.

Kết luận: tạo `RegisterPushDeviceRequest` và `RegisterPushDeviceResponse`. Không tạo DTO cho DELETE. Response chỉ trả `id` và `platform`, không expose toàn bộ entity PushDevice.

### 2. Giải thích các điểm khó hiểu

- Entity PushDevice có thể chứa `userId`, `token`, `lastSeenAt` và các field BaseEntity, nhưng API spec §27.3 #16 chỉ công bố `id` và `platform` trong success data. DTO phải theo API contract công khai, không copy nguyên DB/entity.
- DELETE không có Response DTO vì success là `204`; theo `api-conventions.md §1`, `204 No Content` không được có JSON wrapper/body.

### 3. Lưu ý cần xác nhận với leader

- `Location` của POST `/me/push-devices`: `api-conventions.md §1` yêu cầu `201 Created` trỏ tới resource mới, nhưng `api-spec.md §27.3 #16` hiện ghi `Location: /api/v1/me/push-devices` là URI collection. Cần xác nhận nên giữ collection URI hiện tại hay đổi thành `/api/v1/me/push-devices/{deviceId}`. Không thay đổi path trong task này.

## Media

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.4 #18–#21` là contract cho bốn endpoint Media.
- `docs/phase-2/discovery/api-conventions.md §1, §4, §5` quy định success wrapper, ngoại lệ file stream/`204 No Content`, authentication/authorization và validation request.
- `docs/phase-1/discovery/database-design.md §2.25` cùng `api-doc/src/schemas/operation/media.yaml` là nguồn cho enum `ownerType`, enum `purpose`, enum `fileType` và các field entity.
- `api-doc/src/responses/wrappers/success-single.yaml` là wrapper được reuse cho các response JSON thành công.

Kết luận:

- `POST /media/presign-upload` có `PresignMediaUploadRequest` và `PresignMediaUploadResponse`.
- `POST /media/{mediaId}/complete-upload` không có Request DTO vì body không có, nhưng có `CompleteMediaUploadResponse` vì success `200` có JSON body.
- `GET /media/{mediaId}` không có Request Body DTO và không có JSON Response DTO vì success là file stream/signed redirect.
- `DELETE /media/{mediaId}` không có Request DTO và không có Response DTO vì success là `204 No Content`.

### 2. Giải thích các điểm khó hiểu

- Presign request không chứa file bytes, base64 hoặc `multipart/form-data`. Luồng upload gồm: client xin upload ticket, backend trả signed URL và required headers, client PUT file trực tiếp lên storage, rồi gọi complete-upload để backend xác minh và chốt Media.
- `CompleteMediaUploadRequest` không tồn tại vì endpoint #19 không có body; `mediaId` nằm trong URL path.
- GET Media không có Response DTO vì success là file stream hoặc signed redirect với `Content-Type` và `Content-Disposition`, thuộc ngoại lệ không dùng JSON success wrapper.
- DTO không copy nguyên Media entity. Entity có thể chứa `userId`, `sizeBytes` và BaseEntity fields, nhưng mỗi success contract chỉ expose các field được công bố.

### 3. Lưu ý cần xác nhận với leader

- Media design yêu cầu `purpose` hợp lệ theo từng `ownerType`, nhưng hiện mới có enum tổng và chưa có bảng mapping cross-field đầy đủ. DTO giữ enum tổng, không tự phát minh `oneOf` mapping. Cần xác nhận: team đã có bảng mapping chính thức chưa, hay validation `ownerType`–`purpose` sẽ được chốt ở service/backend sau?
- Convention yêu cầu endpoint upload khai báo giới hạn kích thước file, nhưng contract hiện chỉ có `size: 248120` và chưa có max cụ thể. DTO không đặt `maximum`; cần xác nhận giới hạn file cho image và PDF trước khi freeze spec.

## Building

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.5 #22–#31 và #108` là contract cho các list/detail, create, update, approve, reject và delete Building.
- `docs/phase-2/discovery/api-conventions.md §1, §2, §5, §6, §10, §12` quy định response wrapper, authentication/authorization, validation, naming, null fields và các quy ước liên quan.
- `docs/phase-1/discovery/database-design.md §2.4 Building` và `api-doc/src/schemas/property/building.yaml` là nguồn constraint của field Building.
- `api-doc/src/responses/wrappers/success-single.yaml` và `api-doc/src/responses/wrappers/success-list.yaml` là wrapper dùng lại cho response JSON.

Kết luận: các GET list/detail không có Request Body DTO nhưng có Response DTO; POST create có cả Request và Response DTO; PATCH update có cả Request và Response DTO; approve/reject có cả Request và Response DTO; DELETE không có DTO vì không có body và trả `204 No Content`.

`UpdateBuildingRequest` được thiết kế là partial update theo xác nhận của người dùng: `name` và `address` đều optional, nhưng request phải có ít nhất một field (`minProperties: 1`).

### 2. Giải thích các điểm khó hiểu

- Create Building không nhận `latitude`/`longitude`; backend geocode từ `address`, nên request chỉ có `name`, `province`, `ward`, `address`.
- Public DTO không copy nguyên Building entity. Các field như `landlordId`, tọa độ, review fields và BaseEntity fields chỉ xuất hiện khi endpoint contract công bố.
- Entity/database dùng tên `note`, nhưng landlord/admin detail và reject response dùng `reviewNote` theo public API contract; DTO giữ `reviewNote`.
- DELETE không có Response DTO vì success là `204 No Content`, không có JSON wrapper.

### 3. Lưu ý cần xác nhận với leader

- API spec của CreateBuildingResponse ghi `latitude`/`longitude` là JSON string, trong khi Building entity schema dùng number. DTO hiện ưu tiên endpoint contract và dùng string. Cần xác nhận source-of-truth trước khi freeze API.
- PATCH success example có `status: approved`, nhưng endpoint cũng có lỗi `409 APPROVED BUILDING LOCKED`. DTO hiện dùng enum đầy đủ, không khóa status thành approved. Cần xác nhận Building approved bị khóa PATCH hoàn toàn hay chỉ khóa một số field.
- Approve request hiện được triển khai với `note` required vì body contract công bố field này và convention yêu cầu field đã khai báo phải xuất hiện. Tuy nhiên lỗi `NOTE REQUIRED` chỉ được nêu cho reject, còn database `note` nullable. Cần xác nhận approve có bắt buộc note hay không.

## Room

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.6 #33–#38 và #109` là contract cho room list/detail, create, update, mark-ready và delete.
- `docs/phase-2/discovery/api-conventions.md §1, §2, §5, §6, §10` quy định response wrapper, authentication/authorization, validation, naming và null fields.
- `docs/phase-1/discovery/database-design.md §2.5 Room` và `api-doc/src/schemas/property/room.yaml` là nguồn đối chiếu field/constraint của Room.
- `api-doc/src/responses/wrappers/success-single.yaml` và `api-doc/src/responses/wrappers/success-list.yaml` là wrapper dùng lại cho response JSON.

Kết luận: tạo `CreateRoomRequest`, `UpdateRoomRequest`, `PublicRoomListResponse`, `MyRoomListResponse`, `CreateRoomResponse`, `RoomDetailResponse`, `UpdateRoomResponse` và `MarkRoomReadyResponse`. Không tạo Request DTO cho GET, mark-ready hoặc DELETE; không tạo Response DTO cho DELETE vì success là `204 No Content`.

Project clarification mới nhất: PATCH là partial update, không cần gửi tất cả editable fields. Clarification này override cách hiểu cũ tại `api-conventions.md §10`; không sửa các DTO domain cũ trong task Room.

### 2. Giải thích các điểm khó hiểu

- `UpdateRoomRequest` dùng partial update: field bị omit thì không cập nhật, `minProperties: 1` ngăn body `{}` rỗng, còn `additionalProperties: false` từ chối field ngoài contract.
- `area` dùng JSON string như `"18.5"` để giữ chính xác số đo thập phân theo API contract/convention, dù entity schema hiện dùng number.
- `rentPrice` dùng JSON integer vì là tiền VND, không dùng float/double hoặc chuỗi tiền.
- Public room list không trả `status` vì contract public chỉ trả các phòng đang available.
- Mark-ready không có Request DTO vì `roomId` nằm trên path và endpoint không có JSON body.

### 3. Lưu ý cần xác nhận với leader

- Room status có conflict: API spec dùng `cleaning` cho MyRoomList và mark-ready, trong khi database/entity schema chỉ có `available|occupied|maintenance`. DTO biến thiên hiện dùng `type: string` và không khóa enum; cần xác nhận lifecycle chính thức và có bổ sung `cleaning` vào domain hay đổi API spec không.
- `area` là string trong API contract nhưng number trong entity schema. DTO hiện ưu tiên API contract; cần xác nhận có đồng bộ entity schema hay giữ khác biệt có chủ ý.
- `rentPrice` là integer trong API contract/convention nhưng number trong entity schema. DTO hiện dùng integer; cần xác nhận có đồng bộ domain schema hay không.
- PATCH hiện chỉ công bố `name`, `rentPrice`, `area`; DTO không tự mở rộng thêm `description`, `floorNumber`, `amenities`, `maxOccupancy` hoặc `genderPolicy`. Cần xác nhận đây là tập editable đầy đủ hay chỉ là phần contract hiện tại.

## FavoriteRoom

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.7 #39–#41` là contract cho list, favorite và unfavorite Room.
- `docs/phase-2/discovery/api-conventions.md §1, §2, §4, §5, §10` quy định response wrapper, authentication/authorization, validation và null fields.
- `api-doc/src/schemas/property/favorite-room.yaml` là nguồn cho quan hệ `tenantId`–`roomId`; `api-doc/src/schemas/property/room.yaml` là nguồn constraint cho tên phòng và đối chiếu field Room.
- `api-doc/src/responses/wrappers/success-single.yaml` và `api-doc/src/responses/wrappers/success-list.yaml` là wrapper dùng lại.

Kết luận:

- GET `/me/favorite-rooms` không có Request Body DTO và có `FavoriteRoomListResponse`.
- POST `/me/favorite-rooms` có `FavoriteRoomRequest` và `FavoriteRoomResponse`.
- DELETE `/me/favorite-rooms/{roomId}` không có Request Body DTO và không có Response DTO vì success là `204 No Content`.

### 2. Giải thích các điểm khó hiểu

- Request chỉ có `roomId`, không có `tenantId`, vì tenant hiện tại được suy ra từ authenticated actor của route `/me`.
- List response có `name` và `rentPrice` dù FavoriteRoom entity chỉ có `tenantId` và `roomId`; đây là projection/join từ Room phục vụ màn hình danh sách.
- List dùng field `name`, còn create response dùng `roomName`, vì API contract hiện tại công bố hai tên khác nhau. DTO giữ nguyên từng endpoint contract.
- DELETE dùng `roomId` trên path và trả `204 No Content`, nên không tạo JSON request/response DTO.

### 3. Lưu ý cần xác nhận với leader

- API contract hiện không đồng nhất tên field: GET list dùng `data[].name`, còn POST success dùng `data.roomName`. DTO hiện giữ nguyên contract hiện tại; cần xác nhận team muốn giữ khác biệt hay chuẩn hóa thành một field name trước khi freeze API.

## RoommateProfile

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.8 #42–#45` là contract cho feed, detail, profile của chính mình và save profile.
- `docs/phase-2/discovery/api-conventions.md §1, §2, §4, §5, §10` quy định response wrapper, authentication/authorization, validation và null fields.
- `api-doc/src/schemas/user/roommate-profile.yaml` là nguồn đối chiếu field của RoommateProfile.
- `api-doc/src/responses/wrappers/success-single.yaml` và `api-doc/src/responses/wrappers/success-list.yaml` là wrapper dùng lại.

Kết luận:

- GET `/roommate-profiles` không có Request Body DTO và có `RoommateProfileListResponse`.
- GET `/roommate-profiles/{roommateProfileId}` không có Request Body DTO và có `RoommateProfileDetailResponse`.
- GET `/me/roommate-profile` không có Request Body DTO và có `MyRoommateProfileResponse`.
- PUT `/me/roommate-profile` có `SaveRoommateProfileRequest` và `SaveRoommateProfileResponse`.

Các DTO được đặt trong `src/requests/users/` và `src/responses/dtos/users/` vì RoommateProfile thuộc nhóm User và leader đã thiết lập convention này.

### 2. Giải thích các điểm khó hiểu

- PUT khác PATCH: project clarification về partial update chỉ áp dụng cho PATCH. PUT này được model như representation đầy đủ của các field API công bố; các field nullable vẫn required nhưng có thể nhận `null`.
- Request không có `tenantId` vì endpoint `/me` suy ra tenant từ authenticated user.
- `lifestyle` và `personality` chỉ là object nullable linh hoạt; DTO không tự khóa các nested key chưa có contract.
- `idVerified` có trong entity nhưng không được API #42–#45 công bố nên không đưa vào request/response.

### 3. Lưu ý cần xác nhận với leader

- API convention/spec dùng integer cho `budgetMin`/`budgetMax` vì đây là tiền VND, còn entity schema dùng `number`. DTO hiện dùng integer; cần xác nhận có đồng bộ entity schema hay giữ khác biệt có chủ ý.
- `bio` hiện là string nullable nhưng chưa có min/max validation trong entity schema. DTO không tự đặt giới hạn; cần leader/BE xác nhận nếu muốn freeze giới hạn độ dài.

## MatchRequest

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.9 #46–#49, #110` là contract cho list, create và các action accept/reject/withdraw.
- `api-doc/src/schemas/matching/match-request.yaml` là nguồn đối chiếu field/status của entity.
- `api-doc/src/responses/wrappers/success-single.yaml` và `api-doc/src/responses/wrappers/success-list.yaml` là wrapper dùng lại.

Kết luận: tạo `CreateMatchRequest`, `MatchRequestListResponse`, `CreateMatchRequestResponse`, `AcceptMatchRequestResponse`, `RejectMatchRequestResponse` và `WithdrawMatchRequestResponse`. Accept/reject/withdraw không có Request DTO vì body không có.

### 2. Giải thích các điểm khó hiểu

- `requesterId` không nằm trong create request vì backend lấy từ authenticated tenant.
- `conversationId` chỉ xuất hiện khi accept thành công.
- Entity có `aiScore`/`aiAdvice` nhưng các response contract hiện tại không công bố nên không expose.

### 3. Lưu ý cần xác nhận với leader

- `Location` của POST `/match-requests` hiện là `/api/v1/match-requests`, tức collection URL. Cần xác nhận có đổi thành `/api/v1/match-requests/{matchRequestId}` để phù hợp quy ước `201 Created` hay giữ contract hiện tại. Không thay đổi path trong batch.

## RatePolicy

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.10 #50–#53` là contract cho list, create, update và deactivate.
- `docs/phase-1/discovery/database-design.md §2.9 RatePolicy` và `api-doc/src/schemas/billing/rate-policy.yaml` là nguồn đối chiếu domain.

Kết luận: tạo `CreateRatePolicyRequest`, `UpdateRatePolicyRequest`, `RatePolicyListResponse`, `CreateRatePolicyResponse`, `UpdateRatePolicyResponse` và `DeactivateRatePolicyResponse`. `UpdateRatePolicyRequest` là partial PATCH với `minProperties: 1`; deactivate không có Request DTO vì body không có.

### 2. Giải thích các điểm khó hiểu

- DTO ưu tiên flat API shape của endpoint (`type`, `name`, `rateKind`, `steps`) và không copy nguyên entity có cấu trúc `rates[]`.
- Price trong DTO dùng integer theo money convention, dù entity/schema hiện dùng number.
- Scope `building` vẫn được giữ trong enum, nhưng không tự thêm `buildingId` khi API body hiện chỉ công bố `roomId`.

### 3. Lưu ý cần xác nhận với leader

- Cần thống nhất model RatePolicy: một policy chứa `rates[]` như entity/schema hay một policy tương ứng một rate item như api-spec.
- Cần xác nhận `POST /rate-policies` có hỗ trợ scope `building`; nếu có, request cần `buildingId` và rule exactly-one giữa `buildingId`/`roomId`.
- Entity dùng number cho `price`, còn DTO dùng integer; cần xác nhận có đồng bộ entity schema hay giữ khác biệt.

## BillingSetting

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.11 #54–#56` là contract cho list, create và update.
- `docs/phase-1/discovery/database-design.md §2.10 BillingSetting` và `api-doc/src/schemas/billing/billing-setting.yaml` là nguồn đối chiếu domain.

Kết luận: tạo `CreateBillingSettingRequest`, `UpdateBillingSettingRequest`, `BillingSettingListResponse`, `CreateBillingSettingResponse` và `UpdateBillingSettingResponse`. Hai request create/update dùng field names của API contract; update là partial PATCH với `minProperties: 1`.

### 2. Giải thích các điểm khó hiểu

- `remindDays: null` được giữ để biểu diễn không nhắc nếu business rule cho phép.
- DTO dùng `dueDays`/`remindDays` đúng theo API contract, không tự đổi sang tên entity/database.
- Scope `building` được giữ trong enum nhưng không tự thêm `buildingId` khi contract hiện chỉ công bố `roomId`.

### 3. Lưu ý cần xác nhận với leader

- Cần xác nhận tên public field: `dueDays`/`remindDays` hay `paymentDueDay`/`remindDay` như entity/database; đổi tên là breaking change.
- Cần xác nhận BillingSetting có thực sự hỗ trợ scope `building`; nếu có, cần `buildingId` và rule giữa `buildingId`/`roomId`.
- `dueDays` có giá trị 1–28 nhưng semantic database là ngày trong tháng; cần xác nhận có nên đổi tên public field cho rõ nghĩa trước khi freeze.

## ContractTemplate

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.12 #57–#58` là contract cho list và detail template.
- `api-doc/src/responses/wrappers/success-list.yaml` cùng quy ước success wrapper/offset pagination là pattern dùng lại.

Đây là seed/template API nên chỉ tạo hai Response DTO: `ContractTemplateListResponse` và `ContractTemplateDetailResponse`. GET không có Request Body DTO; không có entity ContractTemplate riêng cần copy.

### 2. Giải thích các điểm khó hiểu

- Template là dữ liệu seed, nên DTO bám trực tiếp các field được api-spec công bố: `templateKey`, `title`, `version`, `requiredVariables`.

### 3. Lưu ý cần xác nhận với leader

- Không có conflict cần xác nhận tại thời điểm này.

## Contract

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.13 #59–#67` là contract cho list, create, detail, update và các lifecycle action.
- `docs/phase-1/discovery/database-design.md §2.7 Contract` và `api-doc/src/schemas/contract/contract.yaml` là nguồn đối chiếu entity.

Đã tạo 6 Request DTO và 9 Response DTO. Lifecycle actions như apply-template, generate-draft-document, activate và complete-checkout có DTO riêng; không gộp vào PATCH.

### 2. Giải thích các điểm khó hiểu

- Rule tenant identity là cross-field (`tenantId` hoặc `tenantName` + `tenantPhone`), được mô tả để backend validate với `422 TENANT IDENTITY INVALID`, không tự encode oneOf phức tạp.
- Money fields dùng integer trong DTO theo API convention, dù entity dùng number.
- `signedContractMediaId` và `activatedAt` là field/action result do api-spec công bố; DTO giữ chúng dù entity schema hiện chưa có field tương ứng.

### 3. Lưu ý cần xác nhận với leader

- `signedContractMediaId`: cần xác nhận đây là derived lookup từ Media hay Contract cần lưu/reference chính thức.
- `activatedAt`: cần xác nhận đây là timestamp chỉ trả ở action response hay field persist của Contract.
- Cần xác nhận có đồng bộ entity money fields từ number sang integer hay giữ khác biệt giữa entity và public DTO.

## ContractMember

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.14 #68–#71` là contract cho add, update, leave-contract và list.
- `docs/phase-1/discovery/database-design.md §2.8 ContractMember` và `api-doc/src/schemas/contract/contract-member.yaml` là nguồn đối chiếu entity.

Đã tạo 3 Request DTO và 4 Response DTO. Không tạo file-stream DTO cho `format=csv`; task này chỉ thiết kế JSON list response.

### 2. Giải thích các điểm khó hiểu

- Không dùng DELETE cho member vì leave-contract phải giữ lịch sử thành viên.
- Request dùng `leftOn`, còn response/entity dùng `leftAt`; DTO giữ đúng tên theo từng contract.
- Tenant identity là cross-field business rule tương tự Contract và được backend kiểm tra.

### 3. Lưu ý cần xác nhận với leader

- Cần xác nhận `leftOn`/`leftAt` là khác biệt có chủ ý giữa command input và stored/output hay cần chuẩn hóa trước khi freeze API.

## MeterReading

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.15 #72–#74` là contract cho list, OCR preview và create reading.
- `docs/phase-1/discovery/database-design.md §2.11 MeterReading` và `api-doc/src/schemas/billing/meter-reading.yaml` là nguồn đối chiếu entity.
- API convention về số đo thập phân được biểu diễn bằng JSON string được áp dụng cho `previousReading`/`currentReading`.

Đã tạo 2 Request DTO và 3 Response DTO. OCR preview không tạo record chính thức; `evidenceMediaId` bắt buộc khi create theo contract. Tenant không đọc raw meter-reading list theo quyền endpoint.

### 2. Giải thích các điểm khó hiểu

- Reading dùng string trong DTO để tránh mất chính xác, dù entity schema hiện dùng number.
- Cross-field rule `currentReading >= previousReading` để backend xử lý, không cố encode trong string schema.

### 3. Lưu ý cần xác nhận với leader

- Cần xác nhận có đồng bộ `previousReading`/`currentReading` trong entity schema từ number sang string cho API representation hay giữ khác biệt có chủ ý.

## Invoice

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.16 #75–#82` là contract cho list, create, detail, update, issue, cancel và reminder.
- `docs/phase-1/discovery/database-design.md §2.12 Invoice` và `api-doc/src/schemas/billing/invoice.yaml` là nguồn đối chiếu entity.
- Money trong DTO dùng integer theo API convention; PDF export là file stream và không tạo JSON DTO.

Đã tạo 5 Request DTO và 8 Response DTO. `invoiceStatus` được giữ đúng tên API, không đổi thành entity field `status`.

### 2. Giải thích các điểm khó hiểu

- `paidAmount`/`remainingAmount` là derived payment summary, không phải field Invoice entity.
- `otherFees[].amount` là khoản tiền duy nhất được phép âm; các money field khác dùng integer không âm.
- Bulk issue/reminder có `succeeded`/`queued` và `failed` để biểu diễn partial success; lỗi từng item không biến thành error DTO toàn request.
- `Idempotency-Key` là header concern, không đưa vào Request Body DTO.

### 3. Lưu ý cần xác nhận với leader

- Issue response example đang có `invoiceStatus: pending` đồng thời có `issuedAt`; cần xác nhận trạng thái đúng là `issued` hay `pending`. DTO hiện không khóa một giá trị duy nhất.
- `INVOICE_NOT_OVERDUE` mâu thuẫn với rule D39 không có trạng thái overdue; cần xác nhận code theo semantics reminder eligibility.
- Entity dùng number cho money còn DTO dùng integer; cần xác nhận có đồng bộ entity schema hay giữ khác biệt.

## Payment

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.17 #83–#87` là contract cho list, payment intent, cash payment và webhook.
- `docs/phase-1/discovery/database-design.md §2.13 Payment` và `api-doc/src/schemas/billing/payment.yaml` là nguồn đối chiếu entity.
- API convention về VND integer, idempotency và webhook exception được áp dụng.

Đã tạo 3 Request DTO và 4 Response DTO. Không tạo `PaymentWebhookResponse` vì provider acknowledgement không dùng JSON success wrapper.

### 2. Giải thích các điểm khó hiểu

- `paymentStatus` là tên public API, khác entity field `status`.
- `paymentState` là derived UI/business state từ payment totals, không phải persisted Payment status.
- Idempotency header không thuộc body DTO; webhook request là system/provider input, không phải user action.

### 3. Lưu ý cần xác nhận với leader

- Cần xác nhận create-intent cho phép toàn bộ method enum hay chỉ subset MVP như `mock`/`vietqr`.
- Cần xác nhận webhook là một generic schema cho mọi provider hay mỗi `{provider}` cần schema riêng. DTO hiện dùng generic shape theo contract hiện tại.
- Entity dùng number cho money còn DTO dùng integer; cần xác nhận có đồng bộ entity schema hay không.

## Notification

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.21 #100–#102` là contract cho list, mark-read và mark-all-read.
- `docs/phase-1/discovery/database-design.md §2.21 Notification` và `api-doc/src/schemas/notification/notification.yaml` là nguồn đối chiếu entity.

Đã tạo 3 Response DTO. Không tạo Request DTO cho mark-read/mark-all-read vì các endpoint không có body. Notification list dùng cursor pagination.

### 2. Giải thích các điểm khó hiểu

- `data` là deep-link payload linh hoạt, không khóa nested shape.
- Entity có `userId`/`sentAt` nhưng list contract không expose nên DTO không thêm.

### 3. Lưu ý cần xác nhận với leader

- Không có conflict mới cần xác nhận tại thời điểm này.

## NotificationPreference

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.22 #103–#104` là contract cho GET/PUT preferences.
- `docs/phase-1/discovery/database-design.md §2.22 NotificationPreference` và `api-doc/src/schemas/notification/notification-preference.yaml` là nguồn đối chiếu entity.

Đã tạo `UpdateNotificationPreferenceRequest`, `NotificationPreferenceResponse` và `UpdateNotificationPreferenceResponse`. GET không pagination vì tối đa 5 records; userId suy ra từ `/me`.

### 2. Giải thích các điểm khó hiểu

- PUT là save/replace preferences theo contract; request không tự ép đủ cả 5 loại khi source chưa chốt.

### 3. Lưu ý cần xác nhận với leader

- PUT mô tả thay toàn bộ tùy biến nhưng example chỉ gửi subset `invoice`/`chat`. Cần xác nhận client phải gửi đủ 5 loại hay backend merge/default các loại còn lại.

## AuditLog

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.23 #105–#106` và `api-doc/src/schemas/operation/audit-log.yaml` là nguồn cho list/detail.

Đã tạo 2 Response DTO. AuditLog append-only nên không có Request DTO; export theo `format` là file stream, không tạo DTO riêng.

### 2. Giải thích các điểm khó hiểu

- `beforeData`/`afterData` là snapshot object linh hoạt, không khóa nested schema.
- List và detail expose subset khác nhau theo API contract.

### 3. Lưu ý cần xác nhận với leader

- Entity có `actorId`/`createdAt`, nhưng detail contract không công bố. Cần xác nhận việc thiếu hai field này là chủ ý hay payload detail chưa đầy đủ.

## Dashboard

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.24 #107` và convention về tiền VND integer là nguồn cho Dashboard.

Đã tạo `DashboardResponse`; GET không có Request DTO.

### 2. Giải thích các điểm khó hiểu

- Dashboard là aggregate DTO, không map 1:1 entity.
- `occupancyRate` giữ string theo API contract; `systemTransactionVolume` dùng integer VND.

### 3. Lưu ý cần xác nhận với leader

- Không có conflict mới cần xác nhận tại thời điểm này.

## IssueReport

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.18 #88–#93` là contract cho issue list, create, detail, update và cancel.
- `docs/phase-1/discovery/database-design.md §2.14 IssueReport` và `api-doc/src/schemas/operation/issue-report.yaml` là nguồn đối chiếu entity.

Đã tạo 2 Request DTO và 6 Response DTO. Cancel không có Request DTO vì body không có.

### 2. Giải thích các điểm khó hiểu

- `issuePhotoMediaIds` là projection từ Media, không phải column trực tiếp của IssueReport.
- Không có DELETE vì cần giữ lịch sử xử lý.
- `reporterId` có thể null khi landlord tạo thay tenant passive.

### 3. Lưu ý cần xác nhận với leader

- API cancel trả status `cancel`, còn entity/database dùng `cancelled`; cần chốt status chuẩn.
- Prose có nhắc `closed`, nhưng enum chính thức không có state này; cần xác nhận đó chỉ là wording hay lifecycle state bị thiếu.

## Conversation

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.19 #94–#96` là contract cho list, detail và resolve conversation.
- `docs/phase-1/discovery/database-design.md §2.15 Conversation` và `api-doc/src/schemas/chat/conversation.yaml` là nguồn đối chiếu entity.

Đã tạo 1 Request DTO và 3 Response DTO. Resolve request dùng `oneOf` vì contract yêu cầu exactly one giữa `contractId` và `buildingId`.

### 2. Giải thích các điểm khó hiểu

- `unreadCount` là derived API field, không copy từ Conversation entity.
- Conversation hỗ trợ room/building/direct, nhưng resolve endpoint hiện chỉ nhận contract hoặc building context.
- Response resolve chỉ giữ shape được công bố; không tự invent đầy đủ building variant.

### 3. Lưu ý cần xác nhận với leader

- Khi resolve bằng `buildingId`, cần xác nhận response có trả `buildingId` không và có cần oneOf room/building response hay không.
- Entity có `buildingId` nhưng detail response chưa công bố; cần xác nhận có bổ sung không.

## Message

### 1. Cơ sở Request / Response

- `docs/phase-2/discovery/api-spec.md §27.20 #97–#99` là contract cho list, send message và mark-read.
- `docs/phase-1/discovery/database-design.md §2.17 Message` và `api-doc/src/schemas/chat/message.yaml` là nguồn đối chiếu entity.

Đã tạo 2 Request DTO và 3 Response DTO. Message list dùng cursor pagination; không dùng offset structure.

### 2. Giải thích các điểm khó hiểu

- `senderId` nullable vì bot message có thể không có sender user.
- Media attachment được tham chiếu bằng `mediaId` trong request; không tự nhúng Media object.
- Mark-read dùng `lastReadMessageId` làm read cursor.

### 3. Lưu ý cần xác nhận với leader

- Cần xác nhận client có được gửi `type: bot` hay bot chỉ do system tạo.
- Cần chốt validation matrix giữa `type`, `content` và `mediaId` (text cần content, image/file cần mediaId hay không).
- `Location` của MESSAGE_SENT hiện là collection URL; cần xác nhận có đổi sang `/api/v1/messages/{messageId}` hay giữ contract hiện tại.

## Refactor toàn bộ DTO cho Apidog

### 1. Cơ sở thực hiện

- Refactor theo contract hiện có trong `src/requests/**`, `src/responses/dtos/**`, `src/openapi.yaml`, các schema domain và tài liệu discovery hiện tại.
- Không thay đổi endpoint, business code, enum, nullable/required semantics hoặc `paths: {}`.

### 2. Các điểm đã chuẩn hóa

- Concrete Response DTO được flatten thành một root object trực tiếp; success wrapper vẫn được giữ trong `src/responses/wrappers/` và `components.responses` vì vẫn là artifact dùng chung.
- `UserUpdateCurrentRequestDto` được chuẩn hóa thành `UserCurrentUpdateRequestDto` với một object duy nhất gồm `name`, `phone`, `payoutAccount`; `payoutAccount` vẫn nullable theo contract.
- `UserUpdateCurrentResponseDto` được chuẩn hóa thành `UserCurrentUpdateResponseDto`.
- Bổ sung required root cho response envelope, description cho root/property/nested property và format phù hợp cho UUID, email, date, date-time.

### 3. Composition còn giữ có chủ đích

- `ResolveConversationRequest` vẫn giữ `oneOf` vì contract yêu cầu đúng một trong `contractId` hoặc `buildingId`; đây là business invariant, không phải duplicate branch.
- Không còn `allOf` success-wrapper trong concrete Response DTO.
- Không reuse full entity schema cho public DTO vì có nguy cơ kéo theo field internal/nhạy cảm và composition khó đọc trong Apidog; các DTO tiếp tục khai báo trực tiếp.

### 4. Câu hỏi cần xác nhận với leader

- Các cảnh báo lint về license, localhost server và các `components.responses` chưa được sử dụng có cần xử lý trong một task riêng không. Không tự sửa trong task refactor DTO vì không thuộc public DTO contract.
