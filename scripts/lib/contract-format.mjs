// Định dạng dùng chung cho báo cáo contract và lịch sử chèn vào bundle Apidog.
export const cell = value => String(value ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export const LEVEL_ICON = { BREAKING: '🔴', NEEDS_REVIEW: '🟡', NON_BREAKING: '🟢' };

export function vietnameseText(change) {
  const quoted = [...change.text.matchAll(/`([^`]+)`/g)].map(match => match[1]);
  if (change.id === 'request-property-became-required') return `Field request \`${quoted[0]}\` chuyển từ tùy chọn sang bắt buộc.`;
  if (change.id === 'response-optional-property-added') return `Thêm field response tùy chọn \`${quoted[0]}\` ở HTTP ${quoted[1]}.`;
  if (change.id === 'api-version-not-bumped') return `Đã phát hiện breaking change nhưng info.version vẫn là \`${quoted[0]}\`.`;
  if (change.id === 'endpoint-added') return 'Thêm endpoint mới.';
  if (change.id === 'response-non-success-status-removed') return `Bỏ response lỗi HTTP ${quoted[0]}.`;
  if (change.id === 'api-security-added') return 'Endpoint bắt đầu yêu cầu xác thực (security requirement mới).';
  if (change.id === 'api-security-anonymous-access-removed') return `Endpoint không còn cho gọi ẩn danh; bắt buộc \`${quoted[0]}\`.`;
  if (change.id === 'api-security-component-added') return `Thêm security scheme \`${quoted[0]}\`.`;
  return change.text;
}

// Link ngắn tới PR (#số) hoặc commit; dùng trong bảng lịch sử.
export function sourceLink(entry) {
  const number = entry.prUrl?.match(/\/pull\/(\d+)/)?.[1];
  if (entry.prUrl) return `[${number ? `#${number}` : 'PR'}](${entry.prUrl})`;
  if (entry.commitUrl) return `[${entry.headCommit.slice(0, 7)}](${entry.commitUrl})`;
  return '—';
}
