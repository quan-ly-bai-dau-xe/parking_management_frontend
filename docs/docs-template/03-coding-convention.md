# 02 - Architecture

## 1. Sơ đồ tổng quan

    Client -> API Gateway -> Service A -> Database
                          -> Service B -> Queue -> Worker

## 2. Thành phần

| Thành phần | Trách nhiệm | Công nghệ |
|---|---|---|
| API Gateway | Routing, auth | ... |
| Service A | ... | ... |
| Database | ... | ... |

## 3. Luồng dữ liệu

### Luồng {{TÊN_LUỒNG}}

1. ...
2. ...
3. ...

## 4. Tech stack & lý do

| Thành phần | Chọn | Lý do |
|---|---|---|
| Backend | ... | ... |
| DB | ... | ... |

## 5. Database

- Sơ đồ ERD: ...
- Bảng chính: ...
- Index: ...
- Migration strategy: ...

## 6. API Design

- Style: REST / GraphQL / gRPC
- Versioning: /api/v1
- Auth: JWT / OAuth2 / API Key
- Error format:

      {
        "code": "ERROR_CODE",
        "message": "Mô tả lỗi",
        "details": {}
      }

## 7. Bảo mật

- Authentication: ...
- Authorization: ...
- Secrets: ...
- Input validation: ...
- Rate limit: ...

## 8. Deployment

- Môi trường: ...
- CI/CD: ...
- Rollback: ...
- Backup: ...

## 9. Observability

- Logging: ...
- Metrics: ...
- Tracing: ...
- Alerting: ...

## 10. Testing

- Unit test: ...
- Integration test: ...
- E2E test: ...
- Coverage target: ...

## 11. ADR - Architecture Decision Records

- ADR-001: ...
- ADR-002: ...

## 12. Cấu trúc thư mục

    src/
      modules/
      common/
      config/
      tests/