# Báo cáo thay đổi API contract

> Báo cáo tự sinh từ nguồn YAML đã bundle. Không phản ánh việc backend đã triển khai.
> Entry fixture/file chỉ ghi commit làm bối cảnh chạy, không phải commit đã thay đổi API thật.

Báo cáo lưu lịch sử các entry đã phát hiện, mới nhất ở trên. `NO_CHANGE` không xóa entry cũ; exit code chỉ phản ánh lần chạy hiện tại.

Công cụ: Redocly 2.64.1; oasdiff 1.34.1. Số entry: **1**.

Phân loại: **BREAKING** = client cũ có thể hỏng; **NON_BREAKING** = tương thích theo contract; **NEEDS_REVIEW** = chưa đủ bằng chứng.

Các vị trí dùng JSON Pointer trên bundle tạm (`~1` là `/`). JSON đi kèm giữ toàn bộ semantic diff, fingerprint và hash phục vụ truy vết.

## Thay đổi contract từ Git — NON_BREAKING

- ID: `a87798f7f4c96626c35dea39e5c6064c8ef48aa06917bd8eb8d414c1873770c7`
- Contract: rentify-public; repository: https://github.com/pbl6-home-renter/api-doc
- Nguồn: `src/openapi.yaml` → `src/openapi.yaml`
- Phát hiện (UTC): 2026-10-23T16:50:23.683Z; commit time: 2026-10-23T23:50:06+07:00
- Commit nền: cb0c9fe47f0b403f70618ef36c790ac2697e1d61
- Commit đích/bối cảnh: [abe5f9d947c9bbe3751418e23252401fbaa9329f](https://github.com/pbl6-home-renter/api-doc/commit/abe5f9d947c9bbe3751418e23252401fbaa9329f)
- PR: chưa cung cấp; chạy local không suy đoán PR
- Loại metadata: Git revision thực tế
- Lý do: CHƯA CUNG CẤP — tác giả PR phải bổ sung lý do nghiệp vụ; không thể suy ra từ OpenAPI diff.

| Mức ảnh hưởng | Endpoint / vùng | Thay đổi | Hành động FE / Mobile |
|---|---|---|---|
| NON_BREAKING | POST /buildings/{buildingId}/approve | the `note` request property's maxLength was increased from `200` to `500` (`request-property-max-length-increased`) | FE và Mobile: kiểm tra vị trí thay đổi với DTO/parser hiện tại; chưa thấy yêu cầu sửa bắt buộc theo engine. BE xác nhận không có thay đổi hành vi ngoài OpenAPI. |

### Vị trí và giá trị trước/sau

| Path / schema / field (JSON Pointer) | Trước | Sau |
|---|---|---|
| `/components/schemas/BuildingApproveRequestDto/properties/note/maxLength` | 200 | 500 |

**Kiểm tra thủ công:** BE xác nhận lý do, endpoint dùng schema chung, thay đổi role/ownership mô tả bằng văn bản và thời điểm triển khai. FE/Mobile xác nhận tác động với parser và phiên bản client đang hỗ trợ.
