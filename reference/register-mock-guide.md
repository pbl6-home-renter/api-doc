# Thử mock Register trong Apidog

`npm run bundle` cập nhật `rentify.json` và `register-cases.postman.json` từ mô tả Register.
Chỉ API Register có bộ case riêng trong lần chỉnh này.

## Body mẫu trong đặc tả

Đồng bộ `reference/rentify.json` như bình thường. Mở Register → Run → dropdown
Auto-generate / Examples, chọn body có tên mã lỗi cần thử. Ví dụ `phoneRequired`
gửi đầy đủ email, password, name, role và **bỏ phone**. Không gửi `{}` để thử riêng
PHONE_REQUIRED vì `{}` thiếu nhiều trường và thứ tự validation quyết định mã trả về.

Header request bình thường là `Content-Type: application/json`, `Accept: application/json`.
Register public, không cần Authorization hoặc cookie; không có query/path params.

## Case có đủ request và response

Trong Apidog, vào Settings → Import Data → Postman và chọn
`reference/register-cases.postman.json`. Bật tùy chọn nhập saved examples thành
**API Cases** (không chỉ response examples). Xem preview để ghép vào endpoint
`POST /auth/register` hiện có. Mỗi case giữ header, raw body, điều kiện và response
riêng; case `invalidJson` giữ JSON sai cú pháp, case `missingBody` không gửi body.

Mở case dưới Register → Run, chọn Local Mock hoặc môi trường backend.
Nếu dùng `baseUrl`, đặt thành `http://localhost:3000/api/v1` cho backend hoặc base URL
Local Mock lấy từ Apidog cho mock. Không gắn `/api/v1` thêm vào base URL mock.

Nút Request trên một mock response có thể mở Quick Request với body `{}` như ảnh.
URL chứa `apidogResponseId` chọn response cố định; request sai vẫn có thể nhận đúng
response được chọn. Các ví dụ OpenAPI không tự ghép body vào Quick Request này.
Để body/header được lưu sẵn, dùng API Cases đã import. Muốn mock tự chọn lỗi theo
body cần cấu hình Mock Expectations hoặc Mock Script trong Apidog; các file này
cung cấp request/response mẫu, không cài logic validation lên mock server.

## Điều kiện các case

| Case | Điều kiện |
| --- | --- |
| 201 tenant / landlord | Email và phone chưa tồn tại. Response có Location và cookie refreshToken minh họa. |
| DUPLICATE_EMAIL | Tạo trước lan@example.com; phone 0901234569 phải chưa tồn tại. |
| DUPLICATE_PHONE | Tạo trước phone 0901234567; new-phone-test@example.com phải chưa tồn tại. |
| Các lỗi trường 422 | Body chỉ thiếu/sai trường đang thử; các trường khác giữ hợp lệ. |
| INVALID_JSON | Raw body thiếu dấu đóng ngoặc; giữ Content-Type application/json. |
| INVALID_REQUEST_BODY | Body là array hoặc không gửi body. |
| INVALID_HEADER | Mock có kiểm soát: contract chưa xác định header/quy tắc cụ thể, nên không tạo header lỗi giả định. |
| BAD_REQUEST / VALIDATION_FAILED | Mock có kiểm soát: contract chưa xác định trigger cụ thể cho mã dự phòng. |
| 429 | Vượt rate limit hoặc chọn mock 429; body vẫn hợp lệ. |
| 500 | Chọn mock 500 hoặc fault injection có kiểm soát phía server. |

Cookie mẫu không phải token thật. Gửi lại case thành công tới backend có thể trả 409
do dữ liệu đã được tạo; thay email/phone khi muốn tạo tài khoản mới.

Tài liệu Apidog: [Multiple Request Body Examples](https://docs.apidog.com/en/configure-multiple-request-body-examples-865454m0),
[Import from Postman](https://docs.apidog.com/en/import-from-postman-635043m0),
[Mock API Data](https://docs.apidog.com/mock-api-data-in-apidog-617869m0).
